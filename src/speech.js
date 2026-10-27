export function chooseVoice(voices, selectedURI) {
  return voices.find(v => v.voiceURI === selectedURI) ||
    voices.find(v => /^(sr|bs|hr)(-|$)/i.test(v.lang)) ||
    voices.find(v => v.default) || voices[0] || null;
}

// Text is always available; speaking is explicitly enabled by a user gesture.
export function createSpeech({ synth, Utterance, show, hide, talking, changed,
  now = () => performance.now(), schedule = setTimeout, unschedule = clearTimeout }) {
  let enabled = false;
  let selectedURI = '';
  let voices = [];
  let current = null;
  let timer;
  let generation = 0;
  let lastReaction = -Infinity;
  let disposed = false;
  function status() {
    return { enabled, voices, voice: chooseVoice(voices, selectedURI), supported: Boolean(synth && Utterance) };
  }
  function stop() {
    generation++;
    unschedule(timer);
    if (current) {
      current.onstart = current.onend = current.onerror = null;
      current = null;
      try { synth.cancel(); } catch { /* Text remains usable. */ }
    }
    talking(false);
    hide();
  }
  function refresh() {
    if (disposed) return;
    try { voices = synth?.getVoices() || []; } catch { voices = []; }
    changed?.(status());
  }
  function say(text, { manual = false } = {}) {
    if (disposed || !text || (!manual && now() - lastReaction < 8000)) return false;
    if (!manual) lastReaction = now();
    stop();
    const token = generation;
    show(text);
    const finish = () => {
      if (generation !== token) return;
      current = null;
      talking(false);
    };
    // Bounds both a missing native completion event and text-only display.
    timer = schedule(() => { if (generation === token) stop(); }, 8000);
    const voice = chooseVoice(voices, selectedURI);
    if (enabled && voice && synth && Utterance) {
      try {
        const utterance = new Utterance(text);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = 1.0;
        utterance.pitch = 1.15;
        utterance.volume = 0.65;
        current = utterance;
        utterance.onstart = () => { if (generation === token) talking(true); };
        utterance.onend = finish;
        utterance.onerror = finish;
        synth.speak(utterance);
      } catch { finish(); }
    }
    return true;
  }
  synth?.addEventListener?.('voiceschanged', refresh);
  refresh();
  return {
    say, stop, status,
    setEnabled(value) {
      enabled = Boolean(value && synth && Utterance);
      if (!enabled) stop();
      refresh();
      return enabled;
    },
    selectVoice(uri) { selectedURI = uri; stop(); refresh(); },
    dispose() { stop(); disposed = true; synth?.removeEventListener?.('voiceschanged', refresh); }
  };
}

// Repeated quick direction changes, not a single swipe or hover.
export function createTickleDetector() {
  let last = null;
  let direction = 0;
  let reversals = 0;
  let lastTickle = -Infinity;
  return {
    reset() { last = null; direction = 0; reversals = 0; },
    move(x, y, time) {
      const previous = last;
      last = { x, y, time };
      if (!previous) return false;
      const dt = time - previous.time;
      const dx = x - previous.x;
      const dy = y - previous.y;
      const distance = Math.hypot(dx, dy);
      if (dt <= 0 || dt > 220 || distance < 3 || distance / dt < 0.35) {
        reversals = 0; direction = 0; return false;
      }
      const nextDirection = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : Math.sign(dy);
      if (direction && direction !== nextDirection) reversals++;
      direction = nextDirection;
      if (reversals >= 2 && time - lastTickle > 8000) {
        lastTickle = time; reversals = 0; return true;
      }
      return false;
    }
  };
}
