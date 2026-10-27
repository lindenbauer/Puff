import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpeech, createTickleDetector, chooseVoice } from '../src/speech.js';

function harness(supported = true) {
  let time = 0; let text = ''; let active = false; let spoken = []; let cancelled = 0;
  const jobs = new Map(); let next = 1; let changed;
  const listeners = new Map();
  const synth = { voices: [], getVoices() {return this.voices;},
    speak(u) {spoken.push(u);u.onstart?.();}, cancel() {cancelled++;},
    addEventListener(k,v) {listeners.set(k,v);}, removeEventListener(k) {listeners.delete(k);} };
  const speech = createSpeech({synth: supported ? synth : null, Utterance: supported ? class {constructor(t) {this.text=t;}} : null,
    show(t) {text=t;}, hide() {text='';}, talking(v) {active=v;}, changed(v) {changed=v;}, now:()=>time,
    schedule(fn) {const id=next++;jobs.set(id,fn);return id;}, unschedule(id) {jobs.delete(id);} });
  return {speech,synth,listeners,jobs,spoken,get text(){return text;},get active(){return active;},get cancelled(){return cancelled;},get status(){return changed;},setTime(t){time=t;}};
}

test('text works without speech support and nothing autoplays', () => {
  const h = harness(false);
  assert.equal(h.text, '');
  assert.equal(h.speech.setEnabled(true), false);
  assert.equal(h.speech.say('Ćao!', {manual:true}), true);
  assert.equal(h.text, 'Ćao!');
  assert.equal(h.spoken.length, 0);
});

test('voices may arrive later; our language is preferred and explicit choice wins', () => {
  const h = harness();
  h.speech.setEnabled(true);
  h.speech.say('Ćao', {manual:true});
  assert.equal(h.spoken.length, 0);
  const en={voiceURI:'en',lang:'en-US',default:true}, hr={voiceURI:'hr',lang:'hr-HR'};
  h.synth.voices=[en,hr];h.listeners.get('voiceschanged')();
  assert.equal(h.status.voice,hr);
  h.speech.selectVoice('en');
  h.speech.say('Ćao', {manual:true});
  assert.equal(h.spoken[0].voice,en);
  assert.equal(chooseVoice([en,hr]),hr);
});

test('repeated petting is throttled; greeting is immediate; mute cancels and hides', () => {
  const h=harness();h.synth.voices=[{voiceURI:'sr',lang:'sr-RS'}];h.speech.setEnabled(true);
  assert.equal(h.speech.say('Golica!'),true);
  assert.equal(h.active,true);
  assert.equal(h.speech.say('Golica!'),false);
  assert.equal(h.speech.say('Ćao!',{manual:true}),true);
  assert.equal(h.spoken.length,2);
  assert.equal(h.text,'Ćao!');
  assert.ok(h.cancelled>0);
  h.speech.setEnabled(false);
  assert.equal(h.active,false);assert.equal(h.text,'');
  h.setTime(9000);h.speech.say('Tiho');assert.equal(h.text,'Tiho');assert.equal(h.spoken.length,2);
});

test('native errors and missing completion cannot leave a talking effect stuck', () => {
  const h=harness();h.synth.voices=[{voiceURI:'sr',lang:'sr'}];h.speech.setEnabled(true);
  h.speech.say('Ćao',{manual:true});h.spoken[0].onerror();assert.equal(h.active,false);assert.equal(h.text,'Ćao');
  h.speech.say('Drugi pozdrav',{manual:true});assert.equal(h.active,true);
  [...h.jobs.values()][0]();assert.equal(h.active,false);assert.equal(h.text,'');
  h.speech.dispose();assert.equal(h.listeners.size,0);assert.equal(h.speech.say('Kasno'),false);
});

test('slow strokes, a single swipe, or duplicate timestamps do not tickle', () => {
  const t=createTickleDetector();
  assert.equal(t.move(0,0,0),false);assert.equal(t.move(100,0,100),false);assert.equal(t.move(200,0,200),false);
  t.reset();assert.equal(t.move(0,0,300),false);assert.equal(t.move(50,0,300),false);
  t.reset();for(let i=0;i<10;i++)assert.equal(t.move(i%2?5:0,0,500+i*100),false);
});

test('quick repeated strokes trigger one laugh with an eight-second cooldown', () => {
  const t=createTickleDetector();
  const stroke=(start)=>[0,60,0,60].map((x,i)=>t.move(x,0,start+i*80));
  assert.deepEqual(stroke(0),[false,false,false,true]);
  t.reset();assert.ok(stroke(1000).every(v=>!v));
  t.reset();assert.equal(stroke(10000).at(-1),true);
});
