# Phase 2: Visual Game - Research

**Researched:** 2026-03-17
**Domain:** Vanilla CSS/JS browser UI -- card animations, DOM rendering, game state visualization
**Confidence:** HIGH

## Summary

Phase 2 transforms the headless GameEngine into a browser-playable blackjack game. The core challenge is building an AnimationManager that sequences card deal, flip, and discard animations using vanilla CSS transitions/transforms coordinated by JavaScript promises, while keeping all timing constants in a single ANIM block synced to CSS custom properties. The existing GameEngine API (getState, getAvailableActions, placeBet, deal, hit, stand, doubleDown, startNewRound) is complete and returns immutable state snapshots -- the UI layer reads state and renders, never mutates.

The card rendering uses pure CSS (no image assets): rank text + suit symbol on white backgrounds, with 3D rotateY for the hole card flip. The table layout is vertical (dealer top, player center, controls bottom) with a dark navy theme. Two player hand areas must exist from day one for Phase 3 split readiness. All `bj-` prefixed CSS classes, camelCase JS, kebab-case CSS.

**Primary recommendation:** Use CSS transitions for card slide/flip animations orchestrated by an AnimationManager class that returns Promises, with `element.animate()` (Web Animations API) as a fallback only if CSS transitions prove insufficient for stagger sequencing. Define all timings in a JS `ANIM` constants object and sync to CSS custom properties via `document.documentElement.style.setProperty()`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Pure CSS-rendered cards -- rank text + suit symbol, no image files
- Card dimensions: standard playing card aspect ratio (~2.5:3.5)
- Classic coloring: hearts/diamonds red (#c0392b or similar), clubs/spades black (#1a1a1a or similar)
- Card face: white background, rank in top-left and bottom-right corners, large centered suit
- Card back: solid colored back with CSS border/pattern -- no image asset
- Chip denomination buttons: +$10, +$25, +$50, +$100, +$500
- Each click adds that amount to current bet; Clear button resets bet to $0
- Deal button locks in bet and triggers deal
- Chip stack shown as number: "Chips: $850"; Current bet: "Bet: $50"
- Round end: result banner (~2s auto-clear, e.g. "You win +$150!") -- no manual dismiss
- Vertical orientation: dealer top, player center, controls bottom
- Dark navy/black table surface (not classic green)
- Right side: shoe (draw pile) stacked above discard pile
- Dealer zone: top half with two cards, score hidden until reveal
- Player zone: center with two hand areas side by side (left ready for split Phase 3)
- Controls zone: bottom with chip buttons, bet display, action buttons (Hit/Stand/Double)
- Status/chips bar between player zone and controls
- Deal: ~150ms slide-in per card, ~100ms stagger between cards
- Hole card flip: ~300ms 3D rotateY
- Discard sweep: ~200ms per card with stagger, slides right to discard pile
- All values in ANIM constants block synced to CSS custom properties

### Claude's Discretion
- Exact card corner radius, shadow depth, and border styling
- Exact table zone proportions and padding
- Result banner styling (color, font size, position)
- Hover/active states for buttons
- Score label placement on dealer and player zones

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANIM-01 | Cards slide in from deck position sequentially with staggered timing when dealt | AnimationManager deal sequence using CSS translate transitions + staggered setTimeout/promise chains |
| ANIM-02 | Dealer's hole card flips with CSS 3D rotateY animation when revealed | CSS perspective + transform-style: preserve-3d + backface-visibility: hidden pattern |
| ANIM-03 | Cards slide off to discard pile at end of each round | CSS translate transition to discard zone coordinates, staggered per card |
| ANIM-04 | All animation timings in single ANIM constants block synced to CSS custom properties | JS ANIM object + document.documentElement.style.setProperty() for --bj-* properties |
| ANIM-05 | Player action buttons disabled during animations to prevent race conditions | AnimationManager sets/clears a busy flag; UI checks busy flag + getAvailableActions() |
| CODE-01 | CSS classes use bj- prefix throughout | All class names prefixed with bj- in CSS and JS DOM manipulation |
| CODE-03 | All visual assets referenced by swappable path constants | ASSET_PATHS constants object for any future image/sound references |
| CODE-04 | Game layout accommodates two simultaneous player hand areas | Two bj-hand containers in player zone, Phase 2 uses index 0, index 1 reserved |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla CSS | N/A | All styling, transitions, 3D transforms | Project constraint: no external dependencies |
| Vanilla JS (ES Modules) | ES2020+ | DOM manipulation, animation orchestration | Project constraint: no frameworks |
| CSS Custom Properties | N/A | Sync animation timings between JS and CSS | Native browser feature, no polyfill needed |
| Web Animations API | N/A | Fallback for complex programmatic animations | Native browser API, good promise support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS `perspective` | N/A | 3D card flip effect | Required for ANIM-02 hole card reveal |
| CSS `transform-style: preserve-3d` | N/A | Enable 3D transforms on child elements | Required for card flip container |
| CSS `backface-visibility: hidden` | N/A | Hide back face during 3D rotation | Required for card front/back separation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS transitions | Web Animations API (`element.animate()`) | WAAPI gives promise-based control but CSS transitions are simpler for this use case; use WAAPI only if CSS transitions create sequencing issues |
| requestAnimationFrame loops | CSS transitions | rAF gives frame-level control but is overkill for simple slide/flip; CSS transitions are GPU-accelerated by default |

**Installation:**
```bash
# No installation needed -- vanilla HTML/CSS/JS
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  engine/
    Deck.js            # (Phase 1 -- unchanged)
    GameEngine.js      # (Phase 1 -- unchanged)
    Hand.js            # (Phase 1 -- unchanged)
  ui/
    AnimationManager.js  # Animation sequencing, promise chains, busy state
    CardRenderer.js      # Pure CSS card DOM creation
    TableRenderer.js     # Table layout, zone management, DOM updates
    UIController.js      # Event handlers, game flow orchestration
  constants.js           # ANIM timing constants + ASSET_PATHS
  SoundManager.js        # (Phase 1 -- unchanged, no-op stubs)
styles/
  table.css              # Table layout, zones, responsive grid
  cards.css              # Card face/back styling, 3D transforms
  controls.css           # Buttons, chip selectors, bet display
  animations.css         # @keyframes, transition definitions, CSS custom properties
index.html               # Entry point, imports all modules
```

### Pattern 1: State-Driven Rendering
**What:** UI reads GameEngine.getState() after every action and re-renders the relevant DOM sections. Never cache game state in the UI layer.
**When to use:** After every GameEngine method call (placeBet, deal, hit, stand, doubleDown, startNewRound).
**Example:**
```javascript
// Source: Project pattern from GameEngine API
function renderFromState(state) {
  renderDealerHand(state.dealerHand);
  renderPlayerHands(state.playerHands);
  renderChips(state.chips);
  renderBet(state.currentBet);
  renderControls(state.phase, engine.getAvailableActions());
  if (state.result) renderResult(state.result);
}
```

### Pattern 2: AnimationManager with Promise Chains
**What:** AnimationManager wraps CSS transitions in Promises. Each animation method returns a Promise that resolves when the `transitionend` event fires. Complex sequences chain promises.
**When to use:** Deal sequence, hole card flip, discard sweep, any multi-step animation.
**Example:**
```javascript
// Source: MDN Web Animations API + CSS transitions pattern
class AnimationManager {
  #busy = false;

  get isBusy() { return this.#busy; }

  async dealCards(cardElements, sourcePosition, targetPositions) {
    this.#busy = true;
    for (let i = 0; i < cardElements.length; i++) {
      await this.#slideIn(cardElements[i], sourcePosition, targetPositions[i]);
      await this.#delay(ANIM.DEAL_STAGGER);
    }
    this.#busy = false;
  }

  #slideIn(element, from, to) {
    // Position at source
    element.style.transform = `translate(${from.x}px, ${from.y}px)`;
    element.style.opacity = '1';
    // Force reflow
    element.offsetHeight;
    // Transition to target
    element.style.transition = `transform ${ANIM.DEAL_DURATION}ms ease-out`;
    element.style.transform = `translate(${to.x}px, ${to.y}px)`;
    return new Promise(resolve => {
      element.addEventListener('transitionend', resolve, { once: true });
    });
  }

  #delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Pattern 3: ANIM Constants Synced to CSS Custom Properties
**What:** Single source of truth for all animation timings. JS object defines values, then pushes them to CSS custom properties on load.
**When to use:** On page load and whenever timings need to change.
**Example:**
```javascript
// Source: CSS Custom Properties + JS sync pattern
export const ANIM = Object.freeze({
  DEAL_DURATION: 150,       // ms per card slide-in
  DEAL_STAGGER: 100,        // ms between consecutive cards
  FLIP_DURATION: 300,       // ms for hole card 3D rotateY
  DISCARD_DURATION: 200,    // ms per card discard slide
  DISCARD_STAGGER: 80,      // ms between discard cards
  RESULT_DISPLAY: 2000,     // ms result banner visible
});

export function syncAnimToCSS() {
  const root = document.documentElement;
  root.style.setProperty('--bj-deal-duration', `${ANIM.DEAL_DURATION}ms`);
  root.style.setProperty('--bj-deal-stagger', `${ANIM.DEAL_STAGGER}ms`);
  root.style.setProperty('--bj-flip-duration', `${ANIM.FLIP_DURATION}ms`);
  root.style.setProperty('--bj-discard-duration', `${ANIM.DISCARD_DURATION}ms`);
  root.style.setProperty('--bj-discard-stagger', `${ANIM.DISCARD_STAGGER}ms`);
  root.style.setProperty('--bj-result-display', `${ANIM.RESULT_DISPLAY}ms`);
}
```

### Pattern 4: CSS 3D Card Flip
**What:** Two-layer card element (front face + back face) using CSS 3D transforms. Flipping toggles a class that rotates the container 180 degrees on the Y axis.
**When to use:** Dealer hole card reveal (ANIM-02).
**Example:**
```css
/* Source: 3dtransforms.desandro.com/card-flip + MDN backface-visibility */
.bj-card {
  width: 80px;
  height: 112px; /* ~2.5:3.5 ratio */
  perspective: 600px;
}

.bj-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform var(--bj-flip-duration) ease-in-out;
}

