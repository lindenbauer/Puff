import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompanion, createCompanionSound } from '../src/companion.js';

function advance(pet, seconds) {
  let state;
  for (let i = 0; i < Math.ceil(seconds * 60); i++) state = pet.update(1 / 60);
  return state;
}

test('petting makes Čupko happy; rest leads to sleep, touch wakes him', () => {
  const pet = createCompanion();
  assert.equal(advance(pet, 30).mood, 'awake');
  pet.interact(true); pet.interact(true);
  assert.equal(pet.update(1 / 60).mood, 'happy');
  assert.equal(advance(pet, 36).mood, 'sleepy');
  assert.equal(advance(pet, 11).mood, 'sleeping');
  pet.interact();
  const awake = advance(pet, 1);
  assert.equal(awake.mood, 'awake');
  assert.ok(awake.sleep < 0.02);
});

test('a stalled frame does not instantly send Čupko to sleep', () => {
  const pet = createCompanion();
  for (const dt of [10000, Infinity, NaN, -1]) assert.equal(pet.update(dt).mood, 'awake');
});

test('sound is opt-in, rate-limited and stopped immediately when muted', async () => {
  let starts = 0; let silences = 0;
  const param = () => ({setValueAtTime(v) {if (v === 0) silences++;}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}});
  const ctx = {
    state: 'suspended', currentTime: 0, destination: {},
    async resume() {this.state = 'running';},
    createOscillator() {return {frequency: param(), connect() {}, disconnect() {}, start() {starts++;}, stop() {}};},
    createGain() {return {gain: param(), connect() {}, disconnect() {}};}
  };
  const sound = createCompanionSound(() => ctx);
  assert.equal(sound.coo(), false);
  assert.equal(await sound.setEnabled(true), true);
  assert.equal(sound.coo(), true);
  assert.equal(sound.coo(), false);
  ctx.currentTime = 3;
  assert.equal(sound.coo(), true);
  const beforeMute = silences;
  assert.equal(await sound.setEnabled(false), false);
  assert.ok(silences > beforeMute);
  assert.equal(sound.coo(), false);
  assert.equal(starts, 2);
});

test('unavailable or denied audio leaves the game usable', async () => {
  for (const factory of [() => null, () => {throw new Error('Unavailable');}]) {
    const sound = createCompanionSound(factory);
    assert.equal(await sound.setEnabled(true), false);
    assert.equal(sound.coo(), false);
    sound.stop();
  }
});

test('sleep and happiness close the 3D eyes without changing environment scale', async () => {
  const { createBlobCreature } = await import('../src/blobCreature.js');
  const pet = createBlobCreature();
  pet.setEnvironmentScale(0.25, -0.14, 0.42);
  const eyes = pet.root.getObjectByName('FacialFeatures').children.filter(child => child.isGroup);
  assert.equal(eyes.length, 2);
  pet.update(1 / 60, null, null, false, {sleep: 1, happiness: 0});
  assert.ok(eyes.every(eye => eye.scale.y < 0.1));
  assert.equal(pet.animState.baseScale, 0.25);
  pet.update(1 / 60, null, null, false, {sleep: 0, happiness: 1});
  assert.ok(eyes.every(eye => eye.scale.y > 0.1 && eye.scale.y < 0.4));
  pet.update(1 / 60, null, null, false, {sleep: 0, happiness: 0});
  assert.ok(eyes.every(eye => eye.scale.y > 0.9));
});
