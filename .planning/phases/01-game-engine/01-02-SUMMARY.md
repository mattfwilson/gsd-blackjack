---
phase: 01-game-engine
plan: 02
subsystem: engine
tags: [blackjack, game-engine, state-machine, betting, dealing, hit-stand, double-down, dealer-ai, payouts, tdd]

# Dependency graph
requires:
  - phase: 01-game-engine
    provides: "Deck.js (6-deck shoe), Hand.js (computeHandValue, createHand, addCardToHand)"
provides:
  - "GameEngine.js: State machine with placeBet, deal, hit, stand, doubleDown, startNewRound, resetSession, getAvailableActions"
  - "Complete round flow: BETTING -> DEALING -> PLAYER_TURN -> DEALER_TURN -> ROUND_OVER"
  - "Payout logic: WIN=2x, BLACKJACK=bet+floor(bet*3/2), PUSH=bet, LOSS=0"
  - "89 passing tests covering all game engine behaviors"
affects: [01-game-engine, 02-visual-game, 03-enhanced-features]

# Tech tracking
tech-stack:
  added: []
  patterns: [state-machine-phases, snapshot-returning-api, phase-guards, integer-cent-payouts, tdd-red-green]

key-files:
  created:
    - src/engine/GameEngine.js
  modified:
    - tests/engine.test.js

key-decisions:
  - "Included all methods (hit, stand, doubleDown) in single implementation for cohesion"
  - "Dealer stands on ALL 17s (hard and soft) per CORE-06"
  - "Player bust skips dealer turn entirely (no unnecessary card draws)"
  - "getAvailableActions provides context-aware action list for UI layer"
  - "Public getState() wrapper delegates to private #getState() for deep snapshots"

patterns-established:
  - "Phase guards: every action method validates current phase before executing"
  - "Snapshot-returning API: every action returns deep-copied state object"
  - "Dealer peek: blackjack checked immediately on deal by computing true hand value ignoring faceDown"
  - "Result object shape: { outcome, playerValue, dealerValue, payout, handResults[] } for split readiness"

requirements-completed: [CORE-03, CORE-04, CORE-05, CORE-06, BET-01, BET-02, BET-03, BET-04, BET-05, ACTN-01, ACTN-02, ACTN-03, DEAL-01]

# Metrics
duration: 4min
completed: 2026-03-17
---

# Phase 1 Plan 2: GameEngine State Machine Summary

**Complete blackjack state machine with betting (min $10/max $500), dealing with blackjack detection, hit/stand/doubleDown actions, dealer AI (stands all 17s), and integer-cent payout resolution**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-17T01:08:42Z
- **Completed:** 2026-03-17T01:12:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- GameEngine state machine transitions correctly through 5 phases: BETTING -> DEALING -> PLAYER_TURN -> DEALER_TURN -> ROUND_OVER
- Bet validation enforces min 1000 cents ($10), max 50000 cents ($500), sufficient chip balance
- Blackjack detected immediately on deal: 3:2 payout for player, loss for dealer blackjack, push for both
- Player bust skips dealer turn entirely (correct casino behavior)
- Dealer AI hits below 17, stands on all 17s (hard and soft)
- Double down validates 2-card hand and sufficient chips, doubles bet, draws exactly one card
- 89 passing tests (0 failed) covering initialization, betting, dealing, hit, stand, doubleDown, dealer turn, payouts, full round simulation

## Task Commits

Each task was committed atomically:

1. **Task 1: GameEngine state machine with betting, dealing, blackjack detection** - `ac9f46f` (test: RED) -> `b1198b7` (feat: GREEN)
2. **Task 2: hit, stand, doubleDown, dealer turn, payout resolution** - `8e11d97` (feat: tests + verification)

_TDD tasks each have two commits (test -> feat)_

## Files Created/Modified
- `src/engine/GameEngine.js` - Complete GameEngine class with state machine, all player actions, dealer AI, payout logic, and deep state snapshots
- `tests/engine.test.js` - Extended from 27 to 89 tests covering all GameEngine behaviors

## Decisions Made
- Dealer stands on ALL 17s (hard and soft) per CORE-06 -- simplest standard rule
- Player bust goes straight to ROUND_OVER without dealer drawing (avoids misleading dealer activity)
- Public getState() method wraps private #getState() so tests and future UI can inspect state
- getAvailableActions() provides context-aware list including conditional doubleDown eligibility
- Result object includes handResults array for forward compatibility with Phase 3 split

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- GameEngine.js is fully functional and ready for Phase 2 visual layer integration
- All player actions return clean state snapshots suitable for UI rendering
- getAvailableActions() provides the UI with exactly which buttons to enable/disable
- Phase 3 split support pre-wired via playerHands array and handResults array
- Plan 01-03 (SoundManager stub) is the remaining plan in Phase 1

## Self-Check: PASSED

All 3 files verified present. All 3 commits verified in git log.

---
*Phase: 01-game-engine*
*Completed: 2026-03-17*
