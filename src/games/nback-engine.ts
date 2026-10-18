export interface Trial {
  pos: number; // 0..8
  letter: string;
}

export const LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'];

/** Build a sequence where roughly `rate` of eligible trials match n back, per stream. */
export function makeSequence(n: number, length: number, rate = 0.3, rng = Math.random): Trial[] {
  const seq: Trial[] = [];
  for (let k = 0; k < length; k++) {
    const back = seq[k - n];
    const pos = back && rng() < rate ? back.pos : randomOther(9, back?.pos, rng);
    const li = back && rng() < rate ? LETTERS.indexOf(back.letter) : randomOther(LETTERS.length, back ? LETTERS.indexOf(back.letter) : undefined, rng);
    seq.push({ pos, letter: LETTERS[li] });
  }
  return seq;
}

function randomOther(size: number, avoid: number | undefined, rng: () => number): number {
  let v: number;
  do v = Math.floor(rng() * size); while (v === avoid);
  return v;
}

export interface Tally {
  hits: number;
  misses: number;
  falseAlarms: number;
}

/** Score one stream. responses[k] is whether the player pressed on trial k. */
export function score(seq: Trial[], n: number, key: keyof Trial, responses: boolean[]): Tally {
  const t: Tally = { hits: 0, misses: 0, falseAlarms: 0 };
  for (let k = n; k < seq.length; k++) {
    const match = seq[k][key] === seq[k - n][key];
    if (match && responses[k]) t.hits++;
    else if (match) t.misses++;
    else if (responses[k]) t.falseAlarms++;
  }
  return t;
}

/** Accuracy as hits / (hits + misses + false alarms); 1 when nothing to score. */
export function accuracy(t: Tally): number {
  const d = t.hits + t.misses + t.falseAlarms;
  return d === 0 ? 1 : t.hits / d;
}
