import { h } from '../dom';
import { load, save, recordBest } from '../storage';
import type { Game } from '../types';

type Dir = 'forward' | 'backward';
const SHOW_MS = 800;
const GAP_MS = 250;

export const digitSpan: Game = {
  id: 'digits',
  title: 'Digit Span',
  blurb: 'Remember a growing string of digits',
  colour: '#4ade80',
  glyph: '7',
  mount(root) {
    let dir = load<Dir>('digits:dir', 'forward');
    let length = 3;
    let fails = 0;
    let target: number[] = [];
    let entry: number[] = [];
    let timers: number[] = [];

    const dirSeg = h('div', { class: 'seg' },
      h('button', { onclick: () => setDir('forward') }, 'Forward'),
      h('button', { onclick: () => setDir('backward') }, 'Backward'),
    );
    const bestEl = h('p', { class: 'muted center', style: 'margin:0' });
    const setup = h('div', { class: 'game' },
      h('div', { class: 'card' },
        h('p', { style: 'margin:0' }, 'Digits appear one at a time. Type them back in the same order (forward) or reversed (backward). Each success adds a digit; two misses in a row ends the game.'),
      ),
      h('label', { class: 'field' }, 'Order', dirSeg),
      bestEl,
      h('button', { class: 'btn primary', onclick: start }, 'Start'),
    );

    const lenEl = h('b', {});
    const prompt = h('div', { class: 'center muted' });
    const digitsEl = h('div', { class: 'digits' });
    const entryEl = h('div', { class: 'entry' });
    const keypad = h('div', { class: 'keypad hidden' });
    for (const k of [1, 2, 3, 4, 5, 6, 7, 8, 9]) keypad.append(h('button', { class: 'btn', onclick: () => type(k) }, String(k)));
    keypad.append(
      h('button', { class: 'btn', onclick: () => { entry.pop(); renderEntry(); } }, '⌫'),
      h('button', { class: 'btn', onclick: () => type(0) }, '0'),
      h('button', { class: 'btn primary', onclick: submit }, '✓'),
    );
    const play = h('div', { class: 'game hidden' },
      h('div', { class: 'stats' }, h('span', {}, 'Length ', lenEl), h('span', {}, dir)),
      prompt, digitsEl, entryEl, keypad,
    );
    const result = h('div', { class: 'game hidden' });
    root.append(setup, play, result);

    function setDir(d: Dir): void {
      dir = d;
      save('digits:dir', d);
      renderSetup();
    }

    function renderSetup(): void {
      [...dirSeg.children].forEach((b, k) => b.setAttribute('aria-pressed', String((k === 0) === (dir === 'forward'))));
      const best = load<number | null>(`digits:best:${dir}`, null);
      bestEl.textContent = best === null ? '' : `Best span: ${best}`;
    }

    function start(): void {
      length = 3;
      fails = 0;
      (play.querySelector('.stats span:last-child') as HTMLElement).textContent = dir === 'forward' ? 'Forward' : 'Backward';
      setup.classList.add('hidden');
      result.classList.add('hidden');
      play.classList.remove('hidden');
      round();
    }

    function round(): void {
      lenEl.textContent = String(length);
      target = [];
      for (let k = 0; k < length; k++) {
        let d: number;
        do d = Math.floor(Math.random() * 10); while (d === target[k - 1]);
        target.push(d);
      }
      entry = [];
      renderEntry();
      keypad.classList.add('hidden');
      prompt.textContent = 'Watch…';
      digitsEl.className = 'digits';
      target.forEach((d, k) => {
        const t0 = 700 + k * (SHOW_MS + GAP_MS);
        timers.push(window.setTimeout(() => { digitsEl.textContent = String(d); }, t0));
        timers.push(window.setTimeout(() => { digitsEl.textContent = ''; }, t0 + SHOW_MS));
      });
      timers.push(window.setTimeout(() => {
        prompt.textContent = dir === 'forward' ? 'Type them in order' : 'Type them in reverse';
        keypad.classList.remove('hidden');
      }, 700 + length * (SHOW_MS + GAP_MS)));
    }

    function type(d: number): void {
      if (entry.length >= length) return;
      entry.push(d);
      renderEntry();
      if (entry.length === length) submit();
    }

    function renderEntry(): void {
      entryEl.textContent = entry.join(' ') || ' ';
    }

    function submit(): void {
      if (keypad.classList.contains('hidden')) return;
      const want = dir === 'forward' ? target : target.slice().reverse();
      const ok = entry.length === want.length && entry.every((d, k) => d === want[k]);
      keypad.classList.add('hidden');
      digitsEl.className = `digits ${ok ? 'good' : 'bad'}`;
      digitsEl.textContent = ok ? '✓' : '✗';
      prompt.textContent = ok ? '' : `It was ${want.join(' ')}`;
      if (ok) { fails = 0; length++; }
      else fails++;
      timers.push(window.setTimeout(() => (fails >= 2 ? finish() : round()), ok ? 700 : 1800));
    }

    function finish(): void {
      play.classList.add('hidden');
      const span = length - 1;
      const isBest = span >= 3 && recordBest(`digits:best:${dir}`, span);
      result.replaceChildren(
        h('div', { class: 'card center' },
          h('div', { class: 'big' }, `Span: ${span < 3 ? 'under 3' : span}`),
          h('p', { class: 'muted' }, `Most adults manage 5–9 forward, 4–7 backward.${isBest ? ' New best!' : ''}`),
        ),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn', onclick: () => { result.classList.add('hidden'); setup.classList.remove('hidden'); renderSetup(); } }, 'Settings'),
          h('button', { class: 'btn primary', onclick: start }, 'Again'),
        ),
      );
      result.classList.remove('hidden');
    }

    const onKey = (e: KeyboardEvent) => {
      if (keypad.classList.contains('hidden')) return;
      if (/^[0-9]$/.test(e.key)) type(Number(e.key));
      else if (e.key === 'Backspace') { entry.pop(); renderEntry(); }
      else if (e.key === 'Enter') submit();
    };
    document.addEventListener('keydown', onKey);
    renderSetup();
    return () => { timers.forEach(clearTimeout); document.removeEventListener('keydown', onKey); };
  },
};
