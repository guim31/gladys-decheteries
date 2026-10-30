// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake `fetch` serving the
// real answers of the four sources (captured on 2026-10-30, test/fixtures/api),
// a manual clock, and the integration wired on top through registerHandlers.
// Nothing touches the network.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';
import { SOURCES } from '../../src/sources.js';

process.env.LOG_LEVEL ??= 'silent';

export const fixtureJson = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/api/${name}`, import.meta.url), 'utf8'));

// Friday 2026-10-30, 10:00 in Paris (09:00 UTC), the day of the capture.
export const FIXTURE_TIME = Date.UTC(2026, 9, 30, 9, 0, 0);
export const MINUTE = 60 * 1000;

/** An instant given as a Paris wall-clock time in winter (UTC+1): paris('2026-11-11 09:00'). */
export const paris = (text) => Date.parse(`${text.replace(' ', 'T')}:00+01:00`);

// The URL of every source and its fixture file.
const INDEX = Object.fromEntries(SOURCES.map((source) => [source.url, `${source.id}.json`]));

/** The URL of a source, e.g. urlOf('toulouse'). */
export const urlOf = (id) => SOURCES.find((source) => source.id === id).url;

// A house in Blagnac, near Toulouse (a public place: the airport).
export const HOUSE = {
  id: 'h1',
  name: 'Maison',
  selector: 'maison',
  latitude: 43.635,
  longitude: 1.368,
};

/**
 * A fake `fetch`: `routes[url]` is a JSON value, a status number, a Response,
 * an Error (network failure) or a function of the request returning one of them.
 * Every call is recorded in `calls`.
 */
export function createFetch(overrides = {}) {
  const routes = {
    ...Object.fromEntries(Object.entries(INDEX).map(([url, file]) => [url, fixtureJson(file)])),
    ...overrides,
  };
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, headers: init.headers ?? {} });
    let route = routes[url];
    if (typeof route === 'function') {
      route = await route(url, init);
    }
    if (route instanceof Error) {
      throw route;
    }
    if (route === undefined) {
      return new Response('not found', { status: 404 });
    }
    if (route instanceof Response) {
      return route;
    }
    if (typeof route === 'number') {
      return new Response('error', { status: route });
    }
    return new Response(JSON.stringify(route), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetch, calls, routes };
}

/** A manual clock. */
export function createClock(start = FIXTURE_TIME) {
  const clock = {
    time: start,
    now: () => clock.time,
    advance(ms) {
      clock.time += ms;
    },
  };
  return clock;
}

/**
 * @param {object} [options]
 * @param {object} [options.config] raw integration config
 * @param {object} [options.network] from createFetch
 * @param {Array} [options.devices] devices already created in Gladys
 * @param {Array} [options.houses] houses of Gladys, with their location
 * @param {boolean} [options.connect]
 */
export async function createWorld({
  config = { areas: ['toulouse'], nearest_count: 0 },
  network = createFetch(),
  devices = [],
  houses = [],
  connect = true,
  clock = createClock(),
} = {}) {
  const gladys = createFakeGladys({ config, devices, houses });
  const app = registerHandlers(gladys, { fetch: network.fetch, timers: false, now: clock.now });
  const world = { gladys, fake: gladys.fake, app, service: app.service, network, clock };
  if (connect) {
    await gladys.connect();
    await app.ready;
    await app.service.loading;
  }
  return world;
}

/** Run a configuration action; resolves with its message (multi-language). */
export async function action(world, key, fields = {}) {
  const ack = await world.fake.action(key, fields);
  if (!ack.success) {
    throw new Error(`${key} failed: ${ack.error}`);
  }
  return ack.data.message;
}

/** The device published for a name part or a predicate, from the last discovery list. */
export const discovered = (world, predicate) =>
  world.fake.discoveredDevices.find(
    typeof predicate === 'function' ? predicate : (d) => d.name.includes(predicate),
  );

/** Create a discovered device in Gladys, as the user would. */
export async function create(world, predicate) {
  const device = discovered(world, predicate);
  if (!device) {
    throw new Error(`${predicate} is not in the discovered devices`);
  }
  await world.fake.deviceCreated(device);
  return device;
}

/** External id of one feature of a device. */
export const featureId = (device, key) =>
  device.features.find((feature) => feature.external_id.endsWith(`:${key}`))?.external_id;

/** Moves the clock on, one evaluation per minute (the integration's own clock). */
export async function minutes(world, count) {
  for (let i = 0; i < count; i += 1) {
    world.clock.advance(MINUTE);
    await world.service.tick();
  }
}

/** Sets the clock and evaluates once (a first evaluation fires no trigger). */
export async function at(world, ms) {
  world.clock.time = ms;
  await world.service.tick();
}

/** Changes records of a served source (`results` matched by a predicate). */
export function setRecords(world, id, predicate, changes) {
  const url = urlOf(id);
  const document = structuredClone(world.network.routes[url]);
  for (const record of document.results) {
    if (predicate(record)) {
      Object.assign(record, typeof changes === 'function' ? changes(record) : changes);
    }
  }
  world.network.routes[url] = document;
  return document;
}

/** Captures what the integration logs, at a level. */
export function captureLogs(t, level = 'info') {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  const lines = [];
  const record = (...args) => {
    const text = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    const match = /^\[[^\]]+\] \[(\w+)\]/.exec(text);
    lines.push({ level: match ? match[1].toLowerCase() : 'raw', text });
  };
  t.mock.method(console, 'log', record);
  t.mock.method(console, 'error', record);
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  return lines;
}
