// Repaso: practice tests modeled on the class's real practice test.
// Take the whole test on one page, submit, then see the score and every correction.
import { $, el, kids, tr, loadJSON, initPage, toast, shuffle, plural } from '../app.js';
import { getState, save, recordReview } from '../storage.js';
import { checkAnswer } from '../decks.js';
import { accentKeys, insertAtCursor } from '../ui.js';

initPage('review');
const app = $('#app');
const params = new URLSearchParams(location.search);
let tests = [];
let current = null; // { test, items, lastInput, submitted }

async function main() {
  try {
    const index = await loadJSON('data/tests.json');
    tests = await Promise.all((index.tests || []).map(async (t) => ({ ...t, ...(await loadJSON(t.file)) })));
  } catch (e) {
    app.replaceChildren(el('p', { class: 'error' }, e.message));
    return;
  }
  const t = tests.find((x) => x.id === params.get('test'));
  if (t) startTest(t); else renderList();
}

function countPoints(t) {
  return (t.sections || []).reduce((a, s) => a + s.questions.reduce((b, q) => b + (q.type === 'match' ? q.pairs.length : 1), 0), 0);
}

// ---------- List ----------
function renderList() {
  history.replaceState(null, '', 'review.html');
  const st = getState();
  app.replaceChildren(
    el('div', { class: 'section-title' }, el('h1', {}, 'Repaso'), el('span', { class: 'en' }, 'Practice tests')),
    el('p', { class: 'muted' }, 'Practice tests built to match the real one: same sections and kinds of questions, different items from the slides. Take one like a real test, then check every correction.'),
    tests.length
      ? el('div', { class: 'grid' }, tests.map((t) => {
          const r = st.tests?.[t.id];
          return el('div', { class: 'card resource' },
            el('div', {},
              el('div', { class: 'resource-title' }, t.title, tr(t.titleEn)),
              el('div', { class: 'resource-meta' },
                t.source ? el('span', {}, t.source) : null,
                el('span', {}, plural(countPoints(t), 'point')),
                r ? el('span', { class: r.best >= 90 ? 'chip green' : 'chip amber' }, `best ${r.best}%`) : null)),
            t.description ? el('p', { class: 'muted small' }, t.description) : null,
            el('div', { class: 'resource-actions' },
              el('button', { class: 'btn btn-sm btn-primary', onClick: () => startTest(t) }, 'Take the test')));
        }))
      : el('div', { class: 'card empty' }, 'No practice tests yet. They appear here once a class practice test has been added.')
  );
}

// ---------- Taking a test ----------
function startTest(t) {
  history.replaceState(null, '', `review.html?test=${encodeURIComponent(t.id)}`);
  current = { test: t, items: [], lastInput: null, submitted: false };
  let n = 0;
  const sections = (t.sections || []).map((s) => el('section', { class: 'card test-section' },
    el('h2', {}, s.title, tr(s.titleEn)),
    s.instructions ? el('p', { class: 'muted small' }, s.instructions) : null,
    s.text?.length
      ? el('div', { class: 'reading section-reading', lang: 'es' },
          s.textTitle ? el('h3', {}, s.textTitle, tr(s.textTitleEn)) : null,
          s.text.map((p) => el('p', {}, p)))
      : null,
    s.bank?.length ? el('div', { class: 'bank' }, el('span', { class: 'muted small' }, s.bankTitle || 'Word bank:'), s.bank.map((w) => el('span', { class: 'chip', lang: 'es' }, w))) : null,
    s.questions.map((q) => renderQuestion(q, ++n))
  ));

  app.replaceChildren(...kids(
    el('button', { class: 'btn btn-ghost btn-sm', onClick: () => confirmLeave() && renderList() }, '← All tests'),
    el('h1', {}, t.title, tr(t.titleEn)),
    t.description ? el('p', { class: 'muted' }, t.description) : null,
    t.instructions ? el('p', { class: 'muted small' }, t.instructions) : null,
    sections,
    el('div', { class: 'row mt', id: 'submit-row' },
      el('button', { class: 'btn btn-primary btn-lg', onClick: submit }, 'Submit test'),
      el('span', { class: 'muted small' }, `${plural(countPoints(t), 'point')} · accents count`)),
    accentBar()
  ));
  app.addEventListener('focusin', trackInput);
  window.scrollTo(0, 0);
}

function confirmLeave() {
  return current?.submitted || !current || confirm('Leave this test? Your answers will not be saved.');
}

function trackInput(e) {
  const t = e.target;
  if (t && (t.classList.contains('test-input') || t.classList.contains('test-textarea'))) current.lastInput = t;
}

function accentBar() {
  const proxy = {
    get value() { return current.lastInput?.value ?? ''; },
    set value(v) { if (current.lastInput) current.lastInput.value = v; },
    get selectionStart() { return current.lastInput?.selectionStart ?? 0; },
    get selectionEnd() { return current.lastInput?.selectionEnd ?? 0; },
    setSelectionRange(a, b) { current.lastInput?.setSelectionRange(a, b); },
    focus() { current.lastInput?.focus(); },
  };
  return el('div', { class: 'accent-bar' }, accentKeys(proxy), el('span', { class: 'hint' }, 'click a box, then an accent'));
}

