// Progress lives in the browser (localStorage). Export/Import moves it between devices.
import { dateKey, DAY, startOfDay } from './app.js';

const KEY = 'spanish-study:v1';

function defaults() {
  return {
    version: 1,
    cards: {},      // cardId -> scheduler state (see srs.js)
    days: {},       // 'YYYY-MM-DD' -> { reviews, correct, new }
    grammar: {},    // topicId -> { best, attempts, last }
    settings: { newPerDay: 10, autoAudio: true, voice: '' },
  };
}

let state = null;

function merge(parsed) {
  const d = defaults();
  return {
    ...d,
    ...parsed,
    cards: parsed.cards || {},
    days: parsed.days || {},
    grammar: parsed.grammar || {},
    settings: { ...d.settings, ...(parsed.settings || {}) },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(JSON.parse(raw));
  } catch (e) {
    console.warn('Could not read saved progress', e);
  }
  return defaults();
}

export function getState() {
  if (!state) state = load();
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(getState()));
  } catch (e) {
    console.warn('Could not save progress', e);
  }
}

export function recordReview({ correct, isNew = false }) {
  const s = getState();
  const k = dateKey();
  const d = s.days[k] || (s.days[k] = { reviews: 0, correct: 0, new: 0 });
  d.reviews++;
  if (correct) d.correct++;
  if (isNew) d.new++;
  save();
}

export function newIntroducedToday() {
  return getState().days[dateKey()]?.new || 0;
}

export function studiedToday() {
  return (getState().days[dateKey()]?.reviews || 0) > 0;
}

/** Consecutive days with at least one review, ending today or yesterday. */
export function streak() {
  const s = getState();
  let t = startOfDay();
  if (!(s.days[dateKey(new Date(t))]?.reviews > 0)) t -= DAY;
  let n = 0;
  while (s.days[dateKey(new Date(t))]?.reviews > 0) {
    n++;
    t -= DAY;
  }
  return n;
}

export function exportJSON() {
  return JSON.stringify(getState(), null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !parsed.cards || !parsed.days) {
    throw new Error('That file does not look like a progress backup.');
  }
  state = merge(parsed);
  save();
  return state;
}

export function resetAll() {
  state = defaults();
  save();
}

export function downloadExport() {
  const blob = new Blob([exportJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `spanish-progress-${dateKey()}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
