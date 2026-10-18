export interface Game {
  id: string;
  title: string;
  blurb: string;
  colour: string;
  glyph: string;
  /** Render into root; return a cleanup function. */
  mount(root: HTMLElement): () => void;
}
