---
phase: 02-visual-game
plan: 02
subsystem: ui
tags: [dom-rendering, game-flow, event-handling, vanilla-js, blackjack-ui]

# Dependency graph
requires:
  - phase: 01-game-engine
    provides: GameEngine API (placeBet, deal, hit, stand, doubleDown, startNewRound, resetSession, getState, getAvailableActions)
  - phase: 02-visual-game
    plan: 01
    provides: ANIM constants, syncAnimToCSS, createCardElement, formatChips, CSS design system
provides:
  - Full HTML table layout with all game zones (dealer, player, status, controls)
  - TableRenderer class for state-driven DOM rendering
  - UIController class wiring GameEngine to DOM with complete game loop
affects: [02-03, 03-split-insurance]

# Tech tracking
tech-stack:
  added: []
  patterns: [state-driven render loop, pending-bet accumulation, delegated event handlers, async round-over flow]

key-files:
  created:
    - src/ui/TableRenderer.js
    - src/ui/UIController.js
  modified:
    - index.html

key-decisions:
  - "TableRenderer caches all DOM references in constructor for zero-query rendering"
  - "UIController uses pendingBet accumulation pattern -- chips not deducted until Deal pressed"
  - "Result banner uses Promise-based auto-clear with ANIM.RESULT_DISPLAY + RESULT_FADE timing"
  - "Bankrupt state uses delegated click handler on controls zone for dynamic New Session button"
  - "Dealer score computed from visible cards only when hole card is face down"

patterns-established:
  - "State-driven render: #render() reads engine.getState() and calls renderer methods"
  - "animBusy flag gates all action button handlers (prepared for Plan 03 AnimationManager)"
  - "Controls enable/disable driven by phase + availableActions + animBusy + pendingBet + chips"

requirements-completed: [CODE-04, ANIM-05]

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 2 Plan 2: Table Layout and Game Flow Summary

**Full HTML table layout with TableRenderer and UIController wiring GameEngine to a playable browser blackjack game with bet accumulation, action buttons, result banners, and bankrupt handling**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-17T22:38:12Z
- **Completed:** 2026-03-17T22:41:00Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 1

## Accomplishments
- Complete HTML layout with dealer zone, player zone (two hand areas for CODE-04), status bar, and controls zone
- TableRenderer renders hands with card fan overlap, dealer score with hidden hole card logic, chip/bet displays, and phase-aware control states
- UIController orchestrates full game loop: bet accumulation, deal, hit/stand/double, result display, auto-advance to next round
- Bankrupt state replaces controls with "Out of chips!" message and New Session button

## Task Commits

Each task was committed atomically:

1. **Task 1: Build index.html layout and TableRenderer** - `df3030a` (feat)
2. **Task 2: Create UIController with game flow orchestration** - `28b72c1` (feat)

## Files Created/Modified
- `index.html` - Full HTML structure with all table zones, CSS/JS imports, chip/action buttons
- `src/ui/TableRenderer.js` - DOM rendering: hands, scores, chips, bets, controls, result banner, bankrupt state
- `src/ui/UIController.js` - Event handlers, game flow orchestration, state-driven render loop, async round-over

## Decisions Made
- TableRenderer caches all DOM element references in constructor to avoid repeated querySelector calls during render
- UIController accumulates pendingBet in cents before Deal -- engine.placeBet only called once with full amount
- Result banner returns a Promise for async flow: show banner -> wait RESULT_DISPLAY -> fade -> wait RESULT_FADE -> resolve
- Bankrupt state handled via delegated click on controls zone since New Session button is created dynamically
- Dealer score shows partial value (face-up cards only) using manual rank-to-value mapping when hole card is down

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Table layout and game flow complete, ready for Plan 03 AnimationManager to add card deal/flip/discard animations
- animBusy flag already wired into UIController -- AnimationManager sets it true during animations
- Two player hand areas (bj-hand-0, bj-hand-1) present in DOM for Phase 3 split feature

## Self-Check: PASSED

All 3 files verified on disk (index.html, TableRenderer.js, UIController.js). Both task commits (df3030a, 28b72c1) verified in git log.

---
*Phase: 02-visual-game*
*Completed: 2026-03-17*
