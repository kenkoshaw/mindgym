# Mind Gym

Offline brain games for your phone: memory, thinking and facts. Sudoku now lives in its own app: [kenkoshaw/sudoku](https://github.com/kenkoshaw/sudoku). It is a Progressive Web App (PWA), so once installed it works without a connection.

Live: https://kenkoshaw.github.io/mindgym/

## Games

| Game | What it trains |
| --- | --- |
| Hangul Speed-Read | Reading Korean. 60-second rounds: read a syllable block and pick or type its romanisation. 4 levels plus a letter chart. |
| Timeline | History. Put 4–6 events in date order. Filter by East Asia or world history. |
| N-Back | Working memory. Spot squares (and letters, in dual mode) that match the one *n* steps back. |
| Digit Span | Short-term memory. Repeat a growing string of digits forwards or backwards. |

Progress and best scores are stored on the device (localStorage).

## Install on your phone

1. Open the live link in Safari (iPhone) or Chrome (Android).
2. iPhone: tap **Share → Add to Home Screen**. Android: tap **⋮ → Install app**.
3. Open it once while online. After that it works offline.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests (vitest)
npm run build    # type-check and build to dist/
```

To test on your phone over Wi-Fi, run `npm run dev -- --host` and open the network URL it prints.

Pushing to `main` runs tests, builds, and deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Layout

- `src/main.ts`: home screen and hash router
- `src/games/*.ts`: one file per game; `*-engine.ts` files hold the testable logic
- `src/data/events.ts`: history events for Timeline (add more here)
- `tests/`: unit tests for the engines
