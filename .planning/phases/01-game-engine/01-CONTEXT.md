# Phase 1: Game Engine - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

A headless blackjack state machine — correct rules, dealing, hitting, standing, doubling down, blackjack detection, dealer turns, and payouts. No DOM access. Testable without any UI. Phase 2 builds the visual layer on top of the API this phase exposes.

</domain>

<decisions>
## Implementation Decisions

### Module file structure
- One file per concern: `src/engine/Deck.js`, `src/engine/Hand.js`, `src/engine/GameEngine.js`, `src/SoundManager.js`
- Phase 2's UI layer will live in `src/ui/` (Renderer.js, AnimationManager.js added then)
- Constants stay inline in each module (no shared constants file in Phase 1)
- Final structure:
  ```
  src/
    engine/
      Deck.js
      Hand.js
      GameEngine.js
    ui/              ← Phase 2 adds this
    SoundManager.js
  tests/
    engine.test.js
    test.html
  index.html
  ```

### GameEngine API shape
- Each action method (`deal`, `hit`, `stand`, `doubleDown`) returns a plain state snapshot object
- Caller reads state and updates DOM — pure, predictable, easy to test step-by-step
- Example: `const state = engine.hit();`

### Game state object shape
- Top-level state fields: `phase`, `playerHands`, `dealerHand`, `chips`, `currentBet`, `result`
- **Card object**: `{ suit, rank, faceDown }` — suit is `'hearts'|'diamonds'|'clubs'|'spades'`, rank is `'A'|'2'...'K'`
- **Hand object**: `{ cards, value, isSoft, isBust, isBlackjack, bet }` — `bet` included now to avoid schema change when Phase 3 adds split
- `playerHands` is an array of hand objects (array-of-hands model — critical for Phase 3 split)
- **State machine phases**: `BETTING → DEALING → PLAYER_TURN → DEALER_TURN → ROUND_OVER`
- `result` field on the state object carries outcome info during `ROUND_OVER` phase

### Test harness
- Browser-loadable: `tests/engine.test.js` (ES module) + `tests/test.html` (open in browser)
- Output: `console.log` PASS/FAIL lines — no DOM rendering in tests
- Required test coverage:
  - Ace value computation: A+A, A+A+9, A+6, A+6+5, A+A+A+8 — all isSoft / value edge cases
  - Full round simulation: deal → player hits/stands → dealer turn → correct payout in integer cents
  - Shoe reshuffle: shoe deals correctly and reshuffles at cut point
  - Doubling down: doubles bet, gives exactly one more card, then dealer plays

### Claude's Discretion
- Internal shuffle algorithm for the 6-deck shoe
- Cut point position for reshuffle trigger (typically ~75% through shoe)
- Exact structure of the `result` object on ROUND_OVER
- How `faceDown` is managed internally vs in the state snapshot
- SoundManager stub method signatures (beyond the named events: cardDealt, betPlaced, chipsWon, roundWon, bust)

</decisions>

<canonical_refs>
## Canonical References

No external specs — requirements are fully captured in decisions above and the REQUIREMENTS.md file.

### Requirements traceability
- `.planning/REQUIREMENTS.md` — CORE-01 through CORE-07, BET-01 through BET-05, ACTN-01 through ACTN-03, DEAL-01, CODE-02, CODE-05, CODE-06, SND-01

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — fresh project, no existing code

### Established Patterns
- Vanilla HTML/CSS/JS, no frameworks, no build tools — opens directly in browser
- ES Modules (`<script type="module">`) throughout
- `bj-` CSS prefix for all CSS classes (Phase 2+)
- Integer cents for all chip math (no floating-point)

### Integration Points
- `GameEngine.js` will be imported by Phase 2's `Renderer.js` / `main.js`
- `SoundManager.js` will be wired to `AnimationManager` lifecycle events in Phase 3
- `tests/engine.test.js` imports directly from `../src/engine/` modules

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for the engine internals.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-game-engine*
*Context gathered: 2026-03-16*
