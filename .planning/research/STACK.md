# Technology Stack

**Project:** Blackjack
**Researched:** 2026-03-16

## Recommended Stack

### Core Platform

| Technology | Version / Spec | Purpose | Why |
|------------|----------------|---------|-----|
| HTML5 | Living Standard | Page structure, semantic layout | Only option for vanilla browser game; use `<template>` elements for card markup cloning |
| CSS3 with Custom Properties | Living Standard | Styling, layout, animation timing sync | Custom properties (`--bj-anim-deal-duration`, etc.) let the `ANIM` constants block set values once and have CSS consume them; no build step needed |
| JavaScript (ES2022+) | ES Modules | Game logic, state management, DOM manipulation | ES modules (`<script type="module">`) give proper file separation without bundlers; all evergreen browsers support them |

**Confidence: HIGH** -- These are browser standards, not libraries. They do not deprecate.

### Animation System

| Technology | Purpose | Why This, Not That |
|------------|---------|---------------------|
| **Web Animations API (WAAPI)** | Card deal sequences, flip animations, chip movements | Programmatic control over timing, sequencing, and callbacks. `element.animate()` returns an `Animation` object with a `.finished` promise, which is essential for the AnimationManager's queue -- you can `await animation.finished` to chain sequential card deals. CSS transitions cannot do this without fragile `transitionend` listeners. |
| **CSS `transition`** | Hover states, button feedback, simple UI state changes | For non-sequenced, fire-and-forget visual feedback (button hover, chip highlight), CSS transitions are simpler and more performant than WAAPI. Use for anything that does not need programmatic chaining. |
| **CSS `transform` + `opacity`** | The actual animated properties | `transform` and `opacity` are compositor-only properties -- they animate on the GPU without triggering layout or paint. Never animate `top`/`left`/`width`/`height` for card positions; always use `transform: translate()`. |
| **CSS Custom Properties** | Shared timing constants | Define `--bj-anim-deal-ms: 300` in `:root`, read in JS via `getComputedStyle`. The `ANIM` constants block writes to `:root` style on init, making JS the single source of truth while CSS consumes the values. |

**Confidence: HIGH** -- WAAPI has been fully supported in Chrome, Firefox, Safari, and Edge since 2022. The `.finished` promise pattern is the standard approach for sequenced animations without libraries.

#### What NOT to use for animations

| Avoid | Why |
|-------|-----|
| `requestAnimationFrame` manual loops | Reinvents what WAAPI provides. Only use rAF for a custom game loop if you need frame-by-frame physics, which blackjack does not. |
| CSS `@keyframes` for sequenced card deals | No programmatic completion callback. You would need `animationend` event listeners with manual counters to sequence a 4-card deal. WAAPI's `.finished` promise is cleaner. |
| `setTimeout` / `setInterval` for animation timing | Drift-prone, not tied to actual animation completion, breaks when tab is backgrounded. WAAPI handles all of this internally. |
| GreenSock (GSAP) or any animation library | Violates the no-dependencies constraint and is overkill for card game animations. WAAPI covers every need here. |

### Data Persistence

| Technology | Purpose | Why |
|------------|---------|-----|
| **`localStorage`** | Primary stats persistence | Synchronous, zero-setup, works in every browser, survives tab close. For a single-player local game storing JSON stats (a few KB), localStorage is the correct choice. Use `JSON.stringify` / `JSON.parse` with a versioned schema key like `bj-stats-v1`. |

**Confidence: HIGH** -- localStorage is the standard for small local persistence in no-backend browser apps.

#### What NOT to use for persistence

| Avoid | Why |
|-------|-----|
| **File System Access API** | Requires user to click a file picker every session (no persistent permission grants). The UX is terrible for a game -- player opens the game and gets a "choose save file" dialog before they can play. Also Chromium-only (no Firefox, limited Safari). The PROJECT.md mentions this as an option but localStorage should be the primary with no fallback needed. |
| **IndexedDB** | Designed for large structured data (images, blobs, offline app caches). Blackjack stats are a few KB of JSON. IndexedDB's async transaction API adds complexity for zero benefit at this data scale. |
| **Cookies** | 4KB limit, sent with HTTP requests (irrelevant here but bad practice), clunky API. |
| **Cache API / Service Worker** | For offline-first web apps, not for game state. Massive over-engineering. |

#### localStorage schema strategy

Store under a single key with a version field:

```javascript
const STORAGE_KEY = 'bj-stats-v1';

// Shape
{
  version: 1,
  lifetime: { handsPlayed, totalEarnings, winStreak, ... },
  sessions: [
    { date, handsPlayed, earnings, rounds: [...] }
  ]
}
```

If the schema ever changes, bump to `bj-stats-v2` and write a migration function that reads v1 and writes v2. This avoids silent data corruption.

