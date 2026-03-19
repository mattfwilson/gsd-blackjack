---
phase: 03-full-casino-rules
plan: 01
subsystem: engine
tags: [blackjack, split, insurance, dealer-deviation, game-logic]

# Dependency graph
requires:
  - phase: 01-game-engine
    provides: "GameEngine with hit/stand/doubleDown, Hand module, Deck module"
provides:
  - "split() method for pair splitting with sequential hand play"
  - "takeInsurance() and declineInsurance() methods with INSURANCE_OFFER phase"
  - "Dealer deviation logic with configurable probability and tracking"
  - "Multi-hand #resolveRound() with independent per-hand payouts"
  - "DEALER_DEVIATION_PROB, HAND_ADVANCE_DELAY, BANNER_SEQUENTIAL constants"
  - "SoundManager stubs for splitPlaced, insurancePlaced, insuranceWon"
affects: [03-02-ui-integration, 03-03-final-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: ["#advanceHand() for multi-hand state machine progression", "retry-until-scenario test pattern for probabilistic game states"]

key-files:
  created: []
  modified:
    - src/engine/GameEngine.js
    - src/constants.js
    - src/SoundManager.js
    - tests/engine.test.js

key-decisions:
  - "Split value comparison uses #getCardSplitValue helper (J/Q/K all 10, A is 11)"
  - "Split aces auto-stand both hands and skip directly to dealer turn"
  - "Dealer deviation inverts standard hit/stand decision at ~6% probability"
  - "deviationCount accumulates across rounds, only resets on resetSession()"
  - "Insurance cost is Math.floor(currentBet / 2) for odd-cent bets"
  - "#resolveRound iterates all hands for net outcome (WIN/LOSS/PUSH based on total payout vs total bet)"

patterns-established:
  - "#advanceHand() returns NEXT_HAND or DEALER_TURN for multi-hand progression"
  - "INSURANCE_OFFER phase inserted between deal and PLAYER_TURN when dealer shows ace"
  - "Retry-until-scenario test pattern for testing probabilistic game states (pairs, dealer aces)"

requirements-completed: [ACTN-04, ACTN-05, ACTN-06, ACTN-07, DEAL-02, DEAL-03]

# Metrics
duration: 4min
completed: 2026-03-19
---

# Phase 3 Plan 1: Split/Insurance/Deviation Engine Logic Summary

**Split pairs into independent hands, insurance on dealer ace with 2:1 payout, and 6% dealer deviation with tracking**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T02:13:05Z
- **Completed:** 2026-03-19T02:17:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Split creates two hands from a pair with independent bets, sequential play, and per-hand payouts
- Insurance offered when dealer shows ace (no player BJ), costs half bet, pays 2:1 on dealer blackjack
- Dealer deviation inverts ~6% of hit/stand decisions with deviationCount tracked in state
- All 143 tests pass including 50+ new tests for split, insurance, and deviation scenarios
- No re-split, no double-after-split enforced by guards; split aces auto-stand

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Phase 3 constants and SoundManager stubs** - `af0dbb0` (feat)
2. **Task 2 RED: Failing tests for split, insurance, deviation** - `9f8726e` (test)
3. **Task 2 GREEN: Implement split, insurance, deviation in GameEngine** - `d398b5f` (feat)

## Files Created/Modified
- `src/constants.js` - Added DEALER_DEVIATION_PROB, HAND_ADVANCE_DELAY, BANNER_SEQUENTIAL, new sound entries
- `src/SoundManager.js` - Added splitPlaced(), insurancePlaced(), insuranceWon() stubs
- `src/engine/GameEngine.js` - Added split(), takeInsurance(), declineInsurance(), #advanceHand(), #getCardSplitValue(), deviation logic, multi-hand resolve
- `tests/engine.test.js` - Added Split, Insurance, Dealer Deviation test sections (143 total tests)

## Decisions Made
- Split value comparison uses #getCardSplitValue helper so J/Q/K all match as 10-value pairs
- Split aces auto-stand both hands and skip directly to dealer turn (no further player action)
- Dealer deviation inverts standard hit/stand at configurable 6% probability
- deviationCount accumulates across rounds in a session, only resets on resetSession()
- Insurance cost uses Math.floor(currentBet / 2) to handle odd-cent bets cleanly
- Multi-hand #resolveRound uses net outcome based on total payout vs total bet across all hands

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Engine has full split/insurance/deviation logic ready for UI integration in plan 03-02
- getState() exposes activeHandIndex, hasSplit, insuranceBet, deviationCount for UI consumption
- getAvailableActions() correctly handles INSURANCE_OFFER phase and post-split restrictions
- All constants and SoundManager stubs ready for animation/sound wiring

---
*Phase: 03-full-casino-rules*
*Completed: 2026-03-19*
