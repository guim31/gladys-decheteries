// -----------------------------------------------------------------------------
// The integration end to end, against the SDK's fake Gladys and the real
// answers of the four sources captured on 2026-10-30.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { buildSiteDevice } from '../src/devices.js';
import {
  HOUSE,
  MINUTE,
  action,
  at,
  create,
  createWorld,
  featureId,
  minutes,
  paris,
  setRecords,
  urlOf,
} from './helpers/world.js';

const lastState = (world, device, key) => {
  const id = featureId(device, key);
  const found = world.fake.states.filter((s) => s.device_feature_external_id === id).at(-1);
  return found ? (found.text ?? found.state) : undefined;
};
const fired = (world) => world.fake.sceneEvents.map((event) => event.key);
const names = (world) => world.fake.discoveredDevices.map((device) => device.name);

test('the sites with hours of the areas ticked are offered, with stable ids', async (t) => {
  const world = await createWorld({ config: { areas: ['bordeaux'], nearest_count: 0 } });
  t.after(() => world.app.stop());
  // 38 records, of which 20 mobile centres without hours.
  assert.equal(world.fake.discoveredDevices.length, 18);
  assert.ok(names(world).includes('Centre de recyclage Merignac'));
  assert.ok(!names(world).some((name) => name.includes('mobile')));
  const merignac = world.fake.discoveredDevices.find((d) => d.name.endsWith('Merignac'));
  assert.equal(merignac.external_id, 'ext:test-integration:site:bordeaux-2');
  assert.equal(merignac.should_poll, false);
  assert.deepEqual(
    merignac.params.map((p) => [p.name, p.value]),
    [
      ['site', 'bordeaux-2'],
      ['city', 'Mérignac'],
      ['address', '155 Avenue des Marronniers, 33700 Mérignac'],
    ],
  );
  // Only the source needed is read.
  assert.deepEqual(
    world.network.calls.map((call) => call.url),
    [urlOf('bordeaux')],
  );
});

test('around a located house: the nearest sites within the distance, every source read', async (t) => {
  const world = await createWorld({
    config: { areas: [], nearest_count: 3, max_distance: 30 },
    houses: [HOUSE],
  });
  t.after(() => world.app.stop());
  assert.deepEqual(names(world), [
    'Déchèterie de Blagnac',
    'Déchèterie de Cornebarrieu',
    'Déchèterie de Turlu',
  ]);
  assert.equal(world.network.calls.length, 4);
  const message = await action(world, 'status');
  assert.match(message.fr, /les 3 déchèteries les plus proches à moins de 30 km/);
  assert.match(message.fr, /■ Toulouse : 20 déchèteries avec horaires/);
  assert.match(message.fr, /■ Bordeaux : 18 déchèteries avec horaires/);
  assert.match(message.fr, /3 déchèteries dans l'onglet Découverte/);
});

test('without a located house nor an area: nothing offered, and the status says why', async (t) => {
  const world = await createWorld({
    config: { areas: [] },
    houses: [{ ...HOUSE, latitude: null, longitude: null }],
  });
  t.after(() => world.app.stop());
  assert.deepEqual(world.fake.discoveredDevices, []);
  assert.deepEqual(world.network.calls, []);
  const message = await action(world, 'status');
  assert.match(message.en, /The house has no location in Gladys/);
  assert.match(message.en, /No area ticked and no located house/);
});

test('a site added: every state at once, in the configured language', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const blagnac = await create(world, 'Blagnac');
  assert.equal(lastState(world, blagnac, 'open'), 1);
  assert.equal(lastState(world, blagnac, 'hours'), '09:00–12:00, 14:00–18:00');
  assert.equal(lastState(world, blagnac, 'closes'), '12:00');
  assert.equal(lastState(world, blagnac, 'next'), "aujourd'hui à 14:00");
  assert.deepEqual(
    blagnac.features.map((f) => f.name),
    ['Ouvert maintenant', 'Horaires du jour', 'Heure de fermeture', 'Prochaine ouverture'],
  );
  // Friday evening: closed, Saturday closed in winter, Sunday 10:00.
  await at(world, paris('2026-10-30 18:30'));
  assert.equal(lastState(world, blagnac, 'open'), 0);
  assert.equal(lastState(world, blagnac, 'closes'), 'Fermé');
  assert.equal(lastState(world, blagnac, 'next'), 'dimanche à 10:00');
});

