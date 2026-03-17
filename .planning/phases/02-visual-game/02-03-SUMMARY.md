---
plan: 02-03
phase: 02-visual-game
status: checkpoint-pending
checkpoint-task: 3
---

# Plan 02-03 Summary: AnimationManager & Animation Wiring

## What Was Built

Tasks 1 and 2 complete. Task 3 (visual verification checkpoint) pending user approval.

### Task 1: AnimationManager
Created `src/ui/AnimationManager.js` with promise-based animation orchestration:
- `dealCards(cardElements, shoeEl)` — slides cards from shoe to hand positions with stagger (ANIM.DEAL_STAGGER)
- `flipCard(cardElement)` — 3D rotateY flip for dealer hole card reveal
- `discardAll(cardElements, discardEl)` — sweeps all cards to discard pile with stagger
- `slideCardIn(cardElement, shoeEl)` — single card slide-in for hit/double
- Private `#waitForTransition()` with safety timeout, `#delay()` helper
- All timings from ANIM constants — no hardcoded ms values

### Task 2: Animation Wiring
Updated `src/ui/UIController.js`:
- Imports and instantiates `AnimationManager`
- Async deal handler: awaits `animManager.dealCards`
- Async hit handler: awaits `animManager.slideCardIn` for new card
- Async stand handler: awaits `animManager.flipCard` for hole card, then animates additional dealer cards
- Async double handler: card slide-in + dealer turn animation
- `#handleRoundOver`: awaits `animManager.discardAll` before `clearTable()`
- All button handlers guard with `animManager.isBusy` check

Updated `src/ui/TableRenderer.js`:
- `renderHand()` creates cards with `opacity: 0` (AnimationManager reveals them)
- Added `getCardElements(containerEl)` helper
- Added `addCardToHand(containerEl, card)` for hit/dealer draw

## Key Files

- `src/ui/AnimationManager.js` — new, exports AnimationManager
- `src/ui/UIController.js` — updated with async animation flow
- `src/ui/TableRenderer.js` — updated for animation compatibility

## Commits

- `c02b07c` feat(02-03): create AnimationManager with deal, flip, discard, and slide-in animations
- `cd8eaf8` feat(02-03): wire AnimationManager into UIController and update TableRenderer

## Pending

Task 3: User visual verification of complete animated game in browser.
