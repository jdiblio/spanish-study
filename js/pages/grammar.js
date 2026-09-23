// Gramática: one short explanation per rule, then typed practice built from the class exercises.
import { $, el, tr, loadJSON, initPage, toast, shuffle, plural } from '../app.js';
import { getState, save, recordReview } from '../storage.js';
import { checkAnswer } from '../decks.js';
import { accentKeys } from '../ui.js';

initPage('grammar');
const app = $('#app');
const params = new URLSearchParams(location.search);
let topics = [];
let session = null;

async function main() {
  try {
    const index = await loadJSON('data/grammar.json');
    topics = await Promise.all((index.topics || []).map(async (t) => ({ ...t, ...(await loadJSON(t.file)) })));
  } catch (e) {
    app.replaceChildren(el('p', { class: 'error' }, e.message));
    return;
  }
  const t = topics.find((x) => x.id === params.get('topic'));
  if (t) renderTopic(t); else renderList();
}

function renderList() {
  history.replaceState(null, '', 'grammar.html');
  const st = getState();
  app.replaceChildren(
    el('div', { class: 'section-title' }, el('h1', {}, 'Gramática'), el('span', { class: 'en' }, 'Grammar')),
    el('p', { class: 'muted' }, 'The rules from class. Each one has a short explanation and typed practice built from the exercises on the slides and worksheets.'),
    topics.length
      ? el('div', { class: 'grid' }, topics.map((t) => {
          const g = st.grammar?.[t.id];
          return el('div', { class: 'card resource' },
            el('div', {},
              el('div', { class: 'resource-title' }, t.title, tr(t.titleEn)),
              el('div', { class: 'resource-meta' },
                el('span', {}, t.source),
                el('span', {}, plural(t.items.length, 'question')),
                g ? el('span', { class: g.best >= 90 ? 'chip green' : 'chip amber' }, `best ${g.best}%`) : null)),
            el('p', { class: 'muted small' }, t.summary),
            el('div', { class: 'resource-actions' },
              el('button', { class: 'btn btn-sm btn-primary', onClick: () => renderTopic(t) }, 'Learn & practice')));
        }))
      : el('div', { class: 'card empty' }, 'No grammar topics yet.')
  );
}

function renderTopic(t) {
  history.replaceState(null, '', `grammar.html?topic=${encodeURIComponent(t.id)}`);
  const g = getState().grammar?.[t.id];
  app.replaceChildren(
    el('button', { class: 'btn btn-ghost btn-sm', onClick: renderList }, '← All topics'),
    el('h1', {}, t.title, tr(t.titleEn)),
    el('p', { class: 'muted small' }, t.source),
    el('div', { class: 'card' },
      el('h2', {}, 'The rule'),
      (t.explanation || []).map((p) => el('p', {}, p)),
      t.examples?.length
        ? el('table', { class: 'examples' }, el('tbody', {}, t.examples.map((ex) =>
            el('tr', {}, el('td', { lang: 'es' }, ex.es), el('td', { class: 'muted' }, ex.en)))))
        : null),
    el('div', { class: 'card' },
      el('h2', {}, 'Practice'),
      el('p', { class: 'muted small' }, `${plural(t.items.length, 'question')} from the class exercises. Type the answer. Accents count.`),
      el('div', { class: 'row' },
        el('button', { class: 'btn btn-primary btn-lg', onClick: () => startPractice(t) }, 'Start practice'),
        g ? el('span', { class: 'muted small' }, `Best: ${g.best}% · ${plural(g.attempts, 'attempt')}`) : null))
  );
}

function startPractice(t) {
  session = { topic: t, queue: shuffle([...t.items]), total: t.items.length, done: 0, correct: 0, missed: [] };
  next();
}

