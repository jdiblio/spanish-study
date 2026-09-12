// Vocabulary page: deck picker, flashcard session (review or practice), summary.
import { $, el, shuffle, initPage, toast, humanInterval, plural } from './app.js';
import { getState, save, recordReview, newIntroducedToday } from './storage.js';
import { Rating, schedule, previewIntervals } from './srs.js';
import { speak, canSpeak } from './audio.js';
import { loadDecks, DIR, cardsForDeck, deckStats, buildReviewQueue, checkAnswer } from './decks.js';

initPage('vocab');
const app = $('#app');
const params = new URLSearchParams(location.search);

let decks = [];
let session = null;
let keyHandler = null;

async function main() {
  try {
    decks = await loadDecks();
  } catch (e) {
    app.replaceChildren(el('p', { class: 'error' }, e.message));
    return;
  }
  if (params.get('start') === 'review') return startSession('review', decks);
  const deckId = params.get('deck');
  if (deckId) {
    const d = decks.find((x) => x.id === deckId);
    if (d) return startSession(params.get('mode') || 'practice', [d], params.get('dir') || 'both');
  }
  renderSetup();
}

// ---------- Setup screen ----------
function renderSetup() {
  setKeyHandler(null);
  session = null;
  history.replaceState(null, '', 'vocab.html');
  const st = getState();

  if (!decks.length) {
    app.replaceChildren(
      el('h1', {}, 'Vocabulario'),
      el('div', { class: 'card empty' }, 'No decks yet. Once class materials are added, the vocabulary shows up here.')
    );
    return;
  }

  const selected = new Set(decks.map((d) => d.id));
  const reviewBtn = el('button', { class: 'btn btn-primary btn-lg btn-block', onClick: () => startSession('review', chosen()) });
  const reviewInfo = el('div', { class: 'muted small' });
  const dirSelect = el('select', {},
    el('option', { value: 'both' }, 'Both directions'),
    el('option', { value: DIR.PROD }, 'English → Spanish (type it)'),
    el('option', { value: DIR.REC }, 'Spanish → English (flip)')
  );
  const practiceBtn = el('button', { class: 'btn btn-lg btn-block', onClick: () => startSession('practice', chosen(), dirSelect.value) }, 'Practice whole deck');

  const chosen = () => decks.filter((d) => selected.has(d.id));

  function refreshMode() {
    const q = buildReviewQueue(chosen());
    const dueCards = q.due.length + q.newProd.length;
    const newWords = q.newRec.length;
    const total = dueCards + newWords;
    reviewBtn.textContent = total ? `Start review (${total})` : 'Nothing due right now';
    reviewBtn.disabled = !total;
    const bits = [];
    if (dueCards) bits.push(plural(dueCards, 'card') + ' due');
    if (newWords) bits.push(plural(newWords, 'new word'));
    if (!total && q.newAvailable) bits.push(`daily limit of ${st.settings.newPerDay} new words reached. Come back tomorrow or practice freely.`);
    if (!total && !q.newAvailable) bits.push('all caught up!');
    reviewInfo.textContent = bits.join(' · ');
    practiceBtn.disabled = !chosen().length;
  }

  const deckRows = decks.map((d) => {
    const s = deckStats(d);
    const cb = el('input', { type: 'checkbox', checked: true, onChange: () => { cb.checked ? selected.add(d.id) : selected.delete(d.id); refreshMode(); } });
    return el('label', { class: 'deck-row' },
      cb,
      el('span', { class: 'title' }, d.title),
      s.due ? el('span', { class: 'chip accent' }, `${s.due} due`) : null,
      s.newWords ? el('span', { class: 'chip blue' }, `${s.newWords} new`) : null,
      s.mature ? el('span', { class: 'chip green' }, `${s.mature} known`) : null,
      el('span', { class: 'chip' }, plural(s.words, 'word'))
    );
  });

  const newPerDay = el('select', { onChange: () => { st.settings.newPerDay = Number(newPerDay.value); save(); refreshMode(); } },
    [5, 10, 15, 20, 30].map((n) => el('option', { value: n, selected: st.settings.newPerDay === n }, `${n} new words per day`))
  );

  app.replaceChildren(
    el('div', { class: 'section-title' }, el('h1', {}, 'Vocabulario'), el('span', { class: 'en' }, 'Vocabulary')),
    el('p', { class: 'muted' }, 'Flashcards scheduled with spaced repetition. Type the Spanish when asked: producing a word is what makes it stick.'),
    el('div', { class: 'card' }, el('h2', {}, 'Decks'), ...deckRows),
    el('div', { class: 'grid mt' },
      el('div', { class: 'card mode-card' },
        el('h2', {}, 'Review'),
        el('p', { class: 'muted small' }, 'What the schedule says you should see today, plus a few new words. This is the daily habit.'),
        reviewBtn, reviewInfo, newPerDay),
      el('div', { class: 'card mode-card' },
        el('h2', {}, 'Practice'),
        el('p', { class: 'muted small' }, 'Go through a whole deck freely. Good before a quiz. Does not change the schedule.'),
        dirSelect, practiceBtn)
    )
  );
  refreshMode();
}

