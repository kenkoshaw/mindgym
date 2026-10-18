import { h, shuffle } from '../dom';
import { load, save, recordBest } from '../storage';
import type { Game } from '../types';
import {
  LEVELS, INITIALS, INITIAL_RR, MEDIALS, MEDIAL_RR, FINALS, FINAL_RR,
  compose, romanize, randomSyllable, distractors, normalise, type Syllable,
} from './hangul-engine';

const ROUND_MS = 60_000;
type Mode = 'choice' | 'type';

export const hangul: Game = {
  id: 'hangul',
  title: 'Hangul Speed-Read',
  blurb: 'Read Korean syllables against the clock',
  colour: '#f472b6',
  glyph: '한',
  mount(root) {
    let levelIdx = load('hangul:level', 0);
    let mode: Mode = load<Mode>('hangul:mode', 'choice');
    let timer = 0;
    let endAt = 0;
    let score = 0;
    let streak = 0;
    let current: Syllable;
    let log: { ch: string; rr: string; ok: boolean; given?: string }[] = [];

    const levelSeg = h('div', { class: 'seg' });
    LEVELS.forEach((l, k) => levelSeg.append(h('button', { onclick: () => { levelIdx = k; save('hangul:level', k); renderSetup(); } }, l.name)));
    const modeSeg = h('div', { class: 'seg' },
      h('button', { onclick: () => { mode = 'choice'; save('hangul:mode', mode); renderSetup(); } }, 'Multiple choice'),
      h('button', { onclick: () => { mode = 'type'; save('hangul:mode', mode); renderSetup(); } }, 'Type it'),
    );
    const bestEl = h('p', { class: 'muted center' });
    const chart = h('div', { class: 'card hidden' });
    const setup = h('div', { class: 'game' },
      h('label', { class: 'field' }, 'Level', levelSeg),
      h('label', { class: 'field' }, 'Answer by', modeSeg),
      bestEl,
      h('button', { class: 'btn primary', onclick: start }, 'Start 60s round'),
      h('button', { class: 'btn', onclick: () => chart.classList.toggle('hidden') }, 'Letter chart'),
      chart,
    );

    const bar = h('div');
    const scoreEl = h('b', {}, '0');
    const streakEl = h('b', {}, '0');
    const flash = h('div', { class: 'flash', lang: 'ko' });
    const choices = h('div', { class: 'choices' });
    const input = h('input', { class: 'answer-input', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'romanization', enterkeyhint: 'go' });
    const feedback = h('div', { class: 'center muted', style: 'min-height:1.5em' });
    const play = h('div', { class: 'game hidden' },
      h('div', { class: 'timer-bar' }, bar),
      h('div', { class: 'stats' }, h('span', {}, 'Score ', scoreEl), h('span', {}, 'Streak ', streakEl)),
      flash, choices, input, feedback,
    );

    const result = h('div', { class: 'game hidden' });
    root.append(setup, play, result);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') answer(normalise(input.value));
    });

    chart.append(...([
      ['Consonants (start)', INITIALS, INITIAL_RR],
      ['Vowels', MEDIALS, MEDIAL_RR],
      ['Endings', FINALS.slice(1), FINAL_RR.slice(1)],
    ] as [string, string[], string[]][]).map(([title, jamo, rr]) => h('div', {},
      h('strong', {}, title),
      h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:6px;margin:8px 0 14px', lang: 'ko' },
        ...jamo.map((j, k) => h('div', { class: 'center' }, h('div', { class: 'big' }, j), h('div', { class: 'muted' }, rr[k] || '(silent)'))),
      ),
    )));

    function renderSetup(): void {
      [...levelSeg.children].forEach((b, k) => b.setAttribute('aria-pressed', String(k === levelIdx)));
      [...modeSeg.children].forEach((b, k) => b.setAttribute('aria-pressed', String((k === 0) === (mode === 'choice'))));
      const best = load<number | null>(`hangul:best:${levelIdx}:${mode}`, null);
      bestEl.textContent = best === null ? 'No score yet at this level' : `Best: ${best}`;
    }

    function start(): void {
      score = 0; streak = 0; log = [];
      endAt = Date.now() + ROUND_MS;
      setup.classList.add('hidden');
      result.classList.add('hidden');
      play.classList.remove('hidden');
      choices.classList.toggle('hidden', mode !== 'choice');
      input.classList.toggle('hidden', mode !== 'type');
      feedback.textContent = '';
      next();
      timer = window.setInterval(() => {
        const left = endAt - Date.now();
        bar.style.width = `${Math.max(0, (left / ROUND_MS) * 100)}%`;
        if (left <= 0) finish();
      }, 200);
      if (mode === 'type') input.focus();
    }

    function next(): void {
      const level = LEVELS[levelIdx];
      let s: Syllable;
      do s = randomSyllable(level); while (current && compose(s) === compose(current));
      current = s;
      flash.textContent = compose(s);
      scoreEl.textContent = String(score);
      streakEl.textContent = String(streak);
      if (mode === 'choice') {
        const opts = shuffle([s, ...distractors(s, level)]);
        choices.replaceChildren(...opts.map((o) => {
          const rr = romanize(o);
          return h('button', { class: 'btn', onclick: (e: Event) => answer(rr, e.currentTarget as HTMLElement) }, rr);
        }));
      } else {
        input.value = '';
      }
    }

    let locked = false;
    function answer(given: string, btn?: HTMLElement): void {
      if (locked || !given) return;
      const rr = romanize(current);
      const ok = given === rr;
      log.push({ ch: compose(current), rr, ok, given });
      if (ok) { score++; streak++; feedback.textContent = ''; }
      else { streak = 0; feedback.innerHTML = ''; feedback.append(h('span', { class: 'bad' }, `${compose(current)} = ${rr}`)); }
      if (btn) {
        btn.classList.add(ok ? 'right' : 'wrong');
        if (!ok) [...choices.children].find((c) => c.textContent === rr)?.classList.add('right');
        locked = true;
        setTimeout(() => { locked = false; if (Date.now() < endAt) next(); }, ok ? 180 : 700);
      } else next();
    }

    function finish(): void {
      clearInterval(timer);
      play.classList.add('hidden');
      const isBest = recordBest(`hangul:best:${levelIdx}:${mode}`, score);
      const misses = log.filter((l) => !l.ok);
      result.replaceChildren(
        h('div', { class: 'card center' },
          h('div', { class: 'big' }, `${score} correct`),
          h('p', { class: 'muted' }, `${log.length} attempted${isBest && score > 0 ? ' · new best!' : ''}`),
        ),
        ...(misses.length
          ? [h('div', { class: 'card' }, h('strong', {}, 'Review'),
              h('div', { class: 'review', lang: 'ko' }, ...misses.map((m) => h('div', {}, h('span', { class: 'big' }, m.ch), h('span', {}, h('span', { class: 'good' }, m.rr), ' ', h('span', { class: 'muted' }, `(you: ${m.given})`))))))]
          : []),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn', onclick: () => { result.classList.add('hidden'); setup.classList.remove('hidden'); renderSetup(); } }, 'Change level'),
          h('button', { class: 'btn primary', onclick: start }, 'Again'),
        ),
      );
      result.classList.remove('hidden');
    }

    renderSetup();
    return () => clearInterval(timer);
  },
};