function qHeader(q, n) {
  return el('div', { class: 'qtext' + (q.long ? ' long' : '') },
    el('span', { class: 'qnum' }, `${n}.`),
    el('span', { lang: q.lang === 'en' ? 'en' : 'es' }, q.q),
    q.qEn ? tr(q.qEn) : null,
    q.note ? el('div', { class: 'muted small', style: 'font-weight:400; margin-top:.2rem' }, q.note) : null);
}

function renderQuestion(q, n) {
  const wrap = el('div', { class: 'question', dataset: { n } });
  let item;
  switch (q.type) {
    case 'mc': item = mcQuestion(q, n, wrap); break;
    case 'tf': item = tfQuestion(q, n, wrap); break;
    case 'fill':
    case 'translate': item = typedQuestion(q, n, wrap); break;
    case 'match': item = matchQuestion(q, n, wrap); break;
    case 'write': item = writeQuestion(q, n, wrap); break;
    default:
      wrap.append(qHeader(q, n), el('p', { class: 'error' }, `Unknown question type: ${q.type}`));
      item = { q, n, grade: () => ({ points: 0, max: 0, given: '', correct: true }), mark() {} };
  }
  current.items.push(item);
  return wrap;
}

function resultBox(state, correctAnswer, given, extra) {
  const cls = state === 'ok' ? 'correct' : state === 'half' ? 'almost' : 'wrong';
  const mark = state === 'ok' ? '✓' : state === 'half' ? '½' : '✗';
  return el('div', { class: `result ${cls}` },
    el('div', { class: 'headline' }, el('span', { class: `checkmark ${state === 'ok' ? 'ok' : state === 'half' ? 'half' : 'bad'}` }, mark), ' ',
      state === 'ok' ? 'Correct' : state === 'half' ? 'Half credit: check the accents' : 'Incorrect'),
    state !== 'ok' ? el('div', { class: 'answer', lang: 'es' }, correctAnswer) : null,
    state !== 'ok' && given ? el('div', { class: 'muted given' }, `You wrote: ${given}`) : null,
    extra ? el('div', { class: 'small' }, extra) : null);
}

function mcQuestion(q, n, wrap) {
  const name = `q${n}`;
  const opts = q.keepOrder ? [...q.options] : shuffle([...q.options]);
  const inputs = [];
  wrap.append(qHeader(q, n), el('div', {}, opts.map((o) => {
    const inp = el('input', { type: 'radio', name, value: o });
    inputs.push(inp);
    return el('label', { class: 'choice' }, inp, el('span', { lang: 'es' }, o));
  })));
  return {
    q, n,
    grade() {
      const given = inputs.find((i) => i.checked)?.value || '';
      return { points: given === q.answer ? 1 : 0, max: 1, given, correct: given === q.answer };
    },
    mark(r) { inputs.forEach((i) => (i.disabled = true)); wrap.append(resultBox(r.correct ? 'ok' : 'bad', q.answer, r.given, q.explain)); },
  };
}

function tfQuestion(q, n, wrap) {
  const name = `q${n}`;
  const inputs = [];
  const [yes, no] = q.labels || ['Cierto', 'Falso'];
  wrap.append(qHeader(q, n), el('div', { class: 'tf-row' }, [[yes, 'true'], [no, 'false']].map(([es, en]) => {
    const inp = el('input', { type: 'radio', name, value: es });
    inputs.push(inp);
    return el('label', { class: 'choice' }, inp, el('span', { lang: 'es' }, es), tr(en));
  })));
  const want = q.answer ? yes : no;
  return {
    q, n,
    grade() {
      const given = inputs.find((i) => i.checked)?.value || '';
      return { points: given === want ? 1 : 0, max: 1, given, correct: given === want };
    },
    mark(r) { inputs.forEach((i) => (i.disabled = true)); wrap.append(resultBox(r.correct ? 'ok' : 'bad', want, r.given, q.explain)); },
  };
}

function typedQuestion(q, n, wrap) {
  const strict = q.type === 'fill' ? q.strict !== false : q.strict === true;
  const inp = el('input', { type: 'text', class: 'test-input', lang: 'es', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: q.placeholder || (q.type === 'translate' ? 'Write it in Spanish' : 'Your answer') });
  wrap.append(qHeader(q, n), inp);
  return {
    q, n,
    grade() {
      const given = inp.value.trim();
      const verdict = checkAnswer(given, { es: q.answer, alt: q.alt || [] }, { strict });
      const points = verdict === 'correct' ? 1 : verdict === 'almost' ? 0.5 : 0;
      return { points, max: 1, given, correct: verdict === 'correct', verdict };
    },
    mark(r) { inp.disabled = true; wrap.append(resultBox(r.verdict === 'correct' ? 'ok' : r.verdict === 'almost' ? 'half' : 'bad', q.answer, r.given, q.explain)); },
  };
}