// ---------- Session ----------
function startSession(mode, chosenDecks, dir = 'both') {
  let queue;
  let newIds = new Set();
  if (mode === 'review') {
    const q = buildReviewQueue(chosenDecks);
    queue = shuffle([...q.due, ...q.newProd, ...q.newRec]);
    newIds = new Set(q.newRec.map((c) => c.id));
  } else {
    const dirs = dir === 'both' ? [DIR.REC, DIR.PROD] : [dir];
    queue = shuffle(chosenDecks.flatMap((d) => cardsForDeck(d, dirs)));
  }
  if (!queue.length) {
    app.replaceChildren(
      el('h1', {}, 'Vocabulario'),
      el('div', { class: 'card empty' },
        el('p', {}, mode === 'review' ? 'Nothing is due right now. Nice.' : 'That deck is empty.'),
        el('button', { class: 'btn', onClick: renderSetup }, 'Back'))
    );
    return;
  }
  session = { mode, queue, total: queue.length, seen: new Set(), correct: 0, missed: 0, current: null, phase: 'front', newIds };
  next();
}

function next() {
  if (!session.queue.length) return renderSummary();
  session.current = session.queue.shift();
  session.phase = 'front';
  renderCard();
}

function renderCard() {
  const { current: card, seen, total } = session;
  const item = card.item;
  const st = getState();
  const done = seen.size;

  const top = el('div', { class: 'session-top' },
    el('button', { class: 'btn btn-ghost btn-sm', onClick: exitSession }, '✕ Exit'),
    el('div', { class: 'progress' }, el('i', { style: `width:${(done / total) * 100}%` })),
    el('span', { class: 'muted small' }, `${done}/${total}`)
  );

  const speakBtn = canSpeak()
    ? el('button', { class: 'icon-btn', title: 'Listen', 'aria-label': 'Listen', onClick: () => speak(item.es, st.settings.voice) }, '🔊')
    : null;

  const body = el('div', { class: 'card flashcard' });
  const modeChip = el('div', { class: 'row' },
    el('span', { class: 'chip' }, card.deckTitle),
    session.newIds.has(card.id) ? el('span', { class: 'chip blue' }, 'new') : null,
    session.mode === 'practice' ? el('span', { class: 'chip amber' }, 'practice') : null
  );

  if (card.dir === DIR.REC) {
    body.append(
      el('span', { class: 'lang-tag' }, 'Spanish · what does it mean?'),
      el('div', { class: 'row' }, el('div', { class: 'word', lang: 'es' }, item.es), speakBtn),
      item.note ? el('div', { class: 'note' }, item.note) : null,
      el('div', { class: 'actions' },
        el('button', { class: 'btn btn-primary btn-lg', onClick: reveal }, 'Show answer')),
      el('div', { class: 'kbd-hint' }, el('kbd', {}, 'Space'), ' to flip')
    );
    if (st.settings.autoAudio) setTimeout(() => speak(item.es, st.settings.voice), 150);
  } else {
    const input = el('input', { class: 'answer-input', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', lang: 'es', placeholder: 'Type it in Spanish' });
    const form = el('form', { class: 'answer-form', onSubmit: (e) => { e.preventDefault(); check(input.value); } },
      input,
      accentKeys(input),
      el('div', { class: 'actions' },
        el('button', { class: 'btn btn-primary', type: 'submit' }, 'Check'),
        el('button', { class: 'btn btn-ghost', type: 'button', onClick: () => check('') }, "I don't know"))
    );
    body.append(
      el('span', { class: 'lang-tag' }, 'English · say it in Spanish'),
      el('div', { class: 'word small-word' }, item.en),
      item.note ? el('div', { class: 'note' }, item.note) : null,
      form
    );
    setTimeout(() => input.focus(), 0);
  }

  app.replaceChildren(top, modeChip, body);
  setKeyHandler((e) => {
    if (session.phase !== 'front' || card.dir !== DIR.REC) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); }
  });
}