test('the triggers: closes soon, closes, opens; none after a gap', async (t) => {
  const world = await createWorld({ config: { areas: ['toulouse'], closing_notice: 20 } });
  t.after(() => world.app.stop());
  const blagnac = await create(world, 'Blagnac');
  await at(world, paris('2026-10-30 11:30'));
  await minutes(world, 10);
  assert.deepEqual(fired(world), ['closing_soon']);
  assert.deepEqual(world.fake.sceneEvents[0].data, {
    site: blagnac.external_id,
    site_name: 'Déchèterie de Blagnac',
    closes_at: '12:00',
    minutes_left: 20,
    next_opening: "aujourd'hui à 14:00",
  });
  await minutes(world, 20);
  assert.deepEqual(fired(world), ['closing_soon', 'closed']);
  assert.equal(world.fake.sceneEvents[1].data.next_opening, "aujourd'hui à 14:00");
  await minutes(world, 120);
  assert.deepEqual(fired(world), ['closing_soon', 'closed', 'opened']);
  // The host slept from 17:30 to 19:00: no "closed" an hour late.
  await minutes(world, 90);
  world.clock.advance(90 * MINUTE);
  await world.service.tick();
  assert.deepEqual(fired(world), ['closing_soon', 'closed', 'opened']);
});

test('Bordeaux: the accepted waste as a text and five binaries', async (t) => {
  const world = await createWorld({ config: { areas: ['bordeaux'], language: 'en' } });
  t.after(() => world.app.stop());
  const merignac = await create(world, 'Merignac');
  assert.equal(merignac.features.length, 10);
  assert.equal(
    lastState(world, merignac, 'waste'),
    'green waste, rubble, wood, metals, cardboard, glass, electrical appliances, burnable bulky waste, non-burnable bulky waste, household chemicals, engine oil, car batteries, batteries, books',
  );
  assert.equal(lastState(world, merignac, 'green_waste'), 1);
  assert.equal(lastState(world, merignac, 'rubble'), 1);
  assert.equal(lastState(world, merignac, 'electrical'), 1);
  assert.equal(lastState(world, merignac, 'bulky'), 1);
  // Floirac sends a sentence instead of a list: no binary state.
  const floirac = await create(world, 'Floirac');
  assert.equal(lastState(world, floirac, 'waste'), 'See the operator');
  assert.equal(lastState(world, floirac, 'wood'), undefined);
  // A Saturday and Sunday site: Carle Vernet.
  const carle = await create(world, 'Carle Vernet');
  assert.equal(lastState(world, carle, 'next'), 'tomorrow at 07:00');
});

test('a site whose hours become unreadable keeps its device, without open state', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const blagnac = await create(world, 'Blagnac');
  setRecords(world, 'toulouse', (r) => r.equip_nom.includes('BLAGNAC'), {
    equip_ouverture: 'Mo-Fr 22:00-02:00',
  });
  const before = world.fake.states.length;
  await world.service.refresh();
  const after = world.fake.states.slice(before);
  assert.ok(!after.some((s) => s.device_feature_external_id === featureId(blagnac, 'open')));
  assert.equal(lastState(world, blagnac, 'hours'), 'Horaires illisibles');
  assert.equal(lastState(world, blagnac, 'next'), 'inconnue');
  // No longer offered, still watched.
  assert.ok(!names(world).includes('Déchèterie de Blagnac'));
  assert.equal(world.service.watched().length, 1);
});