.bj-card--flipped .bj-card-inner {
  transform: rotateY(180deg);
}

.bj-card-front,
.bj-card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 6px;
}

.bj-card-front {
  background: white;
}

.bj-card-back {
  background: #2c3e50;
  transform: rotateY(180deg);
}
```

### Pattern 5: Phase-Driven UI State Machine
**What:** Map GameEngine phases to UI states that control which elements are visible/enabled. Buttons disabled during animations via AnimationManager.isBusy check.
**When to use:** Every render cycle after state changes.
**Example:**
```javascript
function updateControls(phase, availableActions, animBusy) {
  const hitBtn = document.querySelector('.bj-btn-hit');
  const standBtn = document.querySelector('.bj-btn-stand');
  const doubleBtn = document.querySelector('.bj-btn-double');
  const dealBtn = document.querySelector('.bj-btn-deal');

  // Disable everything during animations (ANIM-05)
  if (animBusy) {
    hitBtn.disabled = true;
    standBtn.disabled = true;
    doubleBtn.disabled = true;
    dealBtn.disabled = true;
    return;
  }

  hitBtn.disabled = !availableActions.includes('hit');
  standBtn.disabled = !availableActions.includes('stand');
  doubleBtn.disabled = !availableActions.includes('doubleDown');
  dealBtn.disabled = phase !== 'DEALING';
}
```

### Anti-Patterns to Avoid
- **Mutating GameEngine state from UI:** Never write to engine internals. Only call public methods, read returned state.
- **DOM state as source of truth:** Always derive display from engine.getState(), never read DOM to determine game state.
- **Inline animation timing magic numbers:** All timing values must come from the ANIM constants block, never hardcoded in CSS or JS.
- **Synchronous animation assumptions:** Always await animation promises before proceeding to next game step. Never call engine methods during active animations.
- **Using `setInterval` for animation sequencing:** Use promise chains or async/await with transitionend events. setInterval leads to timing drift.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 3D card flip | Custom matrix transforms | CSS `perspective` + `transform-style: preserve-3d` + `backface-visibility: hidden` + `rotateY(180deg)` | Browser-optimized GPU compositing; hand-rolling 3D math is error-prone |
| Animation sequencing | Manual callback nesting | Promise-wrapped `transitionend` events with async/await | Clean sequential code, proper error handling |
| CSS-JS timing sync | Dual maintenance of magic numbers | Single ANIM object + `setProperty()` to CSS custom properties | One source of truth eliminates desync bugs |
| Chip math display | parseFloat/string formatting | `(cents / 100).toLocaleString()` or simple division with template literal | Avoid floating-point display errors |

**Key insight:** CSS 3D transforms and transitions are GPU-accelerated by default in modern browsers. Hand-rolling JavaScript frame-by-frame animation for card slides and flips would be both slower and more complex than letting the browser's compositor handle it.

## Common Pitfalls

### Pitfall 1: transitionend Event Not Firing
**What goes wrong:** `transitionend` never fires if the element has `display: none`, the property didn't actually change, or the transition was interrupted.
**Why it happens:** CSS transitions only fire `transitionend` when a property value actually changes and the transition completes.
**How to avoid:** (1) Always force a reflow (read `element.offsetHeight`) between setting the start position and the end position. (2) Add a safety timeout that resolves the promise after `duration + 50ms` in case transitionend fails. (3) Never transition `display` -- use `opacity` and `visibility` instead.
**Warning signs:** Animations "hang" and the game stops responding.

### Pitfall 2: Cards Display Cents Instead of Dollars
**What goes wrong:** UI shows "Chips: 85000" instead of "Chips: $850".
**Why it happens:** GameEngine stores all values in integer cents (CORE-07). Forgetting to divide by 100 in the display layer.
**How to avoid:** Create a single `formatChips(cents)` utility function used everywhere. Never display raw state.chips.
**Warning signs:** Numbers are 100x too large in the UI.

### Pitfall 3: Button Clicks During Animations Cause State Corruption
**What goes wrong:** Player clicks Hit during the deal animation, causing engine methods to be called out of sequence.
**Why it happens:** CSS transitions are async but button click handlers are synchronous. Without guarding, clicks fire immediately.
**How to avoid:** AnimationManager.isBusy flag checked in every button click handler. Buttons also get `disabled` attribute set during animations (ANIM-05).
**Warning signs:** Console errors about wrong phase, or cards appearing in wrong positions.

### Pitfall 4: 3D Flip Shows Both Faces Simultaneously
**What goes wrong:** During the rotateY flip, both the card front and back are visible at the 90-degree midpoint, creating a visual glitch.
**Why it happens:** Missing `backface-visibility: hidden` on one or both faces, or missing `transform-style: preserve-3d` on the parent.
**How to avoid:** Always set `backface-visibility: hidden` on BOTH the front and back face elements. Set `transform-style: preserve-3d` on the inner container. Set `perspective` on the outer container.
**Warning signs:** Card content visible through the back during rotation.

### Pitfall 5: Dealer Score Shown Before Hole Card Reveal
**What goes wrong:** The dealer's full hand value is displayed while the hole card is still face down.
**Why it happens:** `state.dealerHand.value` is computed from all cards including face-down ones after certain engine operations.
**How to avoid:** When rendering dealer score, check if any card has `faceDown: true`. If so, only show the value of visible cards (compute manually from face-up cards only), or show "?" for the hidden portion.
**Warning signs:** Dealer score shows 20 when only one card is visible.

### Pitfall 6: Forced Reflow Not Triggered Before Transition
**What goes wrong:** Setting initial position and transition target in the same JS frame causes the transition to be skipped -- element jumps to final position.
**Why it happens:** The browser batches style changes. Without forcing a reflow between setting start and end, it only sees the end state.
**How to avoid:** Read a layout property (e.g., `element.offsetHeight`) between setting the initial transform and applying the transition class/property.
**Warning signs:** Cards appear instantly at their destination without sliding.

## Code Examples

### Card Element Creation (Pure CSS)
```javascript
// Verified pattern for pure CSS playing cards
function createCardElement(card) {
  const outer = document.createElement('div');
  outer.className = 'bj-card';

  const inner = document.createElement('div');
  inner.className = 'bj-card-inner';

  const front = document.createElement('div');
  const suitSymbol = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' }[card.suit];
  const colorClass = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'bj-card--red' : 'bj-card--black';
  front.className = `bj-card-front ${colorClass}`;
  front.innerHTML = `
    <span class="bj-card-corner bj-card-corner--top">${card.rank}<br>${suitSymbol}</span>
    <span class="bj-card-suit">${suitSymbol}</span>
    <span class="bj-card-corner bj-card-corner--bottom">${card.rank}<br>${suitSymbol}</span>
  `;

  const back = document.createElement('div');
  back.className = 'bj-card-back';

  inner.appendChild(front);
  inner.appendChild(back);
  outer.appendChild(inner);

  if (card.faceDown) {
    outer.classList.add('bj-card--flipped');
  }

  return outer;
}
```

### Staggered Deal Animation
```javascript
// Pattern: deal 4 cards with stagger (player1, dealer1, player2, dealer2)
async function animateDeal(animManager, cardElements, shoePosition, targets) {
  // targets = [playerSlot0, dealerSlot0, playerSlot1, dealerSlot1]
  for (let i = 0; i < cardElements.length; i++) {
    await animManager.slideCard(cardElements[i], shoePosition, targets[i]);
    // Stagger pause between cards
    if (i < cardElements.length - 1) {
      await new Promise(r => setTimeout(r, ANIM.DEAL_STAGGER));
    }
  }
}
```

### Discard Sweep Animation
```javascript
// Pattern: sweep all cards to discard pile at round end
async function animateDiscard(animManager, allCardElements, discardPosition) {
  for (const cardEl of allCardElements) {
    animManager.slideCard(cardEl, null, discardPosition); // don't await -- overlap
    await new Promise(r => setTimeout(r, ANIM.DISCARD_STAGGER));
  }
  // Wait for last card's transition to complete
  await new Promise(r => setTimeout(r, ANIM.DISCARD_DURATION));
}
```

### Chip Display Utility
```javascript
// Convert integer cents to display string
function formatChips(cents) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}
// formatChips(85000) => "$850"
// formatChips(100000) => "$1,000"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jQuery.animate() | CSS transitions + Web Animations API | ~2018+ | No dependency needed; GPU-accelerated by default |
| Vendor-prefixed transforms (-webkit-) | Unprefixed CSS transforms | ~2020+ | All modern browsers support unprefixed |
| JavaScript-driven frame loops | CSS transitions with transitionend events | ~2016+ | Cleaner code, better performance |
| Two separate CSS files for timings | CSS custom properties synced from JS | ~2019+ | Single source of truth for animation timing |

