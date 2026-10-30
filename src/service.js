// -----------------------------------------------------------------------------
// The integration at runtime: the sources read, the sites offered in the
// Discover tab, the states of the sites added to Gladys, and the scene
// triggers.
//
// Two paces:
// - the sources are read once a day (one request each; the hours change a
//   few times a year), an hour later after a failure. Only the sources
//   needed: the areas ticked, the ones of the sites added, and all four when
//   the nearest sites around the house are wanted;
// - every minute, open or closed is computed from the hours kept, without
//   any request: states, triggers, widget.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { hhmm, weekdayOf } from './clock.js';
import { DEFAULT_CONFIG, normalizeConfig } from './config.js';
import { SITE_TYPE, buildSiteDevice, clip, siteStates } from './devices.js';
import { statusAt } from './hours.js';
import { REPORTS, SHORT_WEEKDAYS, TEXT, WEEKDAYS, lines, render, say } from './messages.js';
import { SOURCES, distanceKm, readSource, sourceOf } from './sources.js';

const logger = createLogger({ name: 'decheteries' });

// Unchanged states (a site closed all weekend) are sent again this often, or
// the dashboard shows "no recent value" after 48 hours.
export const HEARTBEAT_MS = 6 * 3600 * 1000;
export const TICK_MS = 60 * 1000;
export const READ_MS = 24 * 3600 * 1000;
// A failed read is tried again sooner.
export const RETRY_MS = 3600 * 1000;
// Two evaluations further apart than this (the host slept, Gladys was down)
// fire no trigger: the change is no longer news.
export const MAX_GAP_MS = 5 * 60 * 1000;
// The widget turns orange in the last half-hour.
export const CLOSING_SOON_MINUTES = 30;

export const TRIGGERS = {
  OPENED: 'opened',
  CLOSED: 'closed',
  CLOSING_SOON: 'closing_soon',
};
export const WIDGET_KEY = 'sites';

const LOCALES = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };

/** The source of a site key (`bordeaux-12` → `bordeaux`). */
const sourceIdOf = (key) => SOURCES.find((source) => key.startsWith(`${source.id}-`))?.id ?? null;

export class RecyclingCentres {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK's fake)
   * @param {typeof fetch} [options.fetch]
   * @param {() => number} [options.now]
   * @param {boolean} [options.timers] false in the tests: they call refresh() and tick()
   */
  constructor({ gladys, fetch = globalThis.fetch, now = Date.now, timers = true }) {
    this.gladys = gladys;
    this.fetch = fetch;
    this.now = now;
    this.useTimers = timers;
    this.config = normalizeConfig(DEFAULT_CONFIG);
    this.sites = new Map(); // site key → site
    this.areas = new Map(); // source id → { okAt, error, keys }
    this.house = null; // { lat, lon } of the first located house
    this.houseError = false;
    this.views = new Map(); // device external id → last evaluation
    this.okAt = null;
    this.failing = false;
    this.discoveredSignature = null;
    this.publishFailed = false;
    this.discoveryFailed = false;
    this.fireFailed = false;
    this.refreshTimer = null;
    this.tickTimer = null;
    this.stopped = false;
    this.refreshing = null;
    this.loading = Promise.resolve();
  }

  // --- lifecycle --------------------------------------------------------------

  async start(config) {
    this.config = config;
    logger.info(
      `Started: ${config.areas.length} area(s), ${config.nearestCount} nearest site(s), ${this.watched().length} site(s) added`,
    );
    this.scheduleTicks();
    // The first reading in the background: the widget and the scene action
    // wait for it.
    this.loading = this.refresh({ discover: true });
  }

  /** Gladys restarted: everything again, the states included. */
  async resync(config) {
    this.config = config;
    this.gladys.forgetPublishedStates?.();
    await this.refresh({ discover: true });
  }

  async reconfigure(config) {
    const languageChanged = config.language !== this.config.language;
    this.config = config;
    if (languageChanged) {
      // The texts follow the language.
      this.gladys.forgetPublishedStates?.();
    }
    await this.refresh({ discover: true });
  }