### File Structure

| Approach | Recommendation |
|----------|----------------|
| **ES Modules with `<script type="module">`** | YES -- use this |
| Single monolithic HTML file | NO -- unmaintainable past 500 lines |
| Multiple `<script>` tags with global variables | NO -- pollutes global scope, load-order fragile |
| Bundler (Vite, webpack, etc.) | NO -- violates project constraint |

#### Recommended file layout

```
blackjack/
  index.html              # Entry point, minimal markup, loads main.js as module
  css/
    variables.css          # CSS custom properties (colors, timing, sizing)
    layout.css             # Table, card positions, betting area
    cards.css              # Card face styling, flip transform
    animations.css         # CSS transition definitions for non-sequenced effects
    ui.css                 # Buttons, stats panel, modals
  js/
    main.js                # Entry module, initializes game
    constants.js           # ANIM timing, bet limits, game rules -- single source of truth
    game/
      GameState.js         # Current hand state, deck, bets, dealer/player hands
      Deck.js              # Shoe creation, shuffle, draw
      DealerAI.js          # Hit/stand logic with irrational deviation
      Rules.js             # Hand evaluation, blackjack detection, bust check, payout calc
    ui/
      Renderer.js          # DOM updates, card element creation from <template>
      AnimationManager.js  # WAAPI queue, sequential deal, flip, discard sequences
      SoundManager.js      # No-op stubs, plays audio when files are present
      InputHandler.js      # Button click handlers, bet input
    stats/
      StatsManager.js      # localStorage read/write, schema migration
      StatsView.js         # Stats/history panel rendering
  assets/
    cards/                 # Card face images (user-supplied)
    sounds/                # Audio files (user-supplied, initially empty)
```

**Why this structure:**
- ES modules enforce explicit dependency trees (`import`/`export`) -- no hidden globals
- Each file has one responsibility, making it easy for the user to swap assets or adjust a single system
- The `constants.js` file is the single tuning point the PROJECT.md calls for
- `<script type="module">` defers by default, so no need for `DOMContentLoaded` wrappers
- Works by opening `index.html` directly in browser (`file://` protocol) -- ES modules work on `file://` in all modern browsers

**Confidence: HIGH** -- ES modules without build tools is the standard vanilla JS architecture pattern.

### Audio (Future-Proofed)

| Technology | Purpose | Why |
|------------|---------|-----|
| **Web Audio API** via `AudioContext` | Sound playback when assets are added | More control than `<audio>` elements -- can play overlapping sounds (two cards dealt rapidly), adjust volume per-sound, and avoid the mobile autoplay restrictions by initializing `AudioContext` on first user gesture. |
| **`<audio>` element preloading** | NOT recommended | Cannot overlap sounds easily, mobile browsers block autoplay, clunky programmatic control. |

The SoundManager should:
1. Create `AudioContext` lazily on first user click (satisfies autoplay policy)
2. Expose methods like `playCardDealt()`, `playChipsWon()` that are no-ops until audio buffers are loaded
3. Load audio files via `fetch()` + `decodeAudioData()` if the files exist at known paths

**Confidence: HIGH** -- Web Audio API is the standard for game audio in browsers.

### CSS Architecture

| Decision | Recommendation | Why |
|----------|----------------|-----|
| **CSS methodology** | BEM-like with `bj-` prefix | `bj-card`, `bj-card--face-up`, `bj-card__value`. The prefix avoids collision per PROJECT.md constraint. BEM's flat specificity avoids cascade headaches. |
| **Layout system** | CSS Grid for table layout, Flexbox for card hands | Grid gives precise control over betting area, dealer zone, player zone. Flexbox handles the horizontal card fan within each zone. |
| **Card flip effect** | `transform: rotateY(180deg)` with `backface-visibility: hidden` on two child faces | Standard CSS 3D flip. The WAAPI `animate()` call rotates the card container; the front/back faces auto-show/hide via `backface-visibility`. No JS needed to toggle face visibility. |
| **Responsive approach** | CSS `clamp()` and `aspect-ratio` on cards | Cards maintain aspect ratio at any viewport size. `clamp(60px, 10vw, 120px)` for card width scales smoothly without media query breakpoints. |

**Confidence: HIGH** -- Standard CSS patterns, well-supported.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Animation | WAAPI | CSS @keyframes + animationend events | No promise-based sequencing; manual event listener bookkeeping for multi-card deals |
| Animation | WAAPI | GSAP | External dependency, violates project constraint |
| Persistence | localStorage | File System Access API | Requires file picker dialog each session, Chromium-only, bad game UX |
| Persistence | localStorage | IndexedDB | Async complexity for a few KB of JSON; no benefit at this scale |
| Modules | ES Modules (`type="module"`) | Classic `<script>` tags | Global scope pollution, load-order bugs, no explicit dependency graph |
| Modules | ES Modules | Bundler (Vite) | Violates no-build-tools constraint |
| Audio | Web Audio API | `<audio>` elements | Cannot overlap sounds, mobile autoplay issues, limited programmatic control |
| CSS Layout | Grid + Flexbox | Absolute positioning | Fragile at different viewport sizes, hard to maintain |