function next() {
  if (!session.queue.length) return summary();
  const item = session.queue.shift();
  const t = session.topic;
  const input = el('input', {
    class: 'answer-input', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', lang: 'es',
    placeholder: 'Type the answer',
  });
  const form = el('form', { class: 'answer-form', onSubmit: (e) => { e.preventDefault(); check(item, input.value); } },
    input,
    accentKeys(input),
    el('div', { class: 'actions' },
      el('button', { class: 'btn btn-primary', type: 'submit' }, 'Check'),
      el('button', { class: 'btn btn-ghost', type: 'button', onClick: () => check(item, '') }, "I don't know")));

  app.replaceChildren(
    el('div', { class: 'session-top' },
      el('button', { class: 'btn btn-ghost btn-sm', onClick: () => renderTopic(t) }, '✕ Exit'),
      el('div', { class: 'progress' }, el('i', { style: `width:${(session.done / session.total) * 100}%` })),
      el('span', { class: 'muted small' }, `${session.done}/${session.total}`)),
    el('div', { class: 'row' }, el('span', { class: 'chip' }, t.title)),
    el('div', { class: 'card flashcard' },
      el('span', { class: 'lang-tag' }, item.instruction || t.instruction || 'Fill in the blank'),
      el('div', { class: 'word small-word', lang: 'es' }, item.prompt),
      item.hint ? el('div', { class: 'note' }, item.hint) : null,
      form)
  );
  setTimeout(() => input.focus(), 0);
}

function check(item, value) {
  const verdict = checkAnswer(value, { es: item.answer, alt: item.alt || [] }, { strict: true });
  const ok = verdict === 'correct';
  const typed = value.trim();
  session.done++;
  if (ok) session.correct++; else session.missed.push(item);
  recordReview({ correct: ok });

  const cls = ok ? 'correct' : verdict === 'almost' ? 'almost' : 'wrong';
  const headline = ok ? '✓ Correct' : verdict === 'almost' ? 'Almost. Check the accents:' : (typed ? 'Not quite. The answer is:' : 'The answer is:');
  const nextBtn = el('button', { class: 'btn btn-primary btn-lg', onClick: next }, 'Next');
  $('.flashcard').replaceChildren(
    el('span', { class: 'lang-tag' }, 'Answer'),
    el('div', { class: 'word small-word', lang: 'es' }, item.prompt),
    el('div', { class: `result ${cls}` },
      el('div', { class: 'headline' }, headline),
      el('div', { class: 'answer', lang: 'es' }, item.answer),
      typed && !ok ? el('div', { class: 'muted small' }, `You wrote: ${typed}`) : null,
      item.hint && !ok ? el('div', { class: 'small' }, item.hint) : null),
    el('div', { class: 'actions' }, nextBtn),
    el('div', { class: 'kbd-hint' }, el('kbd', {}, 'Enter'), ' for next')
  );
  nextBtn.focus();
}

function summary() {
  const { topic: t, total, correct, missed } = session;
  const score = total ? Math.round((correct / total) * 100) : 0;
  const st = getState();
  st.grammar = st.grammar || {};
  const g = st.grammar[t.id] || { best: 0, attempts: 0 };
  g.best = Math.max(g.best, score);
  g.attempts++;
  g.last = Date.now();
  st.grammar[t.id] = g;
  save();

  const [head, headEn] = score === 100 ? ['¡Perfecto!', 'Perfect!'] : score >= 80 ? ['¡Muy bien!', 'Very good!'] : ['Sigue así', 'Keep going'];
  app.replaceChildren(
    el('h1', {}, head, tr(headEn)),
    el('div', { class: 'card' },
      el('div', { class: 'stats' },
        el('div', { class: 'stat' }, el('div', { class: 'num' }, `${score}%`), el('div', { class: 'label' }, t.title)),
        el('div', { class: 'stat' }, el('div', { class: 'num' }, `${correct}/${total}`), el('div', { class: 'label' }, 'correct')),
        el('div', { class: 'stat' }, el('div', { class: 'num' }, `${g.best}%`), el('div', { class: 'label' }, 'best'))),
      missed.length
        ? el('div', { class: 'mt' },
            el('h3', {}, 'To review'),
            el('ul', { class: 'weak-list' }, missed.map((m) => el('li', {},
              el('span', { lang: 'es' }, m.prompt),
              el('strong', { lang: 'es' }, m.answer)))))
        : el('p', { class: 'muted mt' }, 'Nothing missed. Try the next rule.'),
      el('div', { class: 'row mt' },
        el('button', { class: 'btn btn-primary', onClick: () => startPractice(t) }, 'Practice again'),
        el('button', { class: 'btn', onClick: renderList }, 'All topics')))
  );
  toast(`${score}% on ${t.title}`);
}

main();