  async stop() {
    this.stopped = true;
    clearTimeout(this.refreshTimer);
    clearTimeout(this.tickTimer);
    await this.refreshing;
  }

  /** The next read: a day later, or an hour after a failure. */
  scheduleRefresh() {
    if (!this.useTimers || this.stopped) {
      return;
    }
    clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => this.refresh(), this.failing ? RETRY_MS : READ_MS);
    this.refreshTimer.unref?.();
  }

  /** The clock: one evaluation a few seconds after every minute. */
  scheduleTicks() {
    if (!this.useTimers || this.stopped) {
      return;
    }
    const delay = TICK_MS - (this.now() % TICK_MS) + 2000;
    this.tickTimer = setTimeout(async () => {
      try {
        await this.tick();
      } catch (err) {
        // Never let one bad evaluation stop the clock.
        logger.warn(`Evaluation failed: ${err.message}`);
      } finally {
        this.scheduleTicks();
      }
    }, delay);
    this.tickTimer.unref?.();
  }

  // --- devices ----------------------------------------------------------------

  /** The site key of a device created in Gladys, from its params or its external id. */
  siteKeyOf(device) {
    const param = device?.params?.find?.((p) => p.name === 'site')?.value;
    if (param) {
      return String(param);
    }
    const id = String(device?.external_id ?? '');
    const marker = `:${SITE_TYPE}:`;
    return id.includes(marker) ? id.slice(id.lastIndexOf(marker) + marker.length) : null;
  }

  /** The sites added to Gladys: `{ deviceId, key, name }[]`, in the order of Gladys. */
  watched() {
    return (this.gladys.devices ?? [])
      .map((device) => ({
        deviceId: device.external_id,
        key: this.siteKeyOf(device),
        name: device.name,
      }))
      .filter((entry) => entry.key && sourceIdOf(entry.key));
  }

  /** The site of a device: `{ watched, site }`, site null when not read yet. */
  lookup(deviceId) {
    const watched = this.watched().find((w) => w.deviceId === deviceId);
    if (!watched) {
      return null;
    }
    return { watched, site: this.sites.get(watched.key) ?? null };
  }

  /** Waits for the first reading (at most `ms`), for a widget or a scene action asked at start. */
  async firstReading(ms = 10000) {
    let timer;
    await Promise.race([
      this.loading,
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms);
      }),
    ]);
    clearTimeout(timer);
  }

  refreshWidget() {
    this.gladys.requestWidgetRefresh?.(WIDGET_KEY)?.catch?.(() => {});
  }

  /** A device was just added in Gladys: its states, all of them, now. */
  async onDeviceCreated(device) {
    const found = this.lookup(device?.external_id);
    if (found?.site) {
      const view = this.view(found.site);
      this.views.set(found.watched.deviceId, view);
      await this.publish(siteStates(this.gladys, found.site, view, this.config.language));
    } else if (found) {
      // Its source not read yet: read it now.
      await this.refresh();
    }
    this.refreshWidget();
  }

  /** The sites offered in the Discover tab: the areas ticked, then the nearest ones. */
  offered() {
    const offered = new Map();
    const usable = (site) => site.schedule !== null;
    for (const area of this.config.areas) {
      for (const key of this.areas.get(area)?.keys ?? []) {
        const site = this.sites.get(key);
        if (site && usable(site)) {
          offered.set(key, site);
        }
      }
    }
    if (this.house && this.config.nearestCount > 0) {
      const near = [...this.sites.values()]
        .filter((site) => usable(site) && site.lat !== null && site.lon !== null)
        .map((site) => ({ site, km: distanceKm(this.house, site) }))
        .filter(({ km }) => km <= this.config.maxDistanceKm)
        .sort((a, b) => a.km - b.km)
        .slice(0, this.config.nearestCount);
      for (const { site } of near) {
        offered.set(site.key, site);
      }
    }
    return [...offered.values()];
  }

  async publishDiscovered({ force = false } = {}) {
    const devices = this.offered().map((site) =>
      buildSiteDevice(this.gladys, site, this.config.language),
    );
    const signature = JSON.stringify(devices.map((d) => [d.external_id, d.name, d.features]));
    if (!force && signature === this.discoveredSignature) {
      return;
    }
    try {
      await this.gladys.publishDiscoveredDevices(devices);
      this.discoveredSignature = signature;
      if (this.discoveryFailed) {
        this.discoveryFailed = false;
        logger.info('Discovered sites published again');
      }
    } catch (err) {
      if (!this.discoveryFailed) {
        logger.warn(`Cannot publish the discovered sites: ${err.message}`);
      }
      this.discoveryFailed = true;
    }
  }

  async publish(states) {
    if (states.length === 0) {
      return;
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: HEARTBEAT_MS });
      if (this.publishFailed) {
        this.publishFailed = false;
        logger.info('States published again');
      }
    } catch (err) {
      // Gladys restarting: said once, the next tick sends them again.
      if (!this.publishFailed) {
        logger.warn(`Cannot publish ${states.length} state(s): ${err.message}`);
      }
      this.publishFailed = true;
    }
  }

  // --- reading the sources -------------------------------------------------------

  /** One read; concurrent calls share it. */
  refresh({ discover = false } = {}) {
    if (!this.refreshing) {
      this.refreshing = this.readAll(discover)
        .catch((err) => logger.warn(`Refresh failed: ${err.message}`))
        .finally(() => {
          this.refreshing = null;
          this.scheduleRefresh();
        });
      return this.refreshing;
    }
    // A discovery asked during a read (areas just changed) reads again right
    // after it: the running one may not include them.
    return discover ? this.refreshing.then(() => this.refresh({ discover })) : this.refreshing;
  }

  /** The house location, when the nearest sites are wanted. */
  async readHouse() {
    if (this.config.nearestCount === 0) {
      return;
    }
    try {
      const houses = await this.gladys.getHouses();
      const located = (houses ?? []).find(
        (h) => Number.isFinite(h?.latitude) && Number.isFinite(h?.longitude),
      );
      this.house = located ? { lat: located.latitude, lon: located.longitude } : null;
      this.houseError = false;
    } catch (err) {
      if (!this.houseError) {
        logger.warn(`Cannot read the location of the house: ${err.message}`);
      }
      this.houseError = true;
    }
  }

  /** The sources to read: areas ticked, sites added, all of them around a located house. */
  neededSources() {
    const wanted = new Set(this.config.areas);
    for (const { key } of this.watched()) {
      wanted.add(sourceIdOf(key));
    }
    if (this.house && this.config.nearestCount > 0) {
      SOURCES.forEach((source) => wanted.add(source.id));
    }
    return SOURCES.filter((source) => wanted.has(source.id));
  }

  async readAll(forceDiscovery) {
    await this.readHouse();
    const failures = [];
    for (const source of this.neededSources()) {
      const area = this.areas.get(source.id) ?? { okAt: null, error: null, keys: [] };
      this.areas.set(source.id, area);
      try {
        const sites = await readSource(this.fetch, source);
        for (const key of area.keys) {
          this.sites.delete(key);
        }
        for (const site of sites) {
          this.sites.set(site.key, site);
        }
        area.keys = sites.map((site) => site.key);
        area.okAt = this.now();
        if (area.error) {
          logger.info(`${source.name} back`);
        }
        area.error = null;
        logger.debug(`${source.name}: ${sites.length} site(s) read`);
      } catch (err) {
        // Kept: the sites of the last good read.
        if (!area.error) {
          logger.warn(`${source.name} unavailable: ${err.message}`);
        }
        area.error = err.message;
        failures.push(source.id);
      }
    }
    this.failing = failures.length > 0;
    if (!this.failing) {
      this.okAt = this.now();
    }
    await this.publishDiscovered({ force: forceDiscovery });
    await this.tick();
  }

  // --- the clock ----------------------------------------------------------------

  /** "tomorrow at 08:30" for a `next` of statusAt, in a language. */
  whenText(next, language) {
    const time = hhmm(next.minutes);
    if (next.days === 0) {
      return say(TEXT, language, 'today', { time });
    }
    if (next.days === 1) {
      return say(TEXT, language, 'tomorrow', { time });
    }
    if (next.days < 7) {
      return say(TEXT, language, 'weekday', {
        day: WEEKDAYS[language][weekdayOf(next.date)],
        time,
      });
    }
    const date = new Date(`${next.date}T00:00:00Z`).toLocaleDateString(LOCALES[language], {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
    return say(TEXT, language, 'date', { date, time });
  }

  /** "lun. 08:30", the widget form of a `next` (the time alone today). */
  shortWhen(next, language) {
    const time = hhmm(next.minutes);
    if (next.days === 0) {
      return time;
    }
    if (next.days < 7) {
      return `${SHORT_WEEKDAYS[language][weekdayOf(next.date)]} ${time}`;
    }
    const date = new Date(`${next.date}T00:00:00Z`).toLocaleDateString(LOCALES[language], {
      day: 'numeric',
      month: 'numeric',
      timeZone: 'UTC',
    });
    return `${date} ${time}`;
  }

  /** What a site is at the current minute, with its texts. */
  view(site, language = this.config.language) {
    const status = statusAt(site.schedule, this.now(), site);
    const { today } = status;
    let hours;
    if (!status.known) {
      hours = say(TEXT, language, 'noHours');
    } else if (today.holidayClosed) {
      hours = say(TEXT, language, today.assumed ? 'holidayAssumed' : 'holidayClosed');
    } else if (today.slots.length === 0) {
      hours = say(TEXT, language, 'closedToday');
    } else {
      hours = today.slots.map(({ from, to }) => `${hhmm(from)}–${hhmm(to)}`).join(', ');
      if (today.holiday) {
        hours += ` (${say(TEXT, language, today.assumed ? 'holidayOpen' : 'holiday')})`;
      }
    }
    let closes;
    if (!status.known) {
      closes = say(TEXT, language, 'unknown');
    } else {
      closes = status.open ? hhmm(status.closing.minutes) : say(TEXT, language, 'closedNow');
    }
    let next;
    if (!status.known) {
      next = say(TEXT, language, 'unknown');
    } else {
      next = status.next ? this.whenText(status.next, language) : say(TEXT, language, 'noNext');
    }
    return {
      ...status,
      // Triggers only compare two evaluations of the same hours.
      signature: site.signature,
      at: this.now(),
      hours,
      closes,
      next,
      nextStatus: status.next,
    };
  }

  /** One evaluation of every site added: states, then triggers. */
  async tick() {
    const states = [];
    const events = [];
    const alive = new Set();
    const language = this.config.language;
    for (const watched of this.watched()) {
      const site = this.sites.get(watched.key);
      if (!site) {
        continue;
      }
      alive.add(watched.deviceId);
      const view = this.view(site, language);
      states.push(...siteStates(this.gladys, site, view, language));
      events.push(...this.events(watched, this.views.get(watched.deviceId), view));
      this.views.set(watched.deviceId, view);
    }
    for (const deviceId of [...this.views.keys()]) {
      if (!alive.has(deviceId)) {
        this.views.delete(deviceId);
      }
    }
    await this.publish(states);
    for (const { key, data } of events) {
      await this.fire(key, data);
    }
    if (events.length > 0) {
      this.refreshWidget();
    }
  }

  /** The trigger events of a site between two evaluations. */
  events(watched, before, after) {
    if (
      !before ||
      !before.known ||
      !after.known ||
      before.signature !== after.signature ||
      after.at - before.at > MAX_GAP_MS
    ) {
      return [];
    }
    const language = this.config.language;
    const data = {
      site: watched.deviceId,
      site_name: watched.name ?? '',
      closes_at: after.closing ? hhmm(after.closing.minutes) : '',
      minutes_left: after.minutesLeft ?? 0,
      next_opening: after.nextStatus ? this.whenText(after.nextStatus, language) : '',
    };
    const events = [];
    if (!before.open && after.open) {
      events.push({ key: TRIGGERS.OPENED, data });
    }
    if (before.open && !after.open) {
      events.push({ key: TRIGGERS.CLOSED, data });
    }
    const notice = this.config.closingNotice;
    if (
      after.open &&
      after.minutesLeft <= notice &&
      // Crossing the notice, or opening for less than it (a short slot).
      (!before.open ||
        before.minutesLeft > notice ||
        before.closing?.minutes !== after.closing.minutes)
    ) {
      events.push({ key: TRIGGERS.CLOSING_SOON, data });
    }
    return events;
  }

  async fire(key, data) {
    try {
      await this.gladys.publishSceneEvent(key, data);
      if (this.fireFailed) {
        this.fireFailed = false;
        logger.info('Scene triggers fired again');
      }
    } catch (err) {
      if (!this.fireFailed) {
        logger.warn(`Cannot fire the ${key} trigger: ${err.message}`);
      }
      this.fireFailed = true;
    }
  }

  // --- texts ------------------------------------------------------------------

  /** "ouvert jusqu'à 12:00", "fermé · ouvre lun. 08:30"… for a widget row (40 characters). */
  shortText(site, language, { hours = true } = {}) {
    if (!site) {
      return '—';
    }
    const view = this.view(site, language);
    if (!view.known) {
      return clip(say(TEXT, language, 'noHours'), 40);
    }
    if (view.open) {
      if (view.minutesLeft <= CLOSING_SOON_MINUTES) {
        return say(TEXT, language, 'closesIn', { minutes: view.minutesLeft });
      }
      return hours
        ? say(TEXT, language, 'openUntil', { time: hhmm(view.closing.minutes) })
        : say(TEXT, language, 'open');
    }
    if (!hours || !view.nextStatus) {
      return say(TEXT, language, 'closed');
    }
    const short = this.shortWhen(view.nextStatus, language);
    return say(TEXT, language, view.today.holidayClosed ? 'holidayRow' : 'opensAt', { short });
  }

  /** "Déchèterie de Blagnac : ouvert jusqu'à 18:00." */
  sentence(site, name, language) {
    const view = this.view(site, language);
    if (!view.known) {
      return say(TEXT, language, 'sentenceUnknown', { name });
    }
    if (view.open) {
      return say(TEXT, language, 'sentenceOpen', { name, time: hhmm(view.closing.minutes) });
    }
    if (!view.nextStatus) {
      return say(TEXT, language, 'sentenceNoNext', { name });
    }
    const when = this.whenText(view.nextStatus, language);
    let key = 'sentenceClosed';
    if (view.today.holidayClosed) {
      key = view.today.assumed ? 'sentenceHolidayAssumed' : 'sentenceHoliday';
    }
    return say(TEXT, language, key, { name, when });
  }

  // --- configuration action -----------------------------------------------------

  status() {
    const blocks = [];
    const nearest = this.config.nearestCount > 0;
    if (nearest && this.house) {
      blocks.push(
        render(REPORTS, 'house', {
          count: this.config.nearestCount,
          km: this.config.maxDistanceKm,
        }),
      );
    } else if (nearest) {
      blocks.push(render(REPORTS, 'noHouse'));
    }
    if (this.config.areas.length === 0 && !(nearest && this.house)) {
      blocks.push(render(REPORTS, 'noArea'));
    }
    for (const [id, area] of this.areas) {
      const name = sourceOf(id).name;
      if (area.error) {
        blocks.push(render(REPORTS, 'areaError', { name, error: area.error }));
      } else {
        const count = area.keys.filter((key) => this.sites.get(key)?.schedule).length;
        blocks.push(render(REPORTS, 'area', { name, count }));
      }
    }
    blocks.push(
      render(REPORTS, 'offered', { count: this.offered().length }),
      this.okAt === null
        ? render(REPORTS, 'waiting')
        : render(REPORTS, 'read', { age: Math.round((this.now() - this.okAt) / 60000) }),
      render(REPORTS, 'watched', { count: this.watched().length }),
    );
    return lines(...blocks);
  }
}
