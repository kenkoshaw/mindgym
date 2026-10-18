import { describe, it, expect } from 'vitest';
import { makeSequence, score } from '../src/games/nback-engine';

describe('n-back', () => {
  it('sequence has some matches but not all', () => {
    let matches = 0, eligible = 0;
    for (let r = 0; r < 200; r++) {
      const seq = makeSequence(2, 22);
      for (let k = 2; k < seq.length; k++) { eligible++; if (seq[k].pos === seq[k - 2].pos) matches++; }
    }
    expect(matches / eligible).toBeGreaterThan(0.2);
    expect(matches / eligible).toBeLessThan(0.45);
  });

  it('scores hits, misses, false alarms', () => {
    const seq = [0, 1, 0, 2, 2].map((pos) => ({ pos, letter: 'C' }));
    // n=2: k=2 match (0,0), k=3 no (1 vs 2), k=4 no (0 vs 2)
    expect(score(seq, 2, 'pos', [false, false, true, true, false])).toEqual({ hits: 1, misses: 0, falseAlarms: 1 });
    expect(score(seq, 2, 'pos', [false, false, false, false, false])).toEqual({ hits: 0, misses: 1, falseAlarms: 0 });
  });
});
