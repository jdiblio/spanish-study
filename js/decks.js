// Vocabulary decks: loading, turning words into cards, checking answers, building review queues.
import { loadJSON, shuffle, startOfDay } from './app.js';
import { getState, newIntroducedToday } from './storage.js';
import { isDue, isMature } from './srs.js';

export const DIR = { REC: 'es-en', PROD: 'en-es' }; // recognition (read Spanish) vs production (write Spanish)

let cache = null;

export async function loadDecks() {
  if (cache) return cache;
  const index = await loadJSON('data/decks.json');
  const decks = await Promise.all(
    (index.decks || []).map(async (d) => ({ ...d, ...(await loadJSON(d.file)) }))
  );
  cache = decks.filter((d) => Array.isArray(d.items) && d.items.length);
  return cache;
}

export function cardId(deckId, item, dir) {
  return `${deckId}|${item.es}|${dir}`;
}

export function makeCard(deck, item, dir) {
  return { id: cardId(deck.id, item, dir), deckId: deck.id, deckTitle: deck.title, dir, item };
}

export function cardsForDeck(deck, dirs = [DIR.REC, DIR.PROD]) {
  return deck.items.flatMap((item) => dirs.map((dir) => makeCard(deck, item, dir)));
}

/** Counts for one deck: due cards, new words, learning/mature cards. */
export function deckStats(deck, now = Date.now()) {
  const cards = getState().cards;
  let due = 0, newWords = 0, learning = 0, mature = 0;
  for (const item of deck.items) {
    const rec = cards[cardId(deck.id, item, DIR.REC)];
    const prod = cards[cardId(deck.id, item, DIR.PROD)];
    if (!rec) newWords++;
    for (const cs of [rec, prod]) {
      if (!cs) continue;
      if (isDue(cs, now)) due++;
      if (isMature(cs)) mature++; else learning++;
    }
  }
  return { due, newWords, learning, mature, words: deck.items.length };
}

/**
 * Build today's review queue across decks.
 * - due: cards whose scheduled date has arrived
 * - newProd: production cards unlocked because their recognition card has been learned
 * - newRec: brand-new words, limited by the daily new-word setting
 */
export function buildReviewQueue(decks, { newLimit } = {}) {
  const st = getState();
  const now = Date.now();
  const today = startOfDay(new Date(now));
  const due = [], newProd = [], newRec = [];
  for (const deck of decks) {
    for (const item of deck.items) {
      const rec = makeCard(deck, item, DIR.REC);
      const prod = makeCard(deck, item, DIR.PROD);
      const rs = st.cards[rec.id];
      const ps = st.cards[prod.id];
      if (rs) { if (isDue(rs, now)) due.push(rec); } else newRec.push(rec);
      if (ps) { if (isDue(ps, now)) due.push(prod); }
      // Day 1: learn to recognize the word. From the next day on: also produce it.
      else if (rs && rs.reps > 0 && rs.last < today) newProd.push(prod);
    }
  }
  const limit = newLimit ?? Math.max(0, (st.settings.newPerDay || 0) - newIntroducedToday());
  shuffle(newRec);
  return { due, newProd, newRec: newRec.slice(0, limit), newAvailable: newRec.length };
}

// ---------- Answer checking ----------
const ARTICLE = /^(el|la|los|las|un|una|unos|unas)\s+/;

export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[¿?¡!.,;:"“”'‘’()…_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function variants(s, strict = false) {
  const n = normalize(s);
  const set = new Set(strict ? [n] : [n, n.replace(ARTICLE, '')]);
  return [...set].filter(Boolean);
}

/**
 * 'correct' | 'almost' (right letters, wrong accents) | 'wrong'
 * strict: articles are not optional (for grammar practice where the article is the point).
 */
export function checkAnswer(input, item, { strict = false } = {}) {
  const guesses = variants(input, strict);
  if (!guesses.length) return 'wrong';
  const answers = [item.es, ...(item.alt || [])].flatMap((a) => variants(a, strict));
  if (guesses.some((g) => answers.includes(g))) return 'correct';
  const aa = answers.map(stripAccents);
  if (guesses.map(stripAccents).some((g) => aa.includes(g))) return 'almost';
  return 'wrong';
}