**Deprecated/outdated:**
- `-webkit-backface-visibility`: Unprefixed `backface-visibility` is fully supported in all modern browsers
- `-webkit-perspective`: Unprefixed `perspective` is fully supported
- `-webkit-transform-style`: Unprefixed `transform-style` is fully supported

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Browser-based test runner (custom assertEqual/assertTrue) |
| Config file | `tests/test.html` loads `tests/engine.test.js` |
| Quick run command | Open `tests/test.html` in browser, check console |
| Full suite command | Open `tests/test.html` in browser, check console for pass/fail count |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANIM-01 | Cards slide in with stagger timing | manual | Visual inspection in browser | N/A -- visual |
| ANIM-02 | Hole card flips with 3D rotateY | manual | Visual inspection in browser | N/A -- visual |
| ANIM-03 | Cards slide to discard pile | manual | Visual inspection in browser | N/A -- visual |
| ANIM-04 | ANIM constants synced to CSS custom properties | unit | `tests/test.html` -- verify ANIM values match CSS | Wave 0 |
| ANIM-05 | Buttons disabled during animations | unit | `tests/test.html` -- verify busy flag blocks clicks | Wave 0 |
| CODE-01 | CSS classes use bj- prefix | unit | `tests/test.html` -- scan DOM for non-prefixed classes | Wave 0 |
| CODE-03 | Swappable asset path constants | unit | `tests/test.html` -- verify ASSET_PATHS object exists | Wave 0 |
| CODE-04 | Two player hand areas exist | unit | `tests/test.html` -- verify two bj-hand elements | Wave 0 |

