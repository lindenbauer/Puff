// Local, deterministic companion behavior. Time advances only while visible.
export function createCompanion() {
  let idle = 0;
  let happiness = 0;
  let sleep = 0;
  return {
    interact(petting = false) {
      idle = 0;
      if (petting) happiness = Math.min(1, happiness + 0.18);
    },
    update(dt) {
      const step = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), 0.1);
      idle += step;
      happiness = Math.max(0, happiness - step * 0.12);
      const target = Math.max(0, Math.min(1, (idle - 35) / 10));
      sleep += (target - sleep) * (1 - Math.exp(-step * 5));
      return {
        happiness, sleep,
        mood: sleep > 0.8 ? 'sleeping' : idle > 35 ? 'sleepy' : happiness > 0.2 ? 'happy' : 'awake'
      };
    }
  };
}

// A quiet synthesized coo: no microphone, recording, requests or audio assets.
export function createCompanionSound(makeContext = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  return AudioContext ? new AudioContext() : null;
}) {
  let context;
  let enabled = false;
  let request = 0;
  let lastCoo = -Infinity;
  const active = new Set();
  function stop() {
    for (const voice of active) {
      voice.gain.gain.cancelScheduledValues(context.currentTime);
      voice.gain.gain.setValueAtTime(0, context.currentTime);
      try { voice.osc.stop(); } catch { /* Already ended. */ }
    }
    active.clear();
  }
  return {
    async setEnabled(value) {
      const token = ++request;
      if (!value) { enabled = false; stop(); return false; }
      try {
        context ||= makeContext();
        if (!context) return false;
        // Called directly from a button gesture to satisfy mobile audio policies.
        await context.resume();
        if (token !== request) return enabled;
        enabled = context.state === 'running';
      } catch { enabled = false; }
      return enabled;
    },
    coo() {
      if (!enabled || context?.state !== 'running') return false;
      const t = context.currentTime;
      if (t - lastCoo < 2.5) return false;
      lastCoo = t;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);
      osc.frequency.exponentialRampToValueAtTime(250, t + 0.45);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.045, t + 0.08);
      gain.gain.linearRampToValueAtTime(0, t + 0.5);
      osc.connect(gain); gain.connect(context.destination);
      const voice = { osc, gain };
      active.add(voice);
      osc.onended = () => { active.delete(voice); osc.disconnect(); gain.disconnect(); };
      osc.start(t); osc.stop(t + 0.52);
      return true;
    },
    stop
  };
}
