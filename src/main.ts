import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { h } from './dom';
import type { Game } from './types';
import { hangul } from './games/hangul';
import { timeline } from './games/timeline';
import { nback } from './games/nback';
import { digitSpan } from './games/digitspan';

registerSW({ immediate: true });

const games: Game[] = [hangul, timeline, nback, digitSpan];
const app = document.getElementById('app')!;
let cleanup: (() => void) | null = null;

function renderHome(): void {
  app.replaceChildren(
    h('header', { class: 'home-head' }, h('h1', {}, 'Mind Gym'), h('p', { class: 'muted' }, 'Works offline. Add to home screen.')),
    h(
      'nav',
      { class: 'tiles' },
      ...games.map((g) =>
        h(
          'a',
          { class: 'tile', href: `#/${g.id}`, style: `--tile:${g.colour}` },
          h('span', { class: 'tile-glyph', 'aria-hidden': 'true' }, g.glyph),
          h('span', { class: 'tile-text' }, h('strong', {}, g.title), h('span', {}, g.blurb)),
        ),
      ),
    ),
  );
}

function renderGame(game: Game): void {
  const body = h('main', { class: 'game' });
  app.replaceChildren(
    h(
      'header',
      { class: 'game-head', style: `--tile:${game.colour}` },
      h('a', { class: 'back', href: '#/', 'aria-label': 'Back to games' }, '‹'),
      h('h1', {}, game.title),
    ),
    body,
  );
  cleanup = game.mount(body);
}

function route(): void {
  cleanup?.();
  cleanup = null;
  const id = location.hash.replace(/^#\/?/, '');
  const game = games.find((g) => g.id === id);
  if (game) renderGame(game);
  else renderHome();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
