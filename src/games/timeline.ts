import { h, shuffle } from '../dom';
import { load, save, recordBest } from '../storage';
import type { Game } from '../types';
import { EVENTS, formatYear, type HistoryEvent, type Region } from '../data/events';

type Filter = 'all' | Region;
const FILTERS: [Filter, string][] = [['all', 'All'], ['east-asia', 'East Asia'], ['world', 'World']];
const SIZES = [4, 5, 6];

/** Pick n events with distinct years, so there is exactly one right order. */
export function pickRound(pool: HistoryEvent[], n: number): HistoryEvent[] {
  const years = new Set<number>();
  const out: HistoryEvent[] = [];
  for (const e of shuffle(pool)) {
    if (years.has(e.year)) continue;
    years.add(e.year);
    out.push(e);
    if (out.length === n) break;
  }
  return out;
}

export const timeline: Game = {
  id: 'timeline',
  title: 'Timeline',
  blurb: 'Put historical events in order',
  colour: '#f59e0b',
  glyph: '⏳',
  mount(root) {
    let filter = load<Filter>('timeline:filter', 'all');
    let size = load('timeline:size', 5);
    let order: HistoryEvent[] = [];
    let checked = false;
    let streak = 0;
    let rounds = 0;
    let points = 0;

    const filterSeg = h('div', { class: 'seg' });
    FILTERS.forEach(([f, label]) => filterSeg.append(h('button', { onclick: () => { filter = f; save('timeline:filter', f); streak = 0; newRound(); } }, label)));
    const sizeSeg = h('div', { class: 'seg' });
    SIZES.forEach((n) => sizeSeg.append(h('button', { onclick: () => { size = n; save('timeline:size', n); streak = 0; newRound(); } }, `${n} events`)));

    const streakEl = h('b', {}, '0');
    const scoreEl = h('b', {}, '0/0');
    const hint = h('p', { class: 'muted center', style: 'margin:0' }, 'Earliest at the top. Drag ⠿ or use the arrows.');
    const list = h('ol', { class: 'events' });
    const action = h('button', { class: 'btn primary', onclick: () => (checked ? newRound() : check()) });
    const verdict = h('div', { class: 'center big hidden' });

    root.append(
      filterSeg, sizeSeg,
      h('div', { class: 'stats' }, h('span', {}, 'Perfect streak ', streakEl), h('span', {}, 'Score ', scoreEl)),
      hint, list, verdict, action,
    );

    function newRound(): void {
      const pool = filter === 'all' ? EVENTS : EVENTS.filter((e) => e.region === filter);
      do order = pickRound(pool, size);
      while (order.every((e, k) => k === 0 || order[k - 1].year < e.year)); // never start already solved
      checked = false;
      render();
    }

    function check(): void {
      checked = true;
      const sorted = order.slice().sort((a, b) => a.year - b.year);
      const correct = order.filter((e, k) => sorted[k] === e).length;
      const perfect = correct === order.length;
      rounds++;
      points += correct;
      streak = perfect ? streak + 1 : 0;
      const best = perfect && recordBest(`timeline:streak:${filter}:${size}`, streak);
      verdict.className = `center big ${perfect ? 'good' : ''}`;
      verdict.textContent = perfect ? (best ? `Perfect! New best streak: ${streak}` : 'Perfect!') : `${correct} of ${order.length} in the right place`;
      render();
    }

    function move(from: number, to: number): void {
      if (checked || to < 0 || to >= order.length) return;
      const [e] = order.splice(from, 1);
      order.splice(to, 0, e);
      render();
    }

    function render(): void {
      [...filterSeg.children].forEach((b, k) => b.setAttribute('aria-pressed', String(FILTERS[k][0] === filter)));
      [...sizeSeg.children].forEach((b, k) => b.setAttribute('aria-pressed', String(SIZES[k] === size)));
      streakEl.textContent = String(streak);
      scoreEl.textContent = `${points}/${rounds * size}`;
      verdict.classList.toggle('hidden', !checked);
      action.textContent = checked ? 'Next round' : 'Check order';
      const sorted = order.slice().sort((a, b) => a.year - b.year);
      list.replaceChildren(...order.map((e, k) => {
        const item = h('li', { class: 'event' + (checked ? (sorted[k] === e ? ' ok' : ' ko') : ''), 'data-idx': k },
          checked ? null : h('span', { class: 'grip', 'aria-hidden': 'true' }, '⠿'),
          h('span', { class: 'label' }, e.label),
          checked ? h('span', { class: 'year' }, formatYear(e)) : h('span', { class: 'moves' },
            h('button', { 'aria-label': 'Move up', onclick: () => move(k, k - 1) }, '▲'),
            h('button', { 'aria-label': 'Move down', onclick: () => move(k, k + 1) }, '▼'),
          ),
        );
        if (!checked) enableDrag(item);
        return item;
      }));
    }

    function enableDrag(item: HTMLElement): void {
      const grip = item.querySelector('.grip') as HTMLElement;
      let startY = 0;
      grip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        grip.setPointerCapture(e.pointerId);
        startY = e.clientY;
        item.classList.add('dragging');
      });
      grip.addEventListener('pointermove', (e) => {
        if (!item.classList.contains('dragging')) return;
        let dy = e.clientY - startY;
        const next = item.nextElementSibling as HTMLElement | null;
        const prev = item.previousElementSibling as HTMLElement | null;
        if (next && dy > next.offsetHeight / 2) {
          list.insertBefore(next, item);
          startY += next.offsetHeight + 8;
        } else if (prev && dy < -prev.offsetHeight / 2) {
          list.insertBefore(item, prev);
          startY -= prev.offsetHeight + 8;
        }
        dy = e.clientY - startY;
        item.style.transform = `translateY(${dy}px)`;
      });
      const end = () => {
        if (!item.classList.contains('dragging')) return;
        item.classList.remove('dragging');
        item.style.transform = '';
        const prev = order;
        order = [...list.children].map((el) => prev[Number((el as HTMLElement).dataset.idx)]);
        render();
      };
      grip.addEventListener('pointerup', end);
      grip.addEventListener('pointercancel', end);
    }

    newRound();
    return () => {};
  },
};