function accentKeys(input) {
  const chars = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'];
  return el('div', { class: 'accent-keys' },
    chars.map((ch) => el('button', { type: 'button', tabindex: '-1', onClick: () => insertAtCursor(input, ch) }, ch))
  );
}

function insertAtCursor(input, ch) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.value = input.value.slice(0, start) + ch + input.value.slice(end);
  input.setSelectionRange(start + 1, start + 1);
  input.focus();
}

// Recognition card: flip, then self-grade.
function reveal() {
  const { current: card } = session;
  const item = card.item;
  session.phase = 'back';
  const body = $('.flashcard');
  body.replaceChildren(
    el('span', { class: 'lang-tag' }, 'Spanish'),
    el('div', { class: 'word', lang: 'es' }, item.es),
    el('div', { class: 'divider' }),
    el('span', { class: 'lang-tag' }, 'English'),
    el('div', { class: 'word small-word' }, item.en),
    item.example ? el('div', { class: 'example', lang: 'es' }, item.example) : null,
    el('p', { class: 'muted small mt' }, 'Did you know it?'),
    ratingRow(Rating.GOOD)
  );
  bindRatingKeys();
}

// Production card: auto-grade the typed answer.
function check(value) {
  const { current: card } = session;
  const item = card.item;
  const st = getState();
  const verdict = checkAnswer(value, item);
  session.phase = 'back';
  const body = $('.flashcard');
  const typed = value.trim();

  let result, defaultRating, row;
  if (verdict === 'correct') {
    result = el('div', { class: 'result correct' },
      el('div', { class: 'headline' }, '✓ Correct'),
      el('div', { class: 'answer', lang: 'es' }, item.es));
    defaultRating = Rating.GOOD;
    row = ratingRow(defaultRating, [Rating.HARD, Rating.GOOD, Rating.EASY]);
  } else if (verdict === 'almost') {
    result = el('div', { class: 'result almost' },
      el('div', { class: 'headline' }, 'Almost. Check the accents:'),
      el('div', { class: 'answer', lang: 'es' }, item.es),
      typed ? el('div', { class: 'muted small' }, `You wrote: ${typed}`) : null);
    defaultRating = Rating.HARD;
    row = ratingRow(defaultRating, [Rating.AGAIN, Rating.HARD, Rating.GOOD]);
  } else {
    result = el('div', { class: 'result wrong' },
      el('div', { class: 'headline' }, typed ? 'Not quite. The answer is:' : 'The answer is:'),
      el('div', { class: 'answer', lang: 'es' }, item.es),
      typed ? el('div', { class: 'muted small' }, `You wrote: ${typed}`) : null);
    defaultRating = Rating.AGAIN;
    row = ratingRow(defaultRating, [Rating.AGAIN, Rating.GOOD]);
  }

  body.replaceChildren(
    el('span', { class: 'lang-tag' }, 'English'),
    el('div', { class: 'word small-word' }, item.en),
    result,
    item.example ? el('div', { class: 'example', lang: 'es' }, item.example) : null,
    row
  );
  if (st.settings.autoAudio) speak(item.es, st.settings.voice);
  bindRatingKeys();
}

const RATING_META = {
  [Rating.AGAIN]: { cls: 'again', label: 'Again', key: '1' },
  [Rating.HARD]: { cls: 'hard', label: 'Hard', key: '2' },
  [Rating.GOOD]: { cls: 'good', label: 'Good', key: '3' },
  [Rating.EASY]: { cls: 'easy', label: 'Easy', key: '4' },
};