### Sampling Rate
- **Per task commit:** Open `tests/test.html` in browser, verify console output
- **Per wave merge:** Full visual playthrough of a complete round
- **Phase gate:** All unit tests pass + complete round plays through deal/play/discard cycle

### Wave 0 Gaps
- [ ] `tests/ui.test.js` -- covers ANIM-04, ANIM-05, CODE-01, CODE-03, CODE-04
- [ ] `tests/test.html` needs updated to load `ui.test.js`
- [ ] Visual animation tests (ANIM-01, ANIM-02, ANIM-03) are manual-only -- document a manual test checklist

## Open Questions

1. **Dealer score display when hole card is face down**
   - What we know: `state.dealerHand.value` includes the hole card value after certain engine paths. During PLAYER_TURN, the hole card has `faceDown: true`.
   - What's unclear: Should UI show partial score (just upcard value) or "?" for hidden card?
   - Recommendation: Show upcard value only (compute from face-up cards); show full value only after all cards are revealed. This matches standard casino UX.

2. **Card positioning strategy: CSS Grid vs absolute positioning**
   - What we know: Cards need to animate from shoe position to hand slots. CSS Grid handles layout well but absolute positioning is easier for animation start/end coordinates.
   - What's unclear: Whether CSS Grid with transform offsets or pure absolute positioning gives better animation control.
   - Recommendation: Use CSS Grid for the table layout zones, but absolute positioning for individual cards within hand areas. Cards animate from shoe position (absolute) to their grid-cell target.

