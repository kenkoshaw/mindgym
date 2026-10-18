// Jamo in Unicode composition order, with Revised Romanization.
export const INITIALS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
export const INITIAL_RR = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];

export const MEDIALS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
export const MEDIAL_RR = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];

// Index 0 = no final. Finals romanize by how they sound at the end of a syllable.
export const FINALS = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
export const FINAL_RR = ['','k','k','k','n','n','n','t','l','k','m','l','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];

export interface Syllable {
  i: number;
  m: number;
  f: number;
}

export function compose({ i, m, f }: Syllable): string {
  return String.fromCharCode(0xac00 + (i * 21 + m) * 28 + f);
}

export function decompose(ch: string): Syllable {
  const code = ch.charCodeAt(0) - 0xac00;
  return { i: Math.floor(code / 588), m: Math.floor((code % 588) / 28), f: code % 28 };
}

export function romanize(s: Syllable): string {
  return INITIAL_RR[s.i] + MEDIAL_RR[s.m] + FINAL_RR[s.f];
}

export interface Level {
  name: string;
  initials: number[];
  medials: number[];
  finals: number[];
}

const BASIC_I = [0, 2, 3, 5, 6, 7, 9, 11, 12, 18]; // ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅎ
const BASIC_M = [0, 4, 8, 13, 18, 20, 2, 6, 12, 17]; // ㅏㅓㅗㅜㅡㅣㅑㅕㅛㅠ
const ALL_I = INITIALS.map((_, k) => k);
const ALL_M = MEDIALS.map((_, k) => k);
const SIMPLE_F = [1, 4, 7, 8, 16, 17, 19, 21]; // ㄱㄴㄷㄹㅁㅂㅅㅇ

export const LEVELS: Level[] = [
  { name: 'Basic', initials: BASIC_I, medials: BASIC_M, finals: [0] },
  { name: 'All letters', initials: ALL_I, medials: ALL_M, finals: [0] },
  { name: '+ Endings', initials: ALL_I, medials: ALL_M, finals: [0, 0, ...SIMPLE_F] },
  { name: 'Everything', initials: ALL_I, medials: ALL_M, finals: FINALS.map((_, k) => k) },
];

const rand = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

export function randomSyllable(level: Level): Syllable {
  return { i: rand(level.initials), m: rand(level.medials), f: rand(level.finals) };
}

/** Distractors that change one part, so the choice tests reading rather than guessing. */
export function distractors(s: Syllable, level: Level, n = 3): Syllable[] {
  const answer = romanize(s);
  const seen = new Set([answer]);
  const out: Syllable[] = [];
  for (let tries = 0; out.length < n && tries < 200; tries++) {
    const part = rand(level.finals.length > 1 ? ['i', 'm', 'f'] : ['i', 'm']) as keyof Syllable;
    const pool = part === 'i' ? level.initials : part === 'm' ? level.medials : level.finals;
    const d = { ...s, [part]: rand(pool) };
    const r = romanize(d);
    if (!seen.has(r)) { seen.add(r); out.push(d); }
  }
  return out;
}

export function normalise(answer: string): string {
  return answer.trim().toLowerCase().replace(/[^a-z]/g, '');
}
