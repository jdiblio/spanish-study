// Escuchar y ver: songs and videos by unit, each with its vocabulary deck.
import { $, el, loadJSON, initPage } from '../app.js';
import { resourceCard, MEDIA_TYPES } from '../resources.js';

initPage('listen');
const app = $('#app');

async function main() {
  let data;
  try {
    data = await loadJSON('data/units.json');
  } catch (e) {
    app.replaceChildren(el('p', { class: 'error' }, e.message));
    return;
  }
  const sections = (data.units || [])
    .map((u) => ({ unit: u, media: (u.resources || []).filter((r) => MEDIA_TYPES.includes(r.type)) }))
    .filter((s) => s.media.length);

  app.replaceChildren(
    el('div', { class: 'section-title' }, el('h1', {}, 'Escuchar y ver'), el('span', { class: 'en' }, 'Listen & watch')),
    el('div', { class: 'card' },
      el('h2', {}, 'How to get the most out of a song or video'),
      el('ol', { class: 'muted', style: 'margin:0; padding-left:1.25rem' },
        el('li', {}, 'Watch or listen once without reading anything. Just try to follow the story.'),
        el('li', {}, 'Watch again with the lyrics or subtitles. Notice the words you did not catch.'),
        el('li', {}, 'Practice its vocabulary deck (button on each card).'),
        el('li', {}, 'A few days later, watch it a third time. You will catch much more.'))),
    ...(sections.length
      ? sections.map(({ unit, media }) => el('section', { class: 'unit mt', id: `unit-${unit.id}` },
          el('h2', {}, unit.title),
          el('div', { class: 'grid' }, media.map(resourceCard))))
      : [el('div', { class: 'card empty mt' }, 'No songs or videos yet.')])
  );
}

main();
