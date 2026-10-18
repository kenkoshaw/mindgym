import { describe, it, expect } from 'vitest';
import { compose, decompose, romanize, distractors, LEVELS } from '../src/games/hangul-engine';

const rr = (ch: string) => romanize(decompose(ch));

describe('hangul', () => {
  it('composes and decomposes', () => {
    expect(compose({ i: 18, m: 0, f: 4 })).toBe('한');
    expect(decompose('글')).toEqual({ i: 0, m: 18, f: 8 });
  });

  it.each([
    ['한', 'han'], ['글', 'geul'], ['서', 'seo'], ['울', 'ul'], ['강', 'gang'],
    ['밖', 'bak'], ['꽃', 'kkot'], ['닭', 'dak'], ['의', 'ui'], ['쯤', 'jjeum'], ['외', 'oe'],
  ])('%s → %s', (ch, want) => {
    expect(rr(ch)).toBe(want);
  });

  it('distractors are distinct from answer and each other', () => {
    for (const level of LEVELS) {
      for (let k = 0; k < 50; k++) {
        const s = { i: level.initials[0], m: level.medials[0], f: level.finals[0] };
        const d = distractors(s, level).map(romanize);
        expect(new Set([romanize(s), ...d]).size).toBe(d.length + 1);
        expect(d.length).toBe(3);
      }
    }
  });
});
