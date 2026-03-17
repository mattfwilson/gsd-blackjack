# Requirements: Blackjack

**Defined:** 2026-03-16
**Core Value:** The player can sit down, play a full session of blackjack with smooth card animations and real betting stakes, and come back later to see how their cumulative record stacks up.

## v1 Requirements

### Core Game

- [ ] **CORE-01**: Game uses a 6-deck shoe that reshuffles automatically when running low
- [ ] **CORE-02**: Hand value is computed as a pure function from the card array; aces count as 11 until the hand would bust, then recount as 1
- [ ] **CORE-03**: Player blackjack (ace + 10-value on first two cards) pays 3:2 unless dealer also has blackjack (push)
- [ ] **CORE-04**: Dealer blackjack beats all non-blackjack player hands
- [ ] **CORE-05**: Tied hand values result in a push (player's bet returned)
- [ ] **CORE-06**: Dealer stands on all 17s (hard and soft)
- [ ] **CORE-07**: All chip math uses integer cents internally to avoid floating-point errors

### Betting

- [ ] **BET-01**: Player starts each session with $1,000 in chips
- [ ] **BET-02**: Player places a bet before each hand is dealt
- [ ] **BET-03**: Minimum bet is $10; maximum bet is $500
- [ ] **BET-04**: Session ends when player's chip count reaches $0
- [ ] **BET-05**: Player can start a new session at any time, resetting chips to $1,000

### Player Actions

- [ ] **ACTN-01**: Player can hit (take another card) on any non-bust hand
- [ ] **ACTN-02**: Player can stand (end their turn) on any hand
- [ ] **ACTN-03**: Player can double down on their first two cards — doubles bet, takes exactly one more card
- [ ] **ACTN-04**: Player can split a pair (two cards of equal value) into two separate hands played sequentially
- [ ] **ACTN-05**: Split is allowed once per hand only — no re-splitting
- [ ] **ACTN-06**: Player cannot double down after splitting
- [ ] **ACTN-07**: Player can take insurance when dealer's upcard is an ace — insurance bet is half the original bet, pays 2:1 if dealer has blackjack

### Dealer AI

- [ ] **DEAL-01**: Dealer follows standard hit ≤16 / stand ≥17 logic as the baseline
- [ ] **DEAL-02**: Dealer deviates from standard logic at a low configurable probability (~5–8%) to add unpredictability
- [ ] **DEAL-03**: Each dealer deviation is logged internally for use in stats tracking

### Animations

- [ ] **ANIM-01**: Cards slide in from deck position sequentially with staggered timing when dealt
- [ ] **ANIM-02**: Dealer's hole card flips with a CSS 3D rotateY animation when revealed
- [ ] **ANIM-03**: Cards slide off to a discard pile at the end of each round
- [ ] **ANIM-04**: All animation timings are defined in a single `ANIM` constants block in JS and synced to CSS custom properties (e.g. `--bj-deal-duration`)
- [ ] **ANIM-05**: Player action buttons are disabled during animations to prevent race conditions

### Sound

- [ ] **SND-01**: SoundManager module ships with no-op stubs for: card dealt, bet placed, chips won, round won, bust
- [ ] **SND-02**: Sound stubs are triggered at the correct AnimationManager lifecycle events (not game state changes)
- [ ] **SND-03**: Activating a sound requires only: providing an audio file path and removing the no-op stub — no structural changes needed

### Session Stats

- [ ] **STAT-01**: Session tracks total hands played
- [ ] **STAT-02**: Session tracks money earned/lost per round (per-round log)
- [ ] **STAT-03**: Session tracks total net earnings for the session
- [ ] **STAT-04**: Session tracks dealer hit probability (ratio of dealer hits to total dealer decisions)
- [ ] **STAT-05**: Session tracks player hit probability (ratio of player hits to total player decisions)
- [ ] **STAT-06**: Session tracks current and peak win streak

### Cumulative Stats

- [ ] **STAT-07**: Cumulative stats total all session stats across all past sessions
- [ ] **STAT-08**: Player can view a list of past sessions with per-session stat breakdowns
- [ ] **STAT-09**: Session history is accessible from within the game UI

### Persistence

- [ ] **PERS-01**: Session stats are saved to localStorage after each round (not only at session end)
- [ ] **PERS-02**: Cumulative stats are updated and saved at the end of each session
- [ ] **PERS-03**: Persisted data survives browser refresh within the same browser
- [ ] **PERS-04**: Stats data schema is versioned to allow future additions without data corruption

### Code Quality & Architecture

- [ ] **CODE-01**: CSS classes use the `bj-` prefix throughout to avoid collision with user-supplied styles
- [ ] **CODE-02**: JS identifiers do not shadow any reserved words or browser globals (`class`, `event`, `target`, `window`, `document`, `name`, `status`, etc.)
- [ ] **CODE-03**: All visual assets are referenced by swappable path constants — dropping in new assets requires no structural changes
- [ ] **CODE-04**: Game layout accommodates two simultaneous player hand areas (required for split)
- [ ] **CODE-05**: Codebase uses ES Modules (`<script type="module">`) with no global scope pollution
- [ ] **CODE-06**: GameEngine is a pure state machine with no DOM access — all rendering is handled by a separate UI layer

## v2 Requirements

### Polish

- **POL-01**: Keyboard shortcuts for player actions (H=hit, S=stand, D=double, P=split)
- **POL-02**: Subtle visual "tell" displayed when dealer deviates from standard logic
- **POL-03**: Responsive layout tuning for different screen sizes

### Extended Rules

- **EXT-01**: Surrender option (forfeit half the bet to end the hand early)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Re-split after splitting | Significant complexity, minimal gameplay value — explicitly excluded |
| Double down after split | Edge case complexity — explicitly excluded |
| Side bets (Perfect Pairs, 21+3, etc.) | Out of scope for v1 — not standard enough to be table stakes |
| Card counting trainer / hints | Anti-feature — would undermine the game challenge |
| Achievements / progression system | Scope creep beyond v1 |
| Multiplayer / networked play | Architecture is single-player only |
| Mobile native app | Browser-only |
| OAuth / user accounts | Local stats file only — no backend |
| External JS/CSS dependencies | Vanilla only — no npm, no CDN libraries |
| File System Access API for persistence | Chromium-only + requires file picker UX — localStorage is the correct fit |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 1 | Pending |
| CORE-03 | Phase 1 | Pending |
| CORE-04 | Phase 1 | Pending |
| CORE-05 | Phase 1 | Pending |
| CORE-06 | Phase 1 | Pending |
| CORE-07 | Phase 1 | Pending |
| BET-01 | Phase 1 | Pending |
| BET-02 | Phase 1 | Pending |
| BET-03 | Phase 1 | Pending |
| BET-04 | Phase 1 | Pending |
| BET-05 | Phase 1 | Pending |
| ACTN-01 | Phase 1 | Pending |
| ACTN-02 | Phase 1 | Pending |
| ACTN-03 | Phase 1 | Pending |
| ACTN-04 | Phase 3 | Pending |
| ACTN-05 | Phase 3 | Pending |
| ACTN-06 | Phase 3 | Pending |
| ACTN-07 | Phase 3 | Pending |
| DEAL-01 | Phase 1 | Pending |
| DEAL-02 | Phase 3 | Pending |
| DEAL-03 | Phase 3 | Pending |
| ANIM-01 | Phase 2 | Pending |
| ANIM-02 | Phase 2 | Pending |
| ANIM-03 | Phase 2 | Pending |
| ANIM-04 | Phase 2 | Pending |
| ANIM-05 | Phase 2 | Pending |
| SND-01 | Phase 1 | Pending |
| SND-02 | Phase 3 | Pending |
| SND-03 | Phase 3 | Pending |
| STAT-01 | Phase 4 | Pending |
| STAT-02 | Phase 4 | Pending |
| STAT-03 | Phase 4 | Pending |
| STAT-04 | Phase 4 | Pending |
| STAT-05 | Phase 4 | Pending |
| STAT-06 | Phase 4 | Pending |
| STAT-07 | Phase 5 | Pending |
| STAT-08 | Phase 5 | Pending |
| STAT-09 | Phase 5 | Pending |
| PERS-01 | Phase 5 | Pending |
| PERS-02 | Phase 5 | Pending |
| PERS-03 | Phase 5 | Pending |
| PERS-04 | Phase 5 | Pending |
| CODE-01 | Phase 2 | Pending |
| CODE-02 | Phase 1 | Pending |
| CODE-03 | Phase 2 | Pending |
| CODE-04 | Phase 2 | Pending |
| CODE-05 | Phase 1 | Pending |
| CODE-06 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after roadmap creation*