## Browser Compatibility Target

Target: **evergreen browsers only** (Chrome, Firefox, Safari, Edge -- latest two versions).

All recommended APIs have full support in these browsers:
- ES Modules: Chrome 61+, Firefox 60+, Safari 11+, Edge 79+
- Web Animations API (`.finished` promise): Chrome 84+, Firefox 75+, Safari 13.1+, Edge 84+
- CSS Custom Properties: Chrome 49+, Firefox 31+, Safari 9.1+, Edge 79+
- CSS Grid: Chrome 57+, Firefox 52+, Safari 10.1+, Edge 79+
- localStorage: universal
- Web Audio API: universal in modern browsers

No polyfills needed. No IE11 consideration.

**Confidence: HIGH** -- All APIs are 3+ years mature in all evergreen browsers.

## Key Implementation Notes

### The ANIM Constants Pattern

```javascript
// constants.js
export const ANIM = {
  DEAL_DURATION_MS: 300,
  DEAL_STAGGER_MS: 150,
  FLIP_DURATION_MS: 400,
  DISCARD_DURATION_MS: 250,
  CHIP_SLIDE_MS: 200,
};

// On init, sync to CSS custom properties
export function syncAnimConstants() {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(ANIM)) {
    const cssName = `--bj-${key.toLowerCase().replace(/_/g, '-')}`;
    root.style.setProperty(cssName, `${value}ms`);
  }
}
```

This means: change `DEAL_DURATION_MS` in one place, both JS `animate()` calls and CSS `transition-duration` values update.

### Card Element Creation via `<template>`

```html
<!-- In index.html -->
<template id="bj-card-template">
  <div class="bj-card">
    <div class="bj-card__front"></div>
    <div class="bj-card__back"></div>
  </div>
</template>
```

```javascript
// Renderer.js
const template = document.getElementById('bj-card-template');
function createCard(suit, rank) {
  const clone = template.content.cloneNode(true);
  const card = clone.querySelector('.bj-card');
  card.dataset.suit = suit;
  card.dataset.rank = rank;
  // Set background-image to user-supplied card face asset
  return card;
}
```

### Animation Queue Pattern

```javascript
// AnimationManager.js - core concept
class AnimationQueue {
  #queue = [];
  #running = false;

  enqueue(animationFn) {
    this.#queue.push(animationFn);
    if (!this.#running) this.#run();
  }

  async #run() {
    this.#running = true;
    while (this.#queue.length > 0) {
      const fn = this.#queue.shift();
      await fn(); // fn returns a WAAPI .finished promise
    }
    this.#running = false;
  }
}
```

This ensures card deals happen sequentially (card 1 slides in, then card 2, etc.) without nested callback chains.

## What This Stack Does NOT Include (and Why)

| Omission | Reason |
|----------|--------|
| TypeScript | Requires build step (tsc compilation). Vanilla JS with JSDoc type annotations (`@param`, `@returns`) gives IDE type checking without compilation. |
| CSS preprocessor (Sass, Less) | Requires build step. CSS custom properties cover the variable use case. Nesting is now native CSS (supported in all evergreen browsers since 2023). |
| Testing framework | No build step means no Jest/Vitest. Manual testing is appropriate for a single-player card game. If testing is desired later, browser-native `console.assert` or a single-file test runner loaded via `<script>` can be added. |
| Linter / Formatter | Requires Node.js toolchain. The constraint is "opens directly in browser." Code style is enforced by convention (the naming rules in PROJECT.md). |
| Canvas / WebGL | DOM-based rendering is simpler for a card game. Cards are rectangles with images -- CSS handles this natively. Canvas would require reimplementing layout, click detection, and text rendering. Only use Canvas for particle effects (chips exploding) if desired later. |

## Sources

- Web Animations API: MDN documentation (stable specification, fully supported since 2022)
- localStorage: MDN documentation (universal browser support)
- ES Modules: MDN documentation (`<script type="module">` supported since 2018 across all browsers)
- Web Audio API: MDN documentation (stable, universal in modern browsers)
- CSS Custom Properties: MDN documentation (supported since 2016+)
- File System Access API: MDN documentation (Chromium-only, no persistent permissions without installed PWA)

**Note:** Web search was unavailable during this research. All recommendations are based on well-established, stable browser APIs that have been supported for 3+ years. Confidence remains HIGH because these are platform standards, not rapidly-changing library ecosystems. No recommendation here is at risk of being stale.
