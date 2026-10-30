// -----------------------------------------------------------------------------
// What the integration writes to `docker logs`: at info, only the lifecycle
// (the start, a source lost and back), never one line per reading nor
// per minute; a failure that repeats at every read is logged once, plus one
// line when it is over.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureLogs, create, createWorld, minutes, urlOf } from './helpers/world.js';

const strip = (line) => line.text.replace(/^\[[^\]]+\] /, '');

test('the start is one info line', async (t) => {
  const lines = captureLogs(t, 'info');
  const world = await createWorld();
  t.after(() => world.app.stop());
  assert.deepEqual(lines.map(strip), [
    '[INFO] [decheteries] Started: 1 area(s), 0 nearest site(s), 0 site(s) added',
  ]);
});

test('a normal day writes nothing at info, one line per read at debug', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Blagnac');
  const lines = captureLogs(t, 'info');
  await minutes(world, 600);
  await world.service.refresh();
  assert.deepEqual(lines, []);
  const debug = captureLogs(t, 'debug');
  await world.service.refresh();
  assert.deepEqual(debug.map(strip), ['[DEBUG] [decheteries] Toulouse: 20 site(s) read']);
});

test('a source down at every read: one warning, then one line at recovery', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Blagnac');
  const url = urlOf('toulouse');
  const saved = world.network.routes[url];
  const lines = captureLogs(t, 'info');
  world.network.routes[url] = new TypeError('fetch failed');
  for (let i = 0; i < 4; i += 1) {
    await world.service.refresh();
  }
  world.network.routes[url] = saved;
  await world.service.refresh();
  assert.deepEqual(lines.map(strip), [
    '[WARN] [decheteries] Toulouse unavailable: data.toulouse-metropole.fr: fetch failed',
    '[INFO] [decheteries] Toulouse back',
  ]);
});