test('a site added from another area is read anyway', async (t) => {
  const site = { key: 'tours-E79JIzqvxM', source: 'tours', name: 'Grange', city: '', address: '' };
  const gladys = (await createWorld({ connect: false })).gladys;
  const device = { ...buildSiteDevice(gladys, site, 'fr'), name: 'Ma déchèterie' };
  const world = await createWorld({ config: { areas: ['toulouse'] }, devices: [device] });
  t.after(() => world.app.stop());
  assert.deepEqual(
    world.network.calls.map((call) => call.url).sort(),
    [urlOf('toulouse'), urlOf('tours')].sort(),
  );
  await at(world, paris('2026-11-11 10:00'));
  assert.equal(lastState(world, device, 'hours'), 'Jour férié : fermé');
  const result = await world.fake.sceneAction('is_open', {});
  assert.equal(
    result.data.outputs.sentence,
    'Ma déchèterie : jour férié, fermé, ouvre demain à 08:45.',
  );
});

test('the scene action is_open: a sentence and numbers', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const blagnac = await create(world, 'Blagnac');
  await create(world, 'Ramier');
  const all = await world.fake.sceneAction('is_open', {});
  assert.deepEqual(all.data.outputs, {
    sentence:
      "Déchèterie de Blagnac : ouvert jusqu'à 12:00. Déchèterie du Ramier : ouvert jusqu'à 12:00.",
    open_count: 2,
    sites_count: 2,
  });
  await at(world, paris('2026-11-11 10:00'));
  const one = await world.fake.sceneAction('is_open', { sites: [blagnac.external_id] });
  assert.equal(one.data.outputs.sites_count, 1);
  // Blagnac opens on Sundays: Armistice Day assumed open.
  assert.equal(one.data.outputs.open_count, 1);
  const ramier = await world.fake.sceneAction('is_open', {
    sites: [world.service.watched()[1].deviceId],
  });
  assert.equal(
    ramier.data.outputs.sentence,
    'Déchèterie du Ramier : jour férié, fermé a priori (la source ne précise rien), ouvre demain à 09:00.',
  );
  const none = await world.fake.sceneAction('is_open', { sites: ['ext:gone'] });
  assert.equal(none.success, false);
});

test('the widget: one row per site, colors, hidden times, validated content', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const empty = await world.fake.widgetGet('sites', { language: 'en' });
  assert.equal(empty.data.content.components[0].type, 'text');
  await create(world, 'Blagnac');
  await create(world, 'Ramier');
  await at(world, paris('2026-10-30 11:45'));
  const content = (await world.fake.widgetGet('sites', { language: 'fr' })).data.content;
  assert.deepEqual(validateWidgetContent(content).errors ?? [], []);
  assert.deepEqual(content.components[0].items, [
    { label: 'Déchèterie de Blagnac', value: 'ferme dans 15 min', color: 'warning' },
    { label: 'Déchèterie du Ramier', value: 'ferme dans 15 min', color: 'warning' },
  ]);
  await at(world, paris('2026-10-31 13:00'));
  const saturday = (await world.fake.widgetGet('sites', { language: 'en' })).data.content;
  assert.deepEqual(saturday.components[0].items, [
    { label: 'Déchèterie de Blagnac', value: 'closed · opens Sun 10:00', color: 'danger' },
    { label: 'Déchèterie du Ramier', value: 'closed · opens 14:00', color: 'danger' },
  ]);
  const hidden = await world.fake.widgetGet('sites', {
    language: 'en',
    settings: { show_hours: false },
  });
  assert.equal(hidden.data.content.components[0].items[1].value, 'closed');
});

test('a source down keeps the sites of the last read, and is read again an hour later', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const blagnac = await create(world, 'Blagnac');
  world.network.routes[urlOf('toulouse')] = 503;
  await world.service.refresh();
  assert.equal(world.service.failing, true);
  await at(world, paris('2026-10-30 13:00'));
  assert.equal(lastState(world, blagnac, 'open'), 0);
  const message = await action(world, 'status');
  assert.match(message.en, /■ Toulouse: unavailable \(data\.toulouse-metropole\.fr: HTTP 503\)/);
});

test('the language of the configuration changes the texts, not the frozen names', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const blagnac = await create(world, 'Blagnac');
  await world.fake.configUpdated({ areas: ['toulouse'], nearest_count: 0, language: 'de' });
  assert.equal(lastState(world, blagnac, 'next'), 'heute um 14:00');
  assert.equal(
    world.fake.discoveredDevices.find((d) => d.name.includes('Blagnac')).features[0].name,
    'Jetzt geöffnet',
  );
});
