// Spanish audio using the browser's built-in speech synthesis. No account, no API key.

let voices = [];

function refresh() {
  voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
}

if ('speechSynthesis' in window) {
  refresh();
  speechSynthesis.addEventListener('voiceschanged', refresh);
}

export function canSpeak() {
  return 'speechSynthesis' in window;
}

export function spanishVoices() {
  if (!voices.length) refresh();
  return voices.filter((v) => v.lang.toLowerCase().startsWith('es'));
}

// Latin American voices first, since most US classes teach that variety.
const PREFERRED = ['es-mx', 'es-us', 'es-419', 'es-es'];

export function pickVoice(name) {
  const es = spanishVoices();
  if (name) {
    const v = es.find((x) => x.name === name);
    if (v) return v;
  }
  for (const p of PREFERRED) {
    const v = es.find((x) => x.lang.toLowerCase().replace('_', '-') === p);
    if (v) return v;
  }
  return es[0] || null;
}

export function speak(text, voiceName = '') {
  if (!canSpeak() || !text) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(voiceName);
  if (v) u.voice = v;
  u.lang = v ? v.lang : 'es-ES';
  u.rate = 0.9;
  speechSynthesis.speak(u);
  return true;
}
