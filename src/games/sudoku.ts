import { h, formatTime } from '../dom';
import { load, save, recordBest } from '../storage';
import type { Game } from '../types';
import { generate, PEERS, type Difficulty, type Grid } from './sudoku-engine';

interface State {
  difficulty: Difficulty;
  puzzle: Grid;
  solution: Grid;
  values: Grid;
  notes: number[]; // bitmask per cell
  elapsed: number;
  mistakes: number;
  done: boolean;
}

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

function fresh(difficulty: Difficulty): State {
  const { puzzle, solution } = generate(difficulty);
  return { difficulty, puzzle, solution, values: puzzle.slice(), notes: new Array(81).fill(0), elapsed: 0, mistakes: 0, done: false };
}

export const sudoku: Game = {
  id: 'sudoku',
  title: 'Sudoku',
  blurb: 'Fresh random puzzle every time',
  colour: '#5eead4',
  glyph: '9',
  mount(root) {
    let state: State = load<State | null>('sudoku:state', null) ?? fresh(load<Difficulty>('sudoku:level', 'easy'));
    let selected = state.values.findIndex((v) => v === 0);
    let notesMode = false;
    let started = Date.now();

    const levelSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' });
    const timeEl = h('b', {}, '0:00');
    const mistakesEl = h('b', {}, '0');
    const board = h('div', { class: 'sudoku', role: 'grid' });
    const pad = h('div', { class: 'pad' });
    const notesBtn = h('button', { class: 'btn', onclick: () => { notesMode = !notesMode; render(); } }, 'Notes');
    const message = h('div', { class: 'card center hidden' });

    const cells = Array.from({ length: 81 }, (_, i) =>
      h('div', { class: 'cell', role: 'gridcell', onclick: () => { selected = i; render(); } }),
    );
    board.append(...cells);
    for (let d = 1; d <= 9; d++) pad.append(h('button', { class: 'btn', onclick: () => enter(d) }, String(d)));

    for (const lvl of LEVELS) {
      levelSeg.append(h('button', { onclick: () => newGame(lvl) }, lvl[0].toUpperCase() + lvl.slice(1)));
    }

    root.append(
      levelSeg,
      h('div', { class: 'stats' }, h('span', {}, 'Time ', timeEl), h('span', {}, 'Mistakes ', mistakesEl)),
      board,
      pad,
      h(
        'div',
        { class: 'btn-row' },
        notesBtn,
        h('button', { class: 'btn', onclick: erase }, 'Erase'),
        h('button', { class: 'btn', onclick: hint }, 'Hint'),
      ),
      message,
    );

    function persist(): void {
      save('sudoku:state', { ...state, elapsed: currentElapsed() });
    }

    function currentElapsed(): number {
      return state.done ? state.elapsed : state.elapsed + (Date.now() - started);
    }

    function newGame(lvl: Difficulty): void {
      if (!state.done && state.values.some((v, i) => v && !state.puzzle[i]) && !confirm('Start a new puzzle? This one will be lost.')) return;
      save('sudoku:level', lvl);
      state = fresh(lvl);
      started = Date.now();
      selected = state.values.findIndex((v) => v === 0);
      persist();
      render();
    }

    function enter(d: number): void {
      if (state.done || selected < 0 || state.puzzle[selected]) return;
      if (notesMode) {
        if (state.values[selected]) return;
        state.notes[selected] ^= 1 << d;
      } else {
        if (state.values[selected] === d) return;
        state.values[selected] = d;
        state.notes[selected] = 0;
        if (d !== state.solution[selected]) state.mistakes++;
        else for (const p of PEERS[selected]) state.notes[p] &= ~(1 << d);
        checkWin();
      }
      persist();
      render();
    }

    function erase(): void {
      if (state.done || selected < 0 || state.puzzle[selected]) return;
      state.values[selected] = 0;
      state.notes[selected] = 0;
      persist();
      render();
    }

    function hint(): void {
      if (state.done) return;
      let i = selected >= 0 && state.values[selected] !== state.solution[selected] ? selected : -1;
      if (i < 0) i = state.values.findIndex((v, k) => v !== state.solution[k]);
      if (i < 0) return;
      state.values[i] = state.solution[i];
      state.notes[i] = 0;
      state.mistakes++;
      selected = i;
      checkWin();
      persist();
      render();
    }

    function checkWin(): void {
      if (state.values.every((v, i) => v === state.solution[i])) {
        state.elapsed = currentElapsed();
        state.done = true;
        const best = recordBest(`sudoku:best:${state.difficulty}`, state.elapsed, false);
        message.replaceChildren(
          h('div', { class: 'big good' }, 'Solved!'),
          h('p', {}, `${formatTime(state.elapsed)} · ${state.mistakes} mistake${state.mistakes === 1 ? '' : 's'}${best ? ' · new best' : ''}`),
          h('button', { class: 'btn primary', onclick: () => newGame(state.difficulty) }, 'Next puzzle'),
        );
      }
    }

    function render(): void {
      [...levelSeg.children].forEach((b, i) => b.setAttribute('aria-pressed', String(LEVELS[i] === state.difficulty)));
      notesBtn.classList.toggle('primary', notesMode);
      notesBtn.textContent = notesMode ? 'Notes on' : 'Notes';
      mistakesEl.textContent = String(state.mistakes);
      message.classList.toggle('hidden', !state.done);
      const selVal = selected >= 0 ? state.values[selected] : 0;
      const peers = new Set(selected >= 0 ? PEERS[selected] : []);
      const counts = new Array(10).fill(0);
      state.values.forEach((v, i) => { if (v && v === state.solution[i]) counts[v]++; });

      cells.forEach((cell, i) => {
        const v = state.values[i];
        cell.className = 'cell';
        if (state.puzzle[i]) cell.classList.add('given');
        if (peers.has(i)) cell.classList.add('peer');
        if (selVal && v === selVal) cell.classList.add('same');
        if (i === selected) cell.classList.add('sel');
        if (v && v !== state.solution[i]) cell.classList.add('err');
        if (v) cell.textContent = String(v);
        else if (state.notes[i]) {
          const grid = h('div', { class: 'notes' });
          for (let d = 1; d <= 9; d++) grid.append(h('span', {}, state.notes[i] & (1 << d) ? String(d) : ''));
          cell.replaceChildren(grid);
        } else cell.textContent = '';
      });
      [...pad.children].forEach((b, i) => b.classList.toggle('done', counts[i + 1] === 9));
    }

    const tick = setInterval(() => { timeEl.textContent = formatTime(currentElapsed()); }, 500);

    const onKey = (e: KeyboardEvent) => {
      if (/^[1-9]$/.test(e.key)) enter(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') erase();
      else if (e.key === 'n') { notesMode = !notesMode; render(); }
      else if (e.key.startsWith('Arrow') && selected >= 0) {
        const r = Math.floor(selected / 9), c = selected % 9;
        const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key] ?? [0, 0];
        selected = ((r + dr + 9) % 9) * 9 + ((c + dc + 9) % 9);
        render();
        e.preventDefault();
      }
    };
    const onHide = () => {
      if (document.hidden) { persist(); state.elapsed = currentElapsed(); started = Date.now(); }
      else started = Date.now();
    };
    // While hidden the clock is paused: elapsed is banked on hide, and restarts on show.
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onHide);

    if (state.done) checkWin();
    render();

    return () => {
      persist();
      clearInterval(tick);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onHide);
    };
  },
};
