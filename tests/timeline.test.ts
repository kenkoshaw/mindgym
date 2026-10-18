import { describe, it, expect } from 'vitest';
import { EVENTS } from '../src/data/events';
import { pickRound } from '../src/games/timeline';

describe('timeline', () => {
  it('rounds have distinct years', () => {
    for (let k = 0; k < 200; k++) {
      const r = pickRound(EVENTS, 6);
      expect(new Set(r.map((e) => e.year)).size).toBe(6);
    }
  });
  it('event labels are unique', () => {
    expect(new Set(EVENTS.map((e) => e.label)).size).toBe(EVENTS.length);
  });
});
