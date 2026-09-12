// Class resource cards (slides, assignments, songs, videos, links) shared by the Clase and Escuchar pages.
import { el, daysUntil, formatDate, relativeDays } from './app.js';

export const TYPES = {
  slides: { icon: '📊', label: 'Slides' },
  assignment: { icon: '📝', label: 'Assignment' },
  wooly: { icon: '🎵', label: 'Señor Wooly', open: 'Open on Señor Wooly' },
  edpuzzle: { icon: '🎬', label: 'Edpuzzle', open: 'Open on Edpuzzle' },
  youtube: { icon: '▶️', label: 'Video', open: 'Open on YouTube' },
  quizlet: { icon: '🃏', label: 'Quizlet', open: 'Open on Quizlet' },
  notes: { icon: '📒', label: 'Notes' },
  link: { icon: '🔗', label: 'Link', open: 'Open link' },
};

export const MEDIA_TYPES = ['wooly', 'edpuzzle', 'youtube'];

export function youtubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0];
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const m = u.pathname.match(/\/(embed|shorts|live)\/([^/?]+)/);
    if (m) return m[2];
  } catch (e) { /* not a URL */ }
  return null;
}

export function dueBadge(due) {
  if (!due) return null;
  const d = daysUntil(due);
  const cls = d < 0 ? 'badge-overdue' : d <= 2 ? 'badge-due' : 'muted';
  return el('span', { class: cls }, `Due ${formatDate(due)} · ${d < 0 ? 'overdue' : relativeDays(d)}`);
}

/** One resource card. Viewers (PDF, video) open below the card inside the same grid. */
export function resourceCard(r) {
  const t = TYPES[r.type] || TYPES.link;
  const card = el('div', { class: 'card resource' });
  let viewer = null;

  function toggleViewer(build) {
    if (viewer) { viewer.remove(); viewer = null; return; }
    viewer = el('div', { class: 'viewer' }, build(),
      el('div', { class: 'row mt' }, el('button', { class: 'btn btn-sm', onClick: () => toggleViewer(build) }, 'Close')));
    card.after(viewer);
    viewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const actions = [];
  if (r.file) {
    const isPdf = /\.pdf$/i.test(r.file);
    if (isPdf) {
      actions.push(el('button', { class: 'btn btn-sm btn-primary', onClick: () => toggleViewer(() => el('iframe', { class: 'pdf-frame', src: `${r.file}#view=FitH`, title: r.title })) }, 'View'));
    }
    actions.push(el('a', { class: 'btn btn-sm', href: r.file, target: '_blank', rel: 'noopener' }, isPdf ? 'Open in new tab' : 'Download'));
  }
  if (r.url) {
    const yt = r.type === 'youtube' ? youtubeId(r.url) : null;
    if (yt) {
      actions.push(el('button', { class: 'btn btn-sm btn-primary', onClick: () => toggleViewer(() => el('iframe', {
        class: 'video-frame', src: `https://www.youtube-nocookie.com/embed/${yt}`, title: r.title,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture', allowfullscreen: true,
      })) }, 'Watch here'));
    }
    if (r.embed) {
      actions.push(el('button', { class: 'btn btn-sm btn-primary', onClick: () => toggleViewer(() => el('iframe', { class: 'embed-frame', src: r.embed, title: r.title })) }, 'Open here'));
    }
    actions.push(el('a', { class: `btn btn-sm${actions.length ? '' : ' btn-primary'}`, href: r.url, target: '_blank', rel: 'noopener' }, t.open || 'Open'));
  }
  if (r.deck) {
    actions.push(el('a', { class: 'btn btn-sm', href: `vocab.html?deck=${encodeURIComponent(r.deck)}` }, '🃏 Practice its vocab'));
  }

  card.append(
    el('div', { class: 'resource-head' },
      el('span', { class: 'resource-icon', 'aria-hidden': 'true' }, t.icon),
      el('div', {},
        el('div', { class: 'resource-title' }, r.title),
        el('div', { class: 'resource-meta' },
          el('span', {}, t.label),
          r.date ? el('span', {}, formatDate(r.date)) : null,
          dueBadge(r.due)),
        r.note ? el('div', { class: 'muted small' }, r.note) : null)),
    actions.length ? el('div', { class: 'resource-actions' }, actions) : null
  );
  return card;
}
