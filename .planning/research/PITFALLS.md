# Domain Pitfalls

**Domain:** Browser-based single-player blackjack (vanilla JS, no build step)
**Researched:** 2026-03-16

## Critical Pitfalls

Mistakes that cause rewrites or major breakage.

### Pitfall 1: Animation Race Conditions Corrupt Game State

**What goes wrong:** Player clicks "Hit" while the deal animation is still running. The game logic processes the hit before the initial cards are visually placed, resulting in cards appearing out of order, duplicate DOM nodes, or the hand total reflecting a card the player hasn't "seen" yet. Worse, rapid clicks during animations can queue multiple hits, causing busts that feel unfair.

**Why it happens:** Game logic and animation sequencing are not decoupled. Event handlers directly mutate game state AND trigger animations in the same synchronous call. There is no concept of "the game is busy animating."

**Consequences:** Visual state diverges from logical state. Players see wrong totals. Cards stack on top of each other. Double-clicks cause phantom hits. The entire round can desync.

**Prevention:**
- Implement a state machine with explicit phases: `BETTING`, `DEALING`, `PLAYER_TURN`, `DEALER_TURN`, `RESOLVING`, `ROUND_OVER`. Action buttons only respond during their valid phase.
- The AnimationManager must own a promise-based queue. Game logic awaits animation completion before advancing state. Pattern: `await animationManager.dealCard(card)` then update UI totals.
- Disable all action buttons (hit/stand/double/split) during dealing and dealer turn phases. Re-enable only when it is actually the player's turn.
- Never rely on `setTimeout` for sequencing game events. Use the animation queue's completion callbacks or promises.

**Detection:** Test by spam-clicking "Hit" during the deal animation. If anything weird happens, the sequencing is broken.

**Phase:** Must be solved in Phase 1 (core game loop). Retrofitting animation guards onto a working game without them is a near-rewrite.

---

### Pitfall 2: Ace Value Recalculation Bugs

**What goes wrong:** Aces are worth 1 or 11, and the hand value must dynamically adjust as cards are added. Common bugs: (a) only the first ace is treated as flexible, (b) ace values are "locked in" at deal time and never re-evaluated, (c) soft/hard hand distinction is lost, causing the dealer AI to misplay soft 17.

**Why it happens:** Developers store a running `total` integer and try to subtract 10 when a bust occurs, instead of recalculating the hand value from scratch each time. Edge cases with multiple aces (A + A + 9 = 21, not 31 or 12) are not tested.

**Consequences:** Incorrect hand totals. Dealer plays wrong strategy on soft 17. Player sees "bust" when they shouldn't. Split aces are scored incorrectly.

**Prevention:**
- Always compute hand value from the full card array, never from a running total. Function signature: `calculateHandValue(cards) -> { total: number, isSoft: boolean }`.
- The algorithm: sum all card values treating aces as 11, then for each ace, if total > 21, subtract 10. A hand is "soft" if at least one ace is still counted as 11.
- Unit test these cases explicitly: `[A, A]` = 12 (soft), `[A, A, 9]` = 21, `[A, 6]` = 17 (soft), `[A, 6, 5]` = 12 (hard), `[A, A, A, 8]` = 21.
- The `isSoft` flag is essential for dealer AI (hit on soft 17 rule).

**Detection:** Deal yourself A + 6 and verify the UI shows 7/17 (soft). Then hit and get a 5 -- verify it shows 12 (hard), not bust.

**Phase:** Must be correct in Phase 1. Every other feature (dealer AI, split, stats) depends on correct hand evaluation.

---

### Pitfall 3: Game State Mutation During Async Operations

**What goes wrong:** The game state object is mutated directly during animations or async operations. A reference to `gameState.playerHand` is captured in a closure, but by the time the animation completes and the closure runs, `gameState` has been modified by another action (e.g., the player split or a new round started).

**Why it happens:** JavaScript's single-threaded nature gives a false sense of safety. Developers think "no concurrency, no race conditions." But promise chains and animation callbacks create interleaved execution points where state can change between when a closure was created and when it executes.

**Consequences:** Cards dealt to the wrong hand. Bets applied to the wrong round. Totals calculated against stale hand data. Particularly nasty with split hands where there are multiple active hands.

