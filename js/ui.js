// Small shared UI pieces.
import { el } from './app.js';

const ACCENTS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'];

/** Row of buttons that insert Spanish characters into the given input. */
export function accentKeys(input) {
  return el('div', { class: 'accent-keys' },
    ACCENTS.map((ch) => el('button', { type: 'button', tabindex: '-1', onClick: () => insertAtCursor(input, ch) }, ch))
  );
}

export function insertAtCursor(input, ch) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.value = input.value.slice(0, start) + ch + input.value.slice(end);
  input.setSelectionRange(start + 1, start + 1);
  input.focus();
}