function ratingRow(defaultRating, ratings = [Rating.AGAIN, Rating.HARD, Rating.GOOD, Rating.EASY]) {
  const { current: card, mode } = session;
  const cs = getState().cards[card.id];
  const preview = mode === 'review' ? previewIntervals(cs) : null;
  const row = el('div', { class: 'rating-row', style: `grid-template-columns: repeat(${ratings.length}, 1fr)` });
  for (const r of ratings) {
    const m = RATING_META[r];
    let sub = '';
    if (r === Rating.AGAIN) sub = 'see it again soon';
    else if (r === Rating.GOOD && mode !== 'review') sub = 'next';
    else if (preview) sub = humanInterval(preview[r]);
    row.append(
      el('button', {
        class: `rating-btn ${m.cls}${r === defaultRating ? ' is-default' : ''}`,
        dataset: { rating: r },
        onClick: () => rate(r),
      }, m.label, el('small', {}, sub), el('span', { class: 'key' }, `[${m.key}]`))
    );
  }
  return row;
}

function bindRatingKeys() {
  setKeyHandler((e) => {
    if (session.phase !== 'back') return;
    const buttons = Array.from(document.querySelectorAll('.rating-btn'));
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      (buttons.find((b) => b.classList.contains('is-default')) || buttons[0])?.click();
      return;
    }
    const idx = { 1: Rating.AGAIN, 2: Rating.HARD, 3: Rating.GOOD, 4: Rating.EASY }[e.key];
    if (idx === undefined) return;
    const b = buttons.find((x) => Number(x.dataset.rating) === idx);
    if (b) { e.preventDefault(); b.click(); }
  });
}

function rate(rating) {
  const { current: card, mode } = session;
  const st = getState();
  const first = !session.seen.has(card.id);
  const correct = rating >= Rating.HARD;

  if (first) {
    session.seen.add(card.id);
    const wasNew = mode === 'review' && !st.cards[card.id] && card.dir === DIR.REC;
    recordReview({ correct, isNew: wasNew });
    if (correct) session.correct++; else session.missed++;
  }

  if (mode === 'review') {
    st.cards[card.id] = schedule(st.cards[card.id], rating);
    save();
  }

  if (rating === Rating.AGAIN) {
    // Put it back a few cards later so you get another try this session.
    session.queue.splice(Math.min(3, session.queue.length), 0, card);
  }
  next();
}

function exitSession() {
  if (session.seen.size && session.queue.length && !confirm('Leave this session? Progress on cards you already rated is saved.')) return;
  renderSetup();
}

function renderSummary() {
  setKeyHandler(null);
  const { seen, correct, missed, mode } = session;
  const n = seen.size;
  const pct = n ? Math.round((correct / n) * 100) : 0;
  app.replaceChildren(
    el('h1', {}, '¡Muy bien!'),
    el('div', { class: 'card' },
      el('div', { class: 'stats' },
        el('div', { class: 'stat' }, el('div', { class: 'num' }, n), el('div', { class: 'label' }, 'cards')),
        el('div', { class: 'stat' }, el('div', { class: 'num' }, `${pct}%`), el('div', { class: 'label' }, 'right first try')),
        el('div', { class: 'stat' }, el('div', { class: 'num' }, missed), el('div', { class: 'label' }, 'to keep working on'))
      ),
      el('p', { class: 'muted mt' }, mode === 'review'
        ? 'Each card is now scheduled for when you are most likely to be about to forget it. Come back tomorrow.'
        : 'Practice does not move the schedule. Use Review for the daily habit.'),
      el('div', { class: 'row mt' },
        el('button', { class: 'btn btn-primary', onClick: renderSetup }, 'Back to decks'),
        el('a', { class: 'btn', href: 'index.html' }, 'Go to Hoy'))
    )
  );
  toast(`${n} cards done`);
}

function setKeyHandler(fn) {
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = fn ? (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
    fn(e);
  } : null;
  if (keyHandler) document.addEventListener('keydown', keyHandler);
}

main();
