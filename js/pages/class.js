// Clase: the raw class materials by unit.
import { $, el, tr, loadJSON, initPage } from '../app.js';
import { resourceCard } from '../resources.js';

initPage('class');
const app = $('#app');

async function main() {
  let data;
  try {
    data = await loadJSON('data/units.json');
  } catch (e) {
    app.replaceChildren(el('p', { class: 'error' }, e.message));
    return;
  }
  const units = data.units || [];

  app.replaceChildren(
    el('div', { class: 'section-title' }, el('h1', {}, 'Clase'), el('span', { class: 'en' }, 'Class materials')),
    el('p', { class: 'muted' }, 'Slides, assignments, and links from class, organized by unit.'),
    ...(units.length
      ? units.map(unitSection)
      : [el('div', { class: 'card empty' }, 'No units yet.')])
  );

  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView({ block: 'start' });
  }
}

function unitSection(u) {
  const resources = [...(u.resources || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return el('section', { class: 'unit mt', id: `unit-${u.id}` },
    el('div', { class: 'unit-head' },
      el('h2', {}, u.title, tr(u.titleEn)),
      (u.decks || []).map((d) => el('a', { class: 'btn btn-sm', href: `vocab.html?deck=${encodeURIComponent(d)}` }, '🃏 Practice vocabulary'))),
    u.description ? el('p', { class: 'muted' }, u.description) : null,
    resources.length
      ? el('div', { class: 'grid' }, resources.map(resourceCard))
      : el('p', { class: 'muted small' }, 'No materials in this unit yet.')
  );
}

main();
