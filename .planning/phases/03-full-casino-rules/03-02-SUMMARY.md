---
phase: 03-full-casino-rules
plan: 02
subsystem: ui
tags: [split, insurance, animation, dom, css, sequential-banners]

# Dependency graph
requires:
  - phase: 03-01
    provides: "Split, insurance, dealer deviation engine logic"
  - phase: 02-01
    provides: "TableRenderer, UIController, AnimationManager, card rendering pipeline"
provides:
  - "Split UI with active hand gold glow and split button"
  - "Insurance button swap (amber/gold) when dealer shows ace"
  - "Insurance status messages (won/lost)"
  - "Sequential result banners for split rounds (hand 1, hand 2, net)"
  - "Dealer turn animation helper (#animateDealerTurn)"
affects: [03-full-casino-rules]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Delegated click handler pattern extended for insurance buttons"
    - "Active hand glow via CSS class toggle (bj-hand-area--active)"
    - "Sequential banner display with Promise-based timing"
    - "#animateDealerTurn() DRY helper for dealer hole card flip + draw animation"

key-files:
  created: []
  modified:
    - "src/ui/UIController.js"
    - "src/ui/TableRenderer.js"
    - "styles/controls.css"
    - "styles/table.css"
    - "index.html"

key-decisions:
  - "Insurance buttons use delegated click handler (dynamic DOM elements, not static)"
  - "Split hand hit detection uses DOM card count comparison to find which hand received a card"
  - "#animateDealerTurn() extracted as shared helper used by stand, split, and insurance flows"

patterns-established:
  - "Dynamic control swap: hide chip/action rows, insert temporary row, restore on completion"
  - "Active hand glow toggle via closest('.bj-hand-area') class manipulation"

requirements-completed: [ACTN-04, ACTN-05, ACTN-06, ACTN-07]

# Metrics
duration: 4min
completed: 2026-03-19
---

# Phase 3 Plan 2: Split/Insurance UI Summary

**Split play UI with active hand gold glow, amber insurance button swap, and sequential result banners wired to engine**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T02:20:19Z
- **Completed:** 2026-03-19T02:23:54Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added CSS classes for split active hand glow, insurance buttons (amber/gold), and status messages
- Wired complete split play flow: split button, active hand toggling, hand advancement, sequential banners
- Wired insurance flow: button swap on dealer ace, take/decline handling, hole card flip, status messages
- Extracted #animateDealerTurn() helper to DRY up dealer animation across stand, split, and insurance paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CSS for split active hand, insurance buttons, and status message** - `b5f7bd5` (feat)
2. **Task 2: Wire split, insurance, and sequential banners into UIController and TableRenderer** - `2a72960` (feat)

## Files Created/Modified
- `styles/table.css` - Added .bj-hand-area--active gold glow class
- `styles/controls.css` - Added .bj-btn-split, .bj-btn-insurance, .bj-btn-no-insurance, .bj-insurance-row, .bj-status-message
- `index.html` - Added Split button to action row
- `src/ui/TableRenderer.js` - Added setActiveHand, clearActiveHand, _renderInsuranceControls, _removeInsuranceControls, showStatusMessage, showSplitResult; updated renderControls for insurance phase and split button
- `src/ui/UIController.js` - Added #handleSplit, #handleTakeInsurance, #handleDeclineInsurance, #handleSplitRoundOver, #animateDealerTurn; updated #handleDeal (INSURANCE_OFFER branch), #handleHit (activeHandIndex), #handleStand (hand advancement), #handleDouble (split-aware bust), #handleRoundOver (hand1 cards), #render (hand1 and insurance)

## Decisions Made
- Insurance buttons use delegated click handler on controlsZoneEl (dynamic DOM elements created/removed per insurance offer)
- Split hand hit detection uses DOM card count comparison to identify which hand received the new card after engine bust-advance
- #animateDealerTurn() extracted as shared DRY helper used by stand, split aces, and insurance dealer-blackjack flows

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Split and insurance UI fully wired to engine; Plan 03-03 (double down restrictions, soft 17 edge cases) can proceed
- All existing single-hand gameplay paths preserved with hand1 card collection in discard sweep

## Self-Check: PASSED

All files exist. All commits verified.

---
*Phase: 03-full-casino-rules*
*Completed: 2026-03-19*
