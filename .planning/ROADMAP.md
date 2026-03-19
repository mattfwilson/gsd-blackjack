# Roadmap: Blackjack

## Overview

This roadmap delivers a browser-based single-player blackjack game in five phases. Phase 1 builds a headless game engine with correct rules, a clean state machine, and the critical data model decisions (array-of-hands, integer cents) that prevent rewrites later. Phase 2 layers on the visual game -- card animations, table layout, and phase-locked UI. Phase 3 completes the casino feature set with split, insurance, and dealer irrationality. Phase 4 adds in-memory session stats tracking. Phase 5 persists stats to localStorage and delivers the session history view.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Game Engine** - Pure state machine with correct blackjack rules, betting, and core architecture (completed 2026-03-17)
- [ ] **Phase 2: Visual Game** - Card animations, table UI, and browser-playable experience
- [ ] **Phase 3: Full Casino Rules** - Split, insurance, dealer irrationality, and sound stub wiring
- [ ] **Phase 4: Session Stats** - In-memory tracking of per-session statistics
- [ ] **Phase 5: Persistence and History** - localStorage persistence, cumulative stats, and session history view

## Phase Details

### Phase 1: Game Engine
**Goal**: A headless blackjack engine that correctly handles dealing, hitting, standing, doubling down, blackjack detection, dealer turns, and payouts -- testable without any UI
**Depends on**: Nothing (first phase)
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, CORE-07, BET-01, BET-02, BET-03, BET-04, BET-05, ACTN-01, ACTN-02, ACTN-03, DEAL-01, CODE-02, CODE-05, CODE-06, SND-01
**Success Criteria** (what must be TRUE):
  1. A 6-deck shoe deals cards correctly and reshuffles when the cut point is reached
  2. Hand values are computed correctly for all ace combinations (A+A, A+A+9, A+6, A+6+5, A+A+A+8) and isSoft is reported accurately
  3. Player can hit, stand, and double down through the GameEngine API, and each action produces the correct state transition
  4. Dealer follows hit-on-16-or-less / stand-on-17-or-more logic and the round resolves with correct win/loss/push/blackjack outcomes and payouts in integer cents
  5. All modules use ES Modules with no global scope pollution, GameEngine has zero DOM imports, and SoundManager exists as a no-op stub module
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Test harness + Deck.js (6-deck shoe) + Hand.js (ace value computation)
- [x] 01-02-PLAN.md — GameEngine.js state machine (betting, dealing, hit/stand/double, dealer AI, payouts)
- [x] 01-03-PLAN.md — SoundManager no-op stubs + index.html entry point + integration tests

### Phase 2: Visual Game
**Goal**: The player can open index.html in a browser, see a blackjack table, place bets, play hands with animated card dealing and flipping, and experience a complete round loop
**Depends on**: Phase 1
**Requirements**: ANIM-01, ANIM-02, ANIM-03, ANIM-04, ANIM-05, CODE-01, CODE-03, CODE-04
**Success Criteria** (what must be TRUE):
  1. Cards slide in from the deck position with staggered timing during the deal, and the dealer's hole card flips with a 3D rotation when revealed
  2. Cards sweep to a discard area at the end of each round before the next betting phase begins
  3. All player action buttons are disabled during deal and dealer-turn animations -- clicking them has no effect
  4. The table layout displays two player hand areas (ready for split in Phase 3), chip count, bet controls, and all card zones using bj- prefixed CSS classes
  5. All animation timings are adjustable from a single ANIM constants block that syncs to CSS custom properties
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — ANIM/ASSET constants + CSS stylesheets (table, cards, controls, animations) + CardRenderer
- [ ] 02-02-PLAN.md — Table layout HTML + TableRenderer + UIController (functional game without animations)
- [ ] 02-03-PLAN.md — AnimationManager + animation wiring into game flow + visual verification checkpoint

### Phase 3: Full Casino Rules
**Goal**: The player has access to the complete blackjack action set -- splitting pairs, taking insurance, and facing a dealer that occasionally deviates from standard logic
**Depends on**: Phase 2
**Requirements**: ACTN-04, ACTN-05, ACTN-06, ACTN-07, DEAL-02, DEAL-03, SND-02, SND-03
**Success Criteria** (what must be TRUE):
  1. Player can split a pair into two hands played sequentially, with correct independent payouts and no re-split or double-after-split allowed
  2. When the dealer shows an ace, the player is offered insurance at half the original bet, paying 2:1 if the dealer has blackjack
  3. The dealer deviates from standard hit/stand logic at a configurable low probability, and each deviation is logged internally
  4. SoundManager stubs fire at the correct AnimationManager lifecycle events, and activating a sound requires only providing an audio file path and removing the no-op
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Engine logic: split, insurance, dealer deviation + constants + SoundManager stubs + tests
- [ ] 03-02-PLAN.md — UI wiring: split active hand glow, insurance button swap, sequential result banners
- [ ] 03-03-PLAN.md — Sound stub lifecycle wiring + visual verification checkpoint

### Phase 4: Session Stats
**Goal**: The player can see live session statistics updating as they play -- hands played, earnings per round, net earnings, hit probabilities, and win streaks
**Depends on**: Phase 3
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04, STAT-05, STAT-06
**Success Criteria** (what must be TRUE):
  1. A stats display shows total hands played, net session earnings, and current/peak win streak, updating after each round
  2. Per-round earnings log is maintained and the player can see their round-by-round money trail
  3. Dealer hit probability and player hit probability are tracked as ratios and displayed accurately
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Persistence and History
**Goal**: The player's stats survive browser refresh, accumulate across sessions, and a session history view lets them review past performance
**Depends on**: Phase 4
**Requirements**: STAT-07, STAT-08, STAT-09, PERS-01, PERS-02, PERS-03, PERS-04
**Success Criteria** (what must be TRUE):
  1. Session stats are saved to localStorage after each round and survive a browser refresh mid-session
  2. Cumulative stats (lifetime totals across all sessions) are computed and persisted at session end
  3. The player can open a session history view from within the game UI showing a list of past sessions with per-session stat breakdowns
  4. The stats data schema is versioned so that future additions do not corrupt existing saved data
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Game Engine | 3/3 | Complete   | 2026-03-17 |
| 2. Visual Game | 0/3 | Not started | - |
| 3. Full Casino Rules | 1/3 | In Progress|  |
| 4. Session Stats | 0/2 | Not started | - |
| 5. Persistence and History | 0/2 | Not started | - |