3. **How to handle rapid bet button clicks**
   - What we know: User clicks +$10 multiple times quickly. Each click should increment the bet.
   - What's unclear: Whether debouncing is needed or if simple additive logic suffices.
   - Recommendation: No debounce -- each click simply adds to `currentBet` accumulator. Validate against chip balance on each click. Only `placeBet()` is called when Deal is pressed with the accumulated total.

## Sources

### Primary (HIGH confidence)
- GameEngine.js, Hand.js, Deck.js, SoundManager.js -- direct code inspection of Phase 1 outputs
- [MDN: Element.animate()](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate) -- Web Animations API reference
- [MDN: Animation.finished](https://developer.mozilla.org/en-US/docs/Web/API/Animation/finished) -- Promise-based animation completion
- [MDN: backface-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backface-visibility) -- CSS 3D transform property
- [MDN: transform-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform-style) -- preserve-3d reference
- [MDN: Using CSS transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transitions/Using) -- Transition fundamentals
- [MDN: Sequencing animations](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS/Sequencing_animations) -- Promise-based animation chains

### Secondary (MEDIUM confidence)
- [3D Transforms - Card Flip](https://3dtransforms.desandro.com/card-flip) -- Canonical card flip tutorial by David DeSandro
- [Ben Frain: CSS Custom Properties + animation durations](https://benfrain.com/can-css-custom-properties-update-animation-durations-on-the-fly/) -- Runtime sync caveats
- [CSS-Tricks: CSS Animations vs Web Animations API](https://css-tricks.com/css-animations-vs-web-animations-api/) -- Comparison and trade-offs

### Tertiary (LOW confidence)
- None -- all findings verified against primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- vanilla JS/CSS is a hard project constraint, no decisions to make
- Architecture: HIGH -- patterns are well-established (state-driven rendering, CSS 3D transforms, promise-based animation)
- Pitfalls: HIGH -- common failure modes are well-documented in CSS transition/3D transform literature

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain -- CSS 3D transforms and transitions are mature)
