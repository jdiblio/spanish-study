// Hoy (Today): what to study now, what is due in class, one study tip.
import { $, el, loadJSON, initPage, daysUntil, formatDate, relativeDays, plural } from '../app.js';
import { streak, studiedToday } from '../storage.js';
import { loadDecks, buildReviewQueue } from '../decks.js';
import { TYPES } from '../resources.js';

initPage('hoy');
const app = $('#app');

const TIPS = [
  'Short daily sessions beat long weekend ones. Ten minutes today is worth more than an hour on Sunday.',
  'Say the word out loud before you flip the card. Speaking it recruits one more memory channel.',
  'When you miss a card, read the example sentence. Words stick better inside a sentence than alone.',
  'Typing the Spanish is harder than recognizing it. That difficulty is the point. It is what tests ask for.',
  'Mix units when you practice. Switching topics feels harder but builds stronger memories.',
  'Review right before sleep and again in the morning. Sleep consolidates what you studied.',
  'Listen to a Señor Wooly song once without reading, then once with the lyrics, then practice its vocabulary.',
  'Getting a card wrong and then right is not a failure. It is exactly how the memory gets built.',
  'Rate yourself honestly on flashcards. "Again" costs a minute now and saves a blank on the test.',
];

async function main() {
  const [unitsData, decks] = await Promise.all([
    loadJSON('data/units.json').catch(() => ({ units: [] })),
    loadDecks().catch(() => []),
  ]);
  const q = buildReviewQueue(decks);
  const dueCards = q.due.length + q.newProd.length;
  const newWords = q.newRec.length;
  const total = dueCards + newWords;
  const days = streak();
  const done = studiedToday();
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const tip = TIPS[dayOfYear % TIPS.length];
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  const upcoming = [];
  for (const u of unitsData.units || []) {
    for (const r of u.resources || []) {
      if (!r.due) continue;
      const d = daysUntil(r.due);
      if (d >= -3 && d <= 21) upcoming.push({ ...r, unit: u, days: d });
    }
  }
  upcoming.sort((a, b) => a.days - b.days);

  let reviewText;
  if (!decks.length) reviewText = 'No vocabulary yet. It appears here once class materials are added.';
  else if (done && !total) reviewText = 'All caught up for today. ¡Excelente!';
  else if (!total) reviewText = 'Nothing scheduled today. A quick practice round still counts toward your streak.';

  app.replaceChildren(
    el('div', { class: 'hero' },
      el('div', {},
        el('h1', {}, `${greeting} 👋`),
        el('p', { class: 'muted' }, new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(today))),
      el('span', { class: `chip streak${days ? ' amber' : ''}` },
        `🔥 ${plural(days, 'day')} streak${done || !days ? '' : ' · study today to keep it'}`)
    ),
    el('div', { class: 'card' },
      el('h2', {}, "Today's review"),
      total
        ? el('div', { class: 'stats' },
            el('div', { class: 'stat' }, el('div', { class: 'num' }, dueCards), el('div', { class: 'label' }, 'cards due')),
            el('div', { class: 'stat' }, el('div', { class: 'num' }, newWords), el('div', { class: 'label' }, 'new words')))
        : el('p', { class: 'muted' }, reviewText),
      el('div', { class: 'row mt' },
        total
          ? el('a', { class: 'btn btn-primary btn-lg', href: 'vocab.html?start=review' }, `Start review (${total})`)
          : el('a', { class: 'btn btn-lg', href: 'vocab.html' }, 'Practice a deck'),
        el('span', { class: 'muted small' }, 'About 10 minutes'))
    ),
    el('div', { class: 'card' },
      el('h2', {}, 'Coming up in class'),
      upcoming.length
        ? el('ul', { class: 'due-list' }, upcoming.map((r) => el('li', {},
            el('span', { 'aria-hidden': 'true' }, (TYPES[r.type] || TYPES.link).icon),
            el('a', { class: 't', href: `class.html#unit-${r.unit.id}` }, r.title),
            el('span', { class: 'muted small' }, r.unit.title),
            el('span', { class: r.days < 0 ? 'badge-overdue' : r.days <= 2 ? 'badge-due' : 'muted small' },
              `${formatDate(r.due)} · ${r.days < 0 ? 'overdue' : relativeDays(r.days)}`))))
        : el('p', { class: 'muted' }, 'No due dates in the next three weeks.')
    ),
    el('div', { class: 'card' }, el('h2', {}, 'Study tip'), el('p', { class: 'tip' }, tip))
  );
}

main();
