# Phase 2: Visual Game - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the headless GameEngine into a browser-playable blackjack game. Player opens index.html, sees a table, places bets using chip buttons, plays animated hands, and loops through complete rounds. No split or insurance UI yet (Phase 3). Stats tracking not yet (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Card assets
- Pure CSS-rendered cards — rank text + suit symbol, no image files
- Card dimensions: standard playing card aspect ratio (~2.5:3.5)
- Classic coloring: ♥♦ red (#c0392b or similar), ♣♠ black (#1a1a1a or similar)
- Card face: white background, rank in top-left and bottom-right corners, large centered suit
- Card back: solid colored back with CSS border/pattern — no image asset

### Betting UX
- Chip denomination buttons: +$10, +$25, +$50, +$100, +$500
- Each click adds that amount to current bet
- Clear button resets bet to $0
- Deal button locks in bet and triggers deal
- Chip stack shown as number only: "Chips: $850"
- Current bet shown as: "Bet: $50"
- Round end: result banner (~2s, e.g. "You win +$150!" or "Push") auto-clears to betting phase — no manual dismiss

### Table layout
- Vertical orientation: dealer hand at top, player hands in center, controls at bottom
- Dark navy/black table surface (moody theme, not classic green)
- Right side: shoe (draw pile) stacked above discard pile — both visible
- Dealer zone: top half — two cards, dealer score shown (hidden until reveal)
- Player zone: center — two hand areas side by side (left ready for split in Phase 3)
- Controls zone: bottom — chip buttons, current bet display, action buttons (Hit/Stand/Double)
- Status/chips bar: sits between player zone and controls

### Animation feel
- Overall pace: snappy and responsive
- Deal: ~150ms slide-in per card, ~100ms stagger between cards
- Hole card flip: ~300ms 3D rotateY — nothing else, just the clean flip
- Discard sweep: each card slides right to discard pile, ~200ms per card with stagger
- All values live in ANIM constants block synced to CSS custom properties

### Claude's Discretion
- Exact card corner radius, shadow depth, and border styling
- Exact table zone proportions and padding
- Result banner styling (color, font size, position)
- Hover/active states for buttons
- Score label placement on dealer and player zones

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Animation requirements
- `.planning/REQUIREMENTS.md` §Animations (ANIM-01 through ANIM-05) — deal stagger, hole card flip, discard sweep, ANIM constants block, button disable during animations

### Architecture constraints
- `.planning/REQUIREMENTS.md` §Code Quality & Architecture (CODE-01, CODE-03, CODE-04) — bj- CSS prefix, swappable asset paths, two player hand areas
- `.planning/PROJECT.md` §Constraints — vanilla JS/CSS/HTML only, no build step, bj- prefix, camelCase JS / kebab-case CSS, no reserved word shadowing

### Engine API (Phase 1 output)
- `src/engine/GameEngine.js` — getState(), getAvailableActions(), placeBet(), deal(), hit(), stand(), doubleDown(), nextRound() — UI layer calls these and reads returned state
- `src/SoundManager.js` — no-op stubs already in place; UI triggers them at AnimationManager lifecycle events (not game state changes)

No external specs beyond requirements and PROJECT.md — requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/GameEngine.js` — complete state machine; UI calls it directly, no wrappers needed
- `src/SoundManager.js` — stubs ready; AnimationManager calls them at animation lifecycle events
- `index.html` — blank slate, just imports GameEngine and SoundManager; Phase 2 builds it out

### Established Patterns
- ES Modules throughout (`<script type="module">`) — new UI files follow same pattern
- Immutable state updates — `getState()` returns a fresh snapshot; UI re-renders from state, never mutates
- Integer cents for all chip math — UI displays as dollars (divide by 100), never stores fractional
- `getAvailableActions()` returns string array — UI uses this to enable/disable buttons

### Integration Points
- Game phases (BETTING → DEALING → PLAYER_TURN → DEALER_TURN → ROUND_OVER) drive UI state — each phase determines which controls are visible/enabled
- `getState().dealerHand.cards` — one card will have `faceDown: true` until hole card reveal
- `getState().playerHands[0]` — Phase 2 uses index 0 only; Phase 3 will use both indices
- AnimationManager sits between GameEngine calls and DOM updates — never manipulate DOM before animations complete

</code_context>

<specifics>
## Specific Ideas

- Layout mockup chosen: dealer top, shoe/discard on right edge, two player hand zones center, chip buttons + action buttons at bottom
- Table theme: dark navy/black — cards should pop visually against it
- Betting feel: chip buttons like a real casino interface (not a form input)
- Round result: brief banner message then auto-advance — no click needed between hands

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-visual-game*
*Context gathered: 2026-03-17*