function matchQuestion(q, n, wrap) {
  const rights = shuffle(q.pairs.map((p) => p.r));
  const rows = q.pairs.map((p) => {
    const sel = el('select', {}, el('option', { value: '' }, '— choose —'), rights.map((r) => el('option', { value: r }, r)));
    return { p, sel, row: el('div', { class: 'match-row' }, el('span', { class: 'l', lang: 'es' }, p.l), sel) };
  });
  wrap.append(qHeader(q, n), el('div', {}, rows.map((r) => r.row)));
  return {
    q, n,
    grade() {
      const ok = rows.filter((r) => r.sel.value === r.p.r).length;
      return { points: ok, max: rows.length, given: rows.map((r) => r.sel.value), correct: ok === rows.length };
    },
    mark(r) {
      rows.forEach((row) => {
        row.sel.disabled = true;
        const good = row.sel.value === row.p.r;
        row.row.append(...kids(el('span', { class: `checkmark ${good ? 'ok' : 'bad'}` }, good ? '✓' : '✗'), good ? null : el('span', { class: 'muted small', lang: 'es' }, `→ ${row.p.r}`)));
      });
    },
  };
}

function writeQuestion(q, n, wrap) {
  const lang = q.lang === 'en' ? 'en' : 'es';
  const ta = el('textarea', { class: 'test-textarea', lang, rows: q.rows || 5, placeholder: q.placeholder || (lang === 'en' ? 'Write it in English' : 'Write it in Spanish') });
  wrap.append(qHeader(q, n), q.rubric?.length ? el('ul', { class: 'muted small', style: 'margin:.25rem 0 .5rem; padding-left:1.25rem' }, q.rubric.map((x) => el('li', {}, x))) : null, ta);
  let selfCheck = null;
  return {
    q, n,
    grade() {
      const given = ta.value.trim();
      // Free writing is self-graded after seeing the model answer; starts at 0 until checked.
      return { points: selfCheck?.checked ? 1 : 0, max: 1, given, correct: !!selfCheck?.checked, self: true };
    },
    mark(r) {
      ta.disabled = true;
      selfCheck = el('input', { type: 'checkbox', onChange: () => rescore() });
      wrap.append(el('div', { class: 'result' },
        el('div', { class: 'headline' }, 'Model answer'),
        el('div', { class: 'answer model', lang: q.lang === 'en' ? 'en' : 'es' }, q.model),
        q.modelEn ? el('div', { class: 'muted small' }, q.modelEn) : null,
        el('label', { class: 'check mt' }, selfCheck, 'My answer covers the same things (count it as correct)')));
    },
  };
}

// ---------- Submit & results ----------
function submit() {
  const unanswered = current.items.filter((it) => { const g = it.grade(); return !g.given || (Array.isArray(g.given) && g.given.some((x) => !x)); }).length;
  if (unanswered && !confirm(`${plural(unanswered, 'question')} unanswered. Submit anyway?`)) return;
  current.submitted = true;
  const results = current.items.map((it) => { const r = it.grade(); it.mark(r); it.last = r; return r; });
  for (const r of results) if (!r.self) recordReview({ correct: r.correct });
  $('#submit-row')?.remove();
  $('.accent-bar')?.remove();
  rescore(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function rescore(first = false) {
  const t = current.test;
  const results = current.items.map((it) => it.grade());
  const points = results.reduce((a, r) => a + r.points, 0);
  const max = results.reduce((a, r) => a + r.max, 0);
  const score = max ? Math.round((points / max) * 100) : 0;
  const st = getState();
  st.tests = st.tests || {};
  const rec = st.tests[t.id] || { best: 0, attempts: 0 };
  if (first) rec.attempts++;
  rec.best = Math.max(rec.best, score);
  rec.last = Date.now();
  st.tests[t.id] = rec;
  save();

  const [head, headEn] = score === 100 ? ['¡Perfecto!', 'Perfect!'] : score >= 80 ? ['¡Muy bien!', 'Very good!'] : score >= 60 ? ['Bien', 'Good'] : ['Sigue practicando', 'Keep practicing'];
  const missed = current.items.filter((it) => !it.grade().correct);
  const card = el('div', { class: 'card score-card', id: 'score-card' },
    el('h2', {}, head, tr(headEn)),
    el('div', { class: 'big-score' }, `${score}%`),
    el('p', { class: 'muted' }, `${points} of ${max} points · best ${rec.best}%`),
    missed.length ? el('p', { class: 'muted small' }, `Scroll down to see the ${plural(missed.length, 'correction')}. Missed questions: ${missed.map((it) => it.n).join(', ')}.`) : el('p', { class: 'muted small' }, 'Nothing missed.'),
    el('div', { class: 'row', style: 'justify-content:center' },
      el('button', { class: 'btn btn-primary', onClick: () => startTest(t) }, 'Try again'),
      el('button', { class: 'btn', onClick: renderList }, 'All tests'))
  );
  const old = $('#score-card');
  if (old) old.replaceWith(card); else app.querySelector('h1').after(card);
  if (first) toast(`${score}% on ${t.title}`);
}

main();