**Prevention:**
- Treat game state as the single source of truth. Never cache hand references across await boundaries.
- Use immutable-style updates: derive display state from the current game state at render time, not from captured references.
- The state machine approach (Pitfall 1) naturally prevents this -- if the game is in `DEALING` phase, no player action can mutate state.
- For split hands, use an explicit `activeHandIndex` rather than a direct reference to a hand object.

**Detection:** Play a split hand and verify that hits go to the correct hand. Start a new round while the previous round's resolution animation is still playing.

**Phase:** Architecture must support this from Phase 1. Split implementation in Phase 2 will expose any weakness here.

---

### Pitfall 4: Split Hand Complexity Explosion

**What goes wrong:** Split is treated as a small feature addition but it fundamentally changes the game's data model. A round no longer has "one player hand" -- it has 1-4 hands (re-splitting). Each hand needs its own bet, its own hit/stand controls, its own animation sequence, and its own resolution. Developers bolt split onto a single-hand architecture and the code becomes a nest of special cases.

**Why it happens:** The initial data model assumes `gameState.playerHand = [cards]` (singular). Split requires `gameState.playerHands = [[cards], [cards]]` (plural) with an `activeHandIndex`. Every function that touches the player's hand must now handle the array-of-hands structure.

**Consequences:** Massive refactor when split is added. Bugs in bet tracking (double-down on a split hand doesn't deduct correctly). UI doesn't clearly show which hand is active. Insurance + split interaction bugs. Re-split logic is even worse.

**Prevention:**
- From day one, model the player's state as an array of hands: `playerHands: [{ cards: [], bet: 0, status: 'active' }]`. A normal round simply has one hand in the array. Split adds a second. The code never needs to know the difference.
- Build UI rendering as a loop over `playerHands` from the start, even though there's only one hand initially.
- Track bet per-hand, not per-round.
- Define split rules upfront: can you re-split? Split aces get one card only? These rules affect the state machine.

**Detection:** If adding split requires changing the signature of `calculateHandValue`, `resolveRound`, or `placeBet`, the architecture wasn't ready.

**Phase:** Data model must accommodate split from Phase 1, even though the split UI/logic can be Phase 2.

---

### Pitfall 5: CSS Naming Collisions with User-Supplied Styles

**What goes wrong:** The project uses generic CSS class names like `.card`, `.table`, `.hand`, `.active`, `.hidden`. The user drops in their custom visual stylesheet and it clashes with game classes, breaking layout or styling.

**Why it happens:** CSS is global by default. Without a namespace strategy, common English words used as class names will collide with utility frameworks, reset stylesheets, or the user's own design system.

**Consequences:** Cards render with wrong dimensions. Layout breaks. Animations target wrong elements. The user's dropped-in styles are overridden or override game styles unpredictably.

**Prevention:**
- The project already specifies a `bj-` prefix (from PROJECT.md). Enforce it without exception: `bj-card`, `bj-hand`, `bj-table`, `bj-active`, `bj-hidden`.
- Use CSS custom properties for all colors, sizes, and timing values so the user can theme without editing selectors.
- Never use element selectors (`div`, `span`) for game styling -- always class selectors with the `bj-` prefix.
- Never use `!important` in game CSS. If specificity is needed, increase it with the parent container: `.bj-game .bj-card`.
- Document that user stylesheets should be loaded BEFORE the game stylesheet so game styles win on equal specificity.

**Detection:** Load the game alongside Bootstrap or Tailwind. If anything breaks, the naming isn't isolated enough.

**Phase:** Phase 1. CSS class naming is set once and used everywhere. Changing the convention later means touching every template and style rule.

## Moderate Pitfalls

### Pitfall 6: Dealer AI Edge Cases (Soft 17, Deviation Logic)

**What goes wrong:** The dealer AI is implemented as `if (total <= 16) hit()` without handling soft 17, or the "irrational deviation" feature fires at the wrong time (e.g., during a split resolution) or at a frequency that makes the game feel broken rather than tense.

**Why it happens:** Soft 17 requires the `isSoft` flag from hand evaluation (Pitfall 2). If that flag doesn't exist, the dealer can't distinguish soft 17 from hard 17. The deviation mechanic is poorly bounded -- developers either make it too frequent (feels buggy) or trigger it in invalid game states.

**Prevention:**
- Standard dealer logic: hit on total <= 16 OR (total == 17 AND isSoft). This is the "H17" rule used by most casinos. Make it a configurable constant: `DEALER_HITS_SOFT_17 = true`.
- Deviation mechanic: define it as a separate layer that modifies the standard decision AFTER the standard decision is made. Never mix deviation logic into the core rules. Pattern: `let action = standardDealerAction(hand); if (shouldDeviate()) action = deviateAction(action, hand);`.
- Cap deviation probability (e.g., 5-10%) and never allow deviation on a hand total of 20 or 21 (dealer standing on 20 and choosing to hit would feel like a bug, not tension).
- Log deviations to stats so the player can see "dealer deviated X times this session."

**Detection:** Play 100 automated hands and verify the dealer hits soft 17. Verify the deviation rate matches the configured probability within statistical tolerance.

**Phase:** Core dealer AI in Phase 1. Deviation mechanic can be Phase 2 but its architecture (a decision modifier, not inline logic) should be planned in Phase 1.

---

### Pitfall 7: localStorage Fragility and Size Limits

**What goes wrong:** Stats data grows over many sessions. The developer stores the entire history in a single localStorage key as one giant JSON blob. Eventually it hits the ~5MB localStorage limit (per origin), or a JSON.parse error on corrupted data crashes the game on load.

**Why it happens:** localStorage has no error feedback on quota exceeded -- it just silently fails or throws in some browsers. No schema versioning means old data formats break when the stat tracking schema changes. No corruption handling means one bad byte kills all historical data.

**Consequences:** Stats silently stop saving. Game crashes on startup. All historical data lost. Player has no idea why.

**Prevention:**
- Wrap ALL localStorage operations in try/catch. On read failure, fall back to defaults and warn the user ("Stats could not be loaded -- starting fresh").
- Use a schema version key (`bj-stats-version: 2`). On load, check the version. If it doesn't match, migrate or reset gracefully.
- Keep stored data lean: aggregate stats per session (not per hand). Store the last N sessions (e.g., 50) and lifetime aggregates separately. A session record should be ~200 bytes, so 50 sessions + aggregates is well under 100KB.
- Provide an export function (download JSON) so the player can back up their stats.
- Test the quota exceeded path explicitly: fill localStorage near capacity and verify the game handles it.

**Detection:** Open DevTools > Application > Local Storage. Check the size of the game's data after 10 sessions. If it's growing linearly with hands played (not sessions), the granularity is too fine.

**Phase:** Stats architecture in Phase 2 (stats tracking). Schema versioning must be present from the first stat write.

---

### Pitfall 8: JavaScript Naming Collisions with Browser Globals

**What goes wrong:** A variable named `status`, `name`, `event`, `screen`, or `location` is declared at module scope or accidentally references `window.status` instead of a local variable. In non-strict mode, assigning to `name` at the top level sets `window.name` (which persists across navigations). Using `event` as a parameter name shadows `window.event` in older browsers.

**Why it happens:** Vanilla JS without modules exposes everything to the global scope. The PROJECT.md already flags this risk, but it's easy to forget in practice. Common offenders: `name` (window.name), `status` (window.status), `top` (window.top), `length`, `parent`, `self`, `origin`.

**Consequences:** Subtle bugs where a variable "works" but actually reads/writes a browser global. `window.name` persists across page reloads, causing phantom state. `window.status` used to set the status bar text in old browsers. Variables silently have unexpected values.

**Prevention:**
- Use `'use strict';` at the top of every script file. This prevents accidental global creation.
- Use ES modules (`<script type="module">`) which are strict by default and scoped to the module. This is the single best prevention.
- Lint rule (or manual discipline): never use bare `name`, `status`, `event`, `top`, `self`, `parent`, `origin`, `length`, `screen`, `location`, `history`, `navigator` as variable names. Prefix with context: `playerName`, `gameStatus`, `cardEvent`.
- The PROJECT.md constraint about `bj-` prefix for CSS and camelCase for JS already helps. Extend it: all game state variables should be namespaced inside a game object or module, never floating at global scope.

**Detection:** In the browser console, type the variable name (e.g., `name`). If it returns a value before your game loads, it's a browser global you could collide with.

**Phase:** Phase 1 -- module structure and coding conventions must be established before any code is written.

---

### Pitfall 9: Animation Timing Synchronization (CSS + JS)

**What goes wrong:** CSS transition duration is set to 300ms in the stylesheet, but the JS `setTimeout` waiting for it to complete uses 350ms (or 250ms). Over time, these values drift as developers tweak one but not the other. Cards visually arrive before or after the game logic expects them to.

**Why it happens:** Timing values are duplicated between CSS and JS. Without a single source of truth, they fall out of sync during development.

**Consequences:** Visual glitches. Cards "jump" to final position. Totals update before the card appears. The dealer's hidden card flips before/after the reveal logic runs.

**Prevention:**
- The PROJECT.md already mandates an `ANIM` constants block exposed as CSS custom properties. Follow through rigorously: every animation duration in CSS must reference `var(--bj-anim-deal-duration)`, and every JS timeout must reference `ANIM.DEAL_DURATION`.
- Use `transitionend` / `animationend` events instead of timeouts where possible. These fire when the animation actually completes, regardless of duration.
- Fallback timeout: listen for the event but also set a timeout at 1.5x the expected duration as a safety net (in case the event doesn't fire due to display:none or other CSS issues).
- Never use magic numbers for timing in JS. Every delay should reference the `ANIM` object.

**Detection:** Change a single `ANIM` constant. If the animation still works correctly, the system is properly synchronized. If something breaks, there's a hardcoded duplicate somewhere.

**Phase:** Phase 1 -- the `ANIM` constants and CSS custom properties must be the first thing established before any animation code.

---

### Pitfall 10: Bet Validation and Chip Math Errors

**What goes wrong:** Floating-point arithmetic causes chip counts like `$999.9999999999998` after a blackjack payout (3:2). Bet validation allows betting more than your balance, or betting $0, or betting during the wrong game phase. Double-down doesn't check if the player can afford to double.

**Why it happens:** JavaScript floating-point math. `1000 * 1.5` is fine, but repeated operations accumulate errors. Bet validation is scattered across multiple functions instead of centralized.

**Consequences:** Nonsensical chip displays. Negative balances. Bets accepted during dealer turn. Double-down with insufficient funds.

**Prevention:**
- Use integer cents internally (multiply all dollar amounts by 100). Display with `(chips / 100).toFixed(2)`. This eliminates floating-point issues entirely.
- Centralize all bet operations in a single `BetManager` or within the game state machine. Validate: (a) correct phase, (b) amount > 0, (c) amount <= balance, (d) for double-down: original bet <= remaining balance.
- Blackjack payout: `Math.floor(bet * 1.5)` (in cents) avoids fractional cents. Or use `bet * 3 / 2` which is exact for even bets.
- Disable bet input during non-betting phases.

**Detection:** Play 50 hands and check if the chip count is still a clean number. Test betting exactly your full balance, then winning -- verify the balance is correct.

**Phase:** Phase 1 (betting is core gameplay). Integer-cents decision must be made before any chip math is written.

## Minor Pitfalls

### Pitfall 11: Deck Shuffling Bias

**What goes wrong:** Using `array.sort(() => Math.random() - 0.5)` to shuffle the deck produces a biased shuffle. Some card orderings are significantly more likely than others.

**Prevention:** Use the Fisher-Yates (Knuth) shuffle algorithm. It's 5 lines of code, provably unbiased, and O(n):
```javascript
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
```

**Detection:** Shuffle 10,000 times and check the frequency distribution of the first card. It should be roughly uniform.

**Phase:** Phase 1 (deck creation).

---

### Pitfall 12: Card DOM Element Lifecycle Leaks

**What goes wrong:** Every dealt card creates a new DOM element with event listeners. At the end of a round, the elements are removed from the DOM but the listeners are not cleaned up, or references are held in closures, preventing garbage collection. After hundreds of hands, the page slows down.

**Prevention:**
- Remove event listeners before removing card DOM elements, or use `{ once: true }` for one-shot listeners.
- Use event delegation on the hand container rather than individual card listeners.
- After each round, explicitly clear the card container's innerHTML and nullify any JS references to old card elements.
- Profile with Chrome DevTools Memory tab after 50 hands. Heap should not grow monotonically.

**Detection:** Play 100 hands, open DevTools Performance Monitor, watch JS heap size. If it only goes up, there's a leak.

**Phase:** Phase 1 (round lifecycle). Establish the cleanup pattern with the first implemented round.

---

### Pitfall 13: Insurance and Side Bet Logic Timing

**What goes wrong:** Insurance is offered at the wrong time (after the dealer checks for blackjack instead of before), or insurance is offered when the dealer's upcard is not an ace. The insurance bet amount is not correctly calculated (should be half the original bet, not a separate arbitrary amount).

**Prevention:**
- Insurance flow: dealer upcard is ace -> offer insurance -> player accepts/declines -> dealer checks hole card -> if blackjack, insurance pays 2:1; if not, insurance bet lost, round continues normally.
- Insurance bet = exactly half the original bet. Not configurable, not arbitrary.
- Insurance should be offered ONLY when the dealer's upcard is an ace. Not a 10-value card.
- Model this as a distinct sub-phase in the state machine: `INSURANCE_OFFERED` between `DEALING` and `PLAYER_TURN`.

**Detection:** Verify insurance is never offered when the dealer shows a non-ace. Verify the flow: accept insurance -> dealer has blackjack -> player gets paid 2:1 on insurance, loses original bet.

**Phase:** Phase 2 (after core hit/stand is solid).

---

### Pitfall 14: Z-Index Stacking Wars

**What goes wrong:** Cards, the betting UI, modals (stats view), and animation overlays all compete for z-index. Developers assign arbitrary z-index values (99, 999, 9999) that create unpredictable layering, especially during animations when cards need to fly "above" the table.

**Prevention:**
- Define a z-index scale in CSS custom properties:
  ```css
  --bj-z-table: 1;
  --bj-z-cards: 10;
  --bj-z-active-card: 20;
  --bj-z-ui-controls: 30;
  --bj-z-modal: 100;
  --bj-z-animating: 50;
  ```
- Never use inline `z-index` in JS. Always toggle a CSS class that references the scale.
- Cards being animated get a temporary `bj-animating` class that elevates them, then lose it when the animation completes.

**Detection:** Deal a card while a modal is open. If the card appears on top of the modal, the z-index scale is broken.

**Phase:** Phase 1 (CSS architecture).

---

### Pitfall 15: Stats Schema Evolution

**What goes wrong:** v1 stores `{ wins: 10, losses: 5 }`. v2 adds `{ pushes: 0, blackjacks: 0 }`. Old data doesn't have the new fields. The stats display crashes or shows `undefined` / `NaN` for new metrics.

**Prevention:**
- Always merge loaded stats with a default template: `const stats = { ...DEFAULT_STATS, ...loadedStats }`. This fills in any missing fields with defaults.
- Store a schema version number. On load, run migrations if needed.
- Never delete fields from the schema -- only add. If a field meaning changes, add a new field and deprecate the old one.

**Detection:** Manually edit localStorage to remove a field. Load the game. It should display correctly with the default value, not crash.

**Phase:** Phase 2 (stats implementation). But the schema version must be included from the very first write.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Core game loop (Phase 1) | Animation race conditions (P1) | State machine with phase-locked button enabling |
| Core game loop (Phase 1) | Ace calculation bugs (P2) | Pure function, unit tested with edge cases |
| Core game loop (Phase 1) | CSS naming collisions (P5) | `bj-` prefix enforced from first CSS line |
| Core game loop (Phase 1) | Browser global shadowing (P8) | ES modules (`type="module"`) from day one |
| Core game loop (Phase 1) | Timing sync (P9) | ANIM constants + CSS custom properties before any animation code |
| Core game loop (Phase 1) | Chip math (P10) | Integer cents from first bet implementation |
| Split hands (Phase 2) | Data model explosion (P4) | Array-of-hands model built in Phase 1 |
| Dealer AI (Phase 1-2) | Soft 17 / deviation bugs (P6) | `isSoft` flag from hand eval; deviation as separate layer |
| Stats persistence (Phase 2) | localStorage fragility (P7) | Try/catch, schema version, size management |
| Stats persistence (Phase 2) | Schema evolution (P15) | Default template merge, version migrations |
| Insurance (Phase 2) | Timing/flow errors (P13) | Distinct state machine phase for insurance |
| Long sessions (Phase 3+) | Memory leaks (P12) | DOM cleanup after each round, event delegation |
| Visual polish (Phase 3+) | Z-index wars (P14) | Z-index scale in CSS custom properties |

## Sources

- Domain expertise from established blackjack game development patterns
- JavaScript floating-point arithmetic: IEEE 754 standard behavior
- localStorage API: 5MB per-origin limit documented in Web Storage specification
- Fisher-Yates shuffle: Knuth, "The Art of Computer Programming" Vol. 2
- Note: Web search was unavailable during research. All findings are from training data. Confidence is MEDIUM for browser-specific claims (localStorage limits, global variable behavior) as these are well-established and stable APIs unlikely to have changed.
