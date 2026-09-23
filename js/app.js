// Shared helpers: DOM building, data loading, dates, navigation.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Build a DOM element: el('div', {class:'x', onClick: fn}, 'text', childNode) */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** Drop null/false children so append/replaceChildren never print "null". */
export const kids = (...c) => c.flat(Infinity).filter((x) => x != null && x !== false);

/** Small gray English translation to place right after a Spanish title or label. */
export function tr(en) {
  return en ? el('span', { class: 'tr', lang: 'en' }, en) : null;
}

export async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return res.json();
}

// ---------- Dates ----------
export const DAY = 86400000;

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Local date as 'YYYY-MM-DD' */
export function dateKey(d = new Date()) {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

export function parseDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysUntil(key) {
  return Math.round((startOfDay(parseDate(key)) - startOfDay()) / DAY);
}

const fmtShort = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' });
export function formatDate(key) {
  return fmtShort.format(parseDate(key));
}

export function relativeDays(n) {
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n < 0) return `${-n} days ago`;
  return `in ${n} days`;
}

export function humanInterval(days) {
  if (days < 1) return 'again';
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${(days / 30).toFixed(days < 60 ? 1 : 0)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function plural(n, one, many = one + 's') {
  return `${n} ${n === 1 ? one : many}`;
}

// ---------- Navigation ----------
const NAV = [
  ['index.html', 'Hoy', 'Today', 'hoy'],
  ['vocab.html', 'Vocabulario', 'Vocabulary', 'vocab'],
  ['verbs.html', 'Verbos', 'Verbs', 'verbs'],
  ['grammar.html', 'Gramática', 'Grammar', 'grammar'],
  ['listen.html', 'Escuchar', 'Listen & read', 'listen'],
  ['review.html', 'Repaso', 'Practice tests', 'review'],
  ['class.html', 'Clase', 'Class', 'class'],
  ['progress.html', 'Progreso', 'Progress', 'progress'],
];

export function initPage(active) {
  const host = $('#site-header');
  if (!host) return;
  host.className = 'site-header';
  host.replaceChildren(
    el('div', { class: 'container header-inner' },
      el('a', { class: 'brand', href: 'index.html' },
        el('span', { class: 'brand-icon', 'aria-hidden': 'true' }, '📚'),
        'Estudio de Español',
        el('small', { class: 'brand-en', lang: 'en' }, 'Spanish study')),
      el('nav', { class: 'nav', 'aria-label': 'Sections' },
        NAV.map(([href, label, en, key]) =>
          el('a', {
            href,
            class: 'nav-link' + (key === active ? ' active' : ''),
            'aria-current': key === active ? 'page' : null,
          }, el('span', { class: 'nav-es' }, label), el('small', { class: 'nav-en', lang: 'en' }, en))))
    )
  );
}

let toastTimer = null;
export function toast(msg, ms = 2500) {
  let t = $('.toast');
  if (!t) {
    t = el('div', { class: 'toast', role: 'status' });
    document.body.append(t);
  }
  t.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), ms);
}
