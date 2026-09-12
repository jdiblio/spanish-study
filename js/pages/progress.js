// Progreso: streak, activity, what is weak, settings, backup.
import { $, el, initPage, toast, dateKey, DAY, startOfDay, plural } from '../app.js';
import { getState, save, streak, downloadExport, importJSON, resetAll } from '../storage.js';
import { loadDecks, DIR, cardId } from '../decks.js';
import { isMature } from '../srs.js';
import { canSpeak, spanishVoices, speak } from '../audio.js';

initPage('progress');
const app = $('#app');
let decks = [];

async function main() {
  decks = await loadDecks().catch(() => []);
  render();
  if (canSpeak()) speechSynthesis.addEventListener('voiceschanged', render, { once: true });
}

function render() {
  const st = getState();
  const days = Object.values(st.days);
  const totalReviews = days.reduce((a, d) => a + d.reviews, 0);
  const totalCorrect = days.reduce((a, d) => a + d.correct, 0);
  const accuracy = totalReviews ? Math.round((totalCorrect / totalReviews) * 100) : null;

  let known = 0, learning = 0, notStarted = 0;
  for (const deck of decks) {
    for (const item of deck.items) {
      const rec = st.cards[cardId(deck.id, item, DIR.REC)];
      const prod = st.cards[cardId(deck.id, item, DIR.PROD)];
      if (!rec && !prod) notStarted++;
      else if (isMature(rec) && isMature(prod)) known++;
      else learning++;
    }
  }

  app.replaceChildren(
    el('div', { class: 'section-title' }, el('h1', {}, 'Progreso'), el('span', { class: 'en' }, 'Progress')),
    el('div', { class: 'card' },
      el('div', { class: 'stats' },
        stat(streak(), 'day streak'),
        stat(days.filter((d) => d.reviews > 0).length, 'days studied'),
        stat(totalReviews, 'cards reviewed'),
        stat(accuracy == null ? '–' : `${accuracy}%`, 'right first try')),
      el('h3', { class: 'mt' }, 'Last six weeks'),
      heatmap(st)),
    el('div', { class: 'card' },
      el('h2', {}, 'Words'),
      el('div', { class: 'stats' },
        stat(known, 'known'),
        stat(learning, 'learning'),
        stat(notStarted, 'not started')),
      el('p', { class: 'muted small mt' }, 'A word counts as known once both directions are scheduled three or more weeks out.')),
    weakSpots(st),
    settingsCard(st),
    backupCard()
  );
}

function stat(num, label) {
  return el('div', { class: 'stat' }, el('div', { class: 'num' }, num), el('div', { class: 'label' }, label));
}

function heatmap(st) {
  const cells = [];
  const todayKey = dateKey();
  const start = startOfDay() - 41 * DAY;
  for (let i = 0; i < 42; i++) {
    const k = dateKey(new Date(start + i * DAY));
    const n = st.days[k]?.reviews || 0;
    cells.push(el('i', { class: (n ? 'on' : '') + (k === todayKey ? ' today' : ''), title: `${k}: ${plural(n, 'card')}` }));
  }
  return el('div', { class: 'heatmap' }, cells);
}

function weakSpots(st) {
  const rows = [];
  for (const [id, cs] of Object.entries(st.cards)) {
    if (!cs.lapses) continue;
    const [deckId, es, dir] = id.split('|');
    const deck = decks.find((d) => d.id === deckId);
    const item = deck?.items.find((x) => x.es === es);
    if (!item) continue;
    rows.push({ item, dir, lapses: cs.lapses, ease: cs.ease });
  }
  rows.sort((a, b) => b.lapses - a.lapses || a.ease - b.ease);
  return el('div', { class: 'card' },
    el('h2', {}, 'Weak spots'),
    rows.length
      ? el('ul', { class: 'weak-list' }, rows.slice(0, 10).map((r) => el('li', {},
          el('span', {}, el('strong', { lang: 'es' }, r.item.es), el('span', { class: 'muted' }, ` · ${r.item.en}`),
            el('span', { class: 'chip', style: 'margin-left:.5rem' }, r.dir === DIR.PROD ? 'writing' : 'reading')),
          el('span', { class: 'muted small' }, `missed ${plural(r.lapses, 'time')}`))))
      : el('p', { class: 'muted' }, 'Nothing here yet. Words you miss more than once show up here.')
  );
}

function settingsCard(st) {
  const newPerDay = el('select', { onChange: () => { st.settings.newPerDay = Number(newPerDay.value); save(); toast('Saved'); } },
    [5, 10, 15, 20, 30].map((n) => el('option', { value: n, selected: st.settings.newPerDay === n }, n)));
  const autoAudio = el('input', { type: 'checkbox', checked: st.settings.autoAudio, onChange: () => { st.settings.autoAudio = autoAudio.checked; save(); toast('Saved'); } });

  let voiceRow = null;
  if (canSpeak()) {
    const voices = spanishVoices();
    const sel = el('select', { onChange: () => { st.settings.voice = sel.value; save(); speak('Hola, ¿cómo estás?', sel.value); } },
      el('option', { value: '' }, 'Automatic'),
      voices.map((v) => el('option', { value: v.name, selected: st.settings.voice === v.name }, `${v.name} (${v.lang})`)));
    voiceRow = el('div', { class: 'row' },
      el('label', {}, 'Spanish voice'), sel,
      el('button', { class: 'btn btn-sm', onClick: () => speak('Hola, ¿cómo estás?', st.settings.voice) }, '🔊 Test'),
      voices.length ? null : el('span', { class: 'muted small' }, 'No Spanish voice found in this browser yet.'));
  }

  return el('div', { class: 'card' },
    el('h2', {}, 'Settings'),
    el('div', { class: 'stack' },
      el('div', { class: 'row' }, el('label', {}, 'New words per day'), newPerDay),
      el('label', { class: 'check' }, autoAudio, 'Play the Spanish automatically on each card'),
      voiceRow)
  );
}

function backupCard() {
  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', onChange: async () => {
    const f = fileInput.files[0];
    if (!f) return;
    try {
      importJSON(await f.text());
      toast('Progress imported');
      render();
    } catch (e) {
      alert(e.message);
    }
    fileInput.value = '';
  } });
  return el('div', { class: 'card' },
    el('h2', {}, 'Backup'),
    el('p', { class: 'muted small' }, 'Your progress is saved in this browser only. Export a backup now and then, and import it on another device to continue there.'),
    el('div', { class: 'row' },
      el('button', { class: 'btn btn-primary', onClick: () => { downloadExport(); toast('Backup downloaded'); } }, '⬇ Export backup'),
      el('button', { class: 'btn', onClick: () => fileInput.click() }, '⬆ Import backup'),
      el('button', { class: 'btn btn-ghost', onClick: () => {
        if (confirm('Erase all progress on this device? Export a backup first if you might want it back.')) { resetAll(); render(); toast('Progress reset'); }
      } }, 'Reset'),
      fileInput)
  );
}

main();
