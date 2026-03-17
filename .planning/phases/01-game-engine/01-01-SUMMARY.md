---
phase: 01-game-engine
plan: 01
subsystem: engine
tags: [blackjack, deck, hand, shuffle, fisher-yates, ace-counting, tdd]

# Dependency graph
requires:
  - phase: none
    provides: "Fresh project - no prior phases"
provides:
  - "Deck.js: 6-deck shoe with Fisher-Yates shuffle, draw, needsReshuffle, reset"
  - "Hand.js: computeHandValue (pure), createHand, addCardToHand (pure)"
  - "Test harness: assertEqual, assertDeepEqual, assertTrue, assertThrows with PASS/FAIL console output"
  - "Browser test harness: test.html loads engine.test.js as ES module"
affects: [01-game-engine, 02-visual-game]

# Tech tracking
tech-stack:
  added: [vanilla-js, es-modules]
  patterns: [fisher-yates-shuffle, pure-function-computation, tdd-red-green]

key-files:
  created:
    - src/engine/Deck.js
    - src/engine/Hand.js
    - tests/engine.test.js
    - tests/test.html
  modified: []

key-decisions:
  - "Fisher-Yates Durstenfeld variant for unbiased shuffle"
  - "75% cut point (card 234 of 312) for reshuffle trigger"
  - "Hand bet field included from day one for Phase 3 split readiness"

patterns-established:
  - "Pure functions: computeHandValue and addCardToHand take input, return new objects, no mutation"
  - "Private fields (#cards, #cutPoint, #drawIndex) for Deck encapsulation"
  - "Console-based test harness: assertEqual/assertDeepEqual/assertTrue/assertThrows with pass/fail counters"

requirements-completed: [CORE-01, CORE-02, CORE-07, CODE-02, CODE-05, CODE-06]

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 1 Plan 1: Test Harness + Deck + Hand Summary

**6-deck shoe with Fisher-Yates shuffle and pure hand value computation covering all ace edge cases (A+A, A+A+9, A+6+5, A+A+A+8)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-17T01:02:28Z
- **Completed:** 2026-03-17T01:05:43Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- 6-deck shoe (312 cards) with Fisher-Yates shuffle, draw, needsReshuffle at 75% cut point
- Pure hand value computation with correct ace demotion for all 5 edge cases
- Test harness with 27 passing tests, compatible with both Node.js and browser
- Zero DOM references in engine modules (CODE-06 compliant)

## Task Commits

Each task was committed atomically:

1. **Task 1: Test harness and Deck.js** - `46b5564` (test: RED) -> `ce50cab` (feat: GREEN)
2. **Task 2: Hand.js ace edge cases** - `048b9b1` (test: RED) -> `6e5b0f9` (feat: GREEN)

_TDD tasks each have two commits (test -> feat)_

## Files Created/Modified
- `src/engine/Deck.js` - 6-deck shoe class with Fisher-Yates shuffle, draw, needsReshuffle, reset, cardsRemaining
- `src/engine/Hand.js` - computeHandValue (pure), createHand (with bet field), addCardToHand (pure)
- `tests/engine.test.js` - 27 tests covering Deck mechanics and all Hand ace edge cases
- `tests/test.html` - Browser harness that loads test suite as ES module

## Decisions Made
- Used Durstenfeld variant of Fisher-Yates (loop from end, swap with random index in [0, i]) for provably unbiased shuffle
- Cut point at 75% (card 234 of 312) matches standard casino practice
- Included bet field on createHand from the start, avoiding schema change when Phase 3 adds split
- addCardToHand returns new object rather than mutating, establishing immutable update pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Deck.js and Hand.js are ready for import by GameEngine.js (Plan 01-02)
- Test harness infrastructure is in place for adding GameEngine tests
- All ace edge cases validated, preventing cascading bugs in game logic

## Self-Check: PASSED

All 5 files verified present. All 4 commits verified in git log.

---
*Phase: 01-game-engine*
*Completed: 2026-03-17*
