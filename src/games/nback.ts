import { h } from '../dom';
import { load, save, recordBest } from '../storage';
import type { Game } from '../types';
import { makeSequence, score, accuracy, type Trial, type Tally } from './nback-engine';

const STEP_MS = 2500;
const SHOW_MS = 800;

export const nback: Game = {
  id: 'nback',
  title: 'N-Back',
  blurb: 'Working memory: spot repeats from n steps ago',
  colour: '#818cf8',
  glyph: 'N',
  mount(root) {
    let n = load('nback:n', 2);
    let dual = load('nback:dual', false);
    let seq: Trial[] = [];
    let idx = -1;
    let posResp: boolean[] = [];
    let letResp: boolean[] = [];
    let timers: number[] = [];

    const nEl = h('b', {});
    const modeSeg = h('div', { class: 'seg' },
      h('button', { onclick: () => { dual = false; save('nback:dual', false); renderSetup(); } }, 'Position'),
      h('button', { onclick: () => { dual = true; save('nback:dual', true); renderSetup(); } }, 'Position + letter'),
    );
    const bestEl = h('p', { class: 'muted center', style: 'margin:0' });
    const setup = h('div', { class: 'game' },
      h('div', { class: 'card' },
        h('p', { style: 'margin-top:0' }, 'A square lights up every 2.5 seconds. Tap ', h('b', {}, 'Position'), ' when it is in the same place as ', h('i', {}, 'n'), ' steps ago.'),
        h('p', { style: 'margin-bottom:0' }, 'In dual mode a letter shows too. Tap ', h('b', {}, 'Letter'), ' when it matches the letter ', h('i', {}, 'n'), ' steps ago.'),
      ),
      h('label', { class: 'field' }, 'Mode', modeSeg),
      h('div', { class: 'btn-row', style: 'align-items:center' },
        h('button', { class: 'btn', onclick: () => setN(n - 1) }, '−'),
        h('div', { class: 'center big', style: 'flex:2' }, 'n = ', nEl),
        h('button', { class: 'btn', onclick: () => setN(n + 1) }, '+'),
      ),
      bestEl,
      h('button', { class: 'btn primary', onclick: start }, 'Start'),
    );

    const cells = Array.from({ length: 9 }, () => h('div'));
    const letterEl = h('div', { class: 'nb-letter' });
    const progress = h('b', {});
    const posBtn = h('button', { class: 'btn', onclick: () => respond('pos') }, 'Position');
    const letBtn = h('button', { class: 'btn', onclick: () => respond('letter') }, 'Letter');
    const play = h('div', { class: 'game hidden' },
      h('div', { class: 'stats' }, h('span', {}, 'n = ', h('b', {}, '')), h('span', {}, 'Trial ', progress)),
      h('div', { class: 'nb-grid' }, ...cells),
      letterEl,
      h('div', { class: 'btn-row nb-btns' }, posBtn, letBtn),
      h('button', { class: 'btn', onclick: stop }, 'Stop'),
    );
    const result = h('div', { class: 'game hidden' });
    root.append(setup, play, result);

    function setN(v: number): void {
      n = Math.min(9, Math.max(1, v));
      save('nback:n', n);
      renderSetup();
    }

    function renderSetup(): void {
      nEl.textContent = String(n);
      [...modeSeg.children].forEach((b, k) => b.setAttribute('aria-pressed', String((k === 1) === dual)));
      const best = load<number | null>(`nback:best:${dual ? 'dual' : 'pos'}`, null);
      bestEl.textContent = best === null ? '' : `Highest n passed (80%+): ${best}`;
    }

    function start(): void {
      seq = makeSequence(n, 20 + n);
      posResp = new Array(seq.length).fill(false);
      letResp = new Array(seq.length).fill(false);
      idx = -1;
      (play.querySelector('.stats b') as HTMLElement).textContent = String(n);
      letBtn.classList.toggle('hidden', !dual);
      letterEl.classList.toggle('hidden', !dual);
      setup.classList.add('hidden');
      result.classList.add('hidden');
      play.classList.remove('hidden');
      timers.push(window.setTimeout(step, 600));
    }

    function step(): void {
      idx++;
      posBtn.className = 'btn';
      letBtn.className = 'btn' + (dual ? '' : ' hidden');
      if (idx >= seq.length) return finish();
      progress.textContent = `${idx + 1}/${seq.length}`;
      const t = seq[idx];
      cells.forEach((c, k) => c.classList.toggle('on', k === t.pos));
      letterEl.textContent = dual ? t.letter : '';
      timers.push(window.setTimeout(() => { cells[t.pos].classList.remove('on'); letterEl.textContent = ''; }, SHOW_MS));
      timers.push(window.setTimeout(step, STEP_MS));
    }

    function respond(kind: 'pos' | 'letter'): void {
      if (idx < 0 || idx >= seq.length) return;
      const arr = kind === 'pos' ? posResp : letResp;
      if (arr[idx]) return;
      arr[idx] = true;
      const btn = kind === 'pos' ? posBtn : letBtn;
      const key = kind === 'pos' ? 'pos' : 'letter';
      const match = idx >= n && seq[idx][key] === seq[idx - n][key];
      btn.classList.add(match ? 'hit' : 'miss');
    }

    function clearTimers(): void {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function stop(): void {
      clearTimers();
      play.classList.add('hidden');
      setup.classList.remove('hidden');
      renderSetup();
    }

    function finish(): void {
      clearTimers();
      play.classList.add('hidden');
      const p = score(seq, n, 'pos', posResp);
      const l = dual ? score(seq, n, 'letter', letResp) : null;
      const acc = l ? Math.min(accuracy(p), accuracy(l)) : accuracy(p);
      const passed = acc >= 0.8;
      if (passed) recordBest(`nback:best:${dual ? 'dual' : 'pos'}`, n);
      const line = (name: string, t: Tally) =>
        h('div', { class: 'stats' }, h('span', {}, name), h('span', {}, `${Math.round(accuracy(t) * 100)}% · ${t.hits} hit · ${t.misses} missed · ${t.falseAlarms} wrong`));
      const suggestion = passed ? n + 1 : acc < 0.5 && n > 1 ? n - 1 : n;
      result.replaceChildren(
        h('div', { class: 'card center' },
          h('div', { class: `big ${passed ? 'good' : ''}` }, `${Math.round(acc * 100)}%`),
          h('p', { class: 'muted' }, passed ? `Passed ${n}-back.` : 'Under 80%: keep practising this level.'),
        ),
        h('div', { class: 'card game', style: 'gap:6px' }, line('Position', p), l ? line('Letter', l) : null),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn', onclick: () => { result.classList.add('hidden'); setup.classList.remove('hidden'); renderSetup(); } }, 'Settings'),
          h('button', { class: 'btn primary', onclick: () => { setN(suggestion); start(); } }, suggestion === n ? `Retry ${n}-back` : `Try ${suggestion}-back`),
        ),
      );
      result.classList.remove('hidden');
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'ArrowLeft') respond('pos');
      if (dual && (e.key === 'l' || e.key === 'ArrowRight')) respond('letter');
    };
    document.addEventListener('keydown', onKey);
    renderSetup();
    return () => { clearTimers(); document.removeEventListener('keydown', onKey); };
  },
};
