# Project Research Summary

**Project:** Blackjack
**Domain:** Browser-based single-player card game (vanilla HTML/CSS/JS, no build step)
**Researched:** 2026-03-16
**Confidence:** HIGH (stack and architecture are stable browser standards; features based on well-established blackjack conventions)

## Executive Summary

This is a vanilla browser blackjack game with a constraint of zero dependencies and no build tooling. Research confirms that the entire feature set is achievable with browser-native APIs: ES Modules for file organization, the Web Animations API for sequenced card animations, localStorage for stats persistence, and the Web Audio API for future sound integration. Every recommended API has been universally supported in evergreen browsers for 3+ years with no polyfill requirement. The core architectural challenge is not the technology stack — which is simple and stable — but the game's internal complexity: a finite state machine with multiple phases, a decoupled animation queue, and a data model that must accommodate split hands from day one even though split is a Phase 2 feature.

The recommended approach is a layered MVC variant: a pure GameEngine state machine that never touches the DOM, communicating exclusively through a lightweight EventBus, with UIManager, AnimationManager, SoundManager, and StatsManager subscribing to events. This decoupling is the single most important architectural decision. It keeps game logic testable and isolated, allows animation speed to be changed without touching rules, and prevents the "God Object GameEngine" anti-pattern that is the most common cause of rewrites in projects like this. The ANIM constants pattern — a single JS object synced to CSS custom properties on init — provides the single source of truth for all timing, eliminating the timing-drift pitfall.

The primary risks are all Phase 1 concerns: animation race conditions if buttons are not phase-locked, ace recalculation bugs if hand value is computed from a running total rather than from scratch, and chip math errors if floating-point dollars are used instead of integer cents. All three of these are correctness bugs, not polish issues, and retrofitting them onto a working game is near-rewrites. The data model must treat the player's hand as an array of hands (`playerHands: [...]`) from the first line of code, even though there is only one hand in Phase 1 — adding split later onto a single-hand architecture is the second most common cause of rewrites in blackjack implementations.

## Key Findings

### Recommended Stack

The stack is entirely browser-native with no external dependencies. ES Modules (`<script type="module">`) provide file organization and encapsulation without a bundler. The Web Animations API (WAAPI) with its `.finished` promise enables clean sequential animation chaining — CSS `@keyframes` cannot do this without fragile `animationend` counters. CSS Grid handles the table layout; Flexbox handles card fans within zones. localStorage is the correct persistence choice for a few KB of JSON stats; IndexedDB and the File System Access API are both wrong choices at this data scale. Web Audio API (with lazy `AudioContext` init on first user gesture) is the right audio approach for overlapping sounds without mobile autoplay issues.

**Core technologies:**
- HTML5 + ES Modules: page structure and file organization — only option that works without a build step
- Web Animations API (`element.animate()` + `.finished` promise): sequenced card deal/flip/discard animations — programmatic chaining is impossible with CSS `@keyframes` alone
- CSS Custom Properties + ANIM constants block: animation timing single source of truth — JS and CSS share one value, eliminating drift
- CSS Grid + Flexbox + `transform`/`opacity`: layout and animation properties — compositor-only properties animate on GPU without triggering layout
- localStorage (versioned JSON schema): stats persistence — synchronous, zero-setup, correct for a few KB of data
- Web Audio API (lazy init): audio system — handles overlapping sounds and mobile autoplay restrictions correctly
- BEM-like `bj-` prefix CSS naming: style isolation — prevents collisions with user-supplied stylesheets

See `.planning/research/STACK.md` for full rationale, alternatives considered, and the ANIM constants code pattern.

### Expected Features

The blackjack feature set is well-defined by centuries of gameplay convention. The critical distinction is between features that must exist in Phase 1 (correctness depends on them) and features that can be added later without architectural impact.

**Must have (table stakes):**
- Standard blackjack rules (hit, stand, bust, dealer hits ≤16/stands ≥17) — this IS the game
- Ace as 1 or 11 with dynamic recalculation — bugs here cascade everywhere
- Betting system with chip balance ($1,000 start) — no bet = no tension = no game
- Double down — expected by any player who has played blackjack
- Split pairs — expected by experienced players; requires array-of-hands data model from Phase 1
- Insurance — standard casino offering; players notice its absence
- Blackjack (natural 21) detection with 3:2 payout — getting this wrong is a game-breaking bug
- Card deal and flip animations — baseline expectation in 2026; static placement looks broken
- Clear game state indicators (totals, active phase, available actions) — player must always know their situation
- New round flow — frictionless bet → deal → play → resolve → repeat cycle

**Should have (differentiators):**
- Dealer irrationality (5–10% deviation rate with visual tell) — unique mechanic; no other casual blackjack game does this
- Session + cumulative stats with win/loss streak tracking — creates reason to return; most browser games are stateless
- Per-round stat tracking (dealer/player hit probabilities) — rewards analytically-minded players
- Session history view — browsable past sessions create a "career" feel
- Discard/sweep animation at round end — polish differentiator over competitors
- SoundManager stubs wired to game events — architecture is ready; activating sound later requires zero code changes
- Keyboard shortcuts (H/S/D keys) — power users and accessibility; rare in casual browser games

**Defer (v2+):**
- Card counting trainer mode — different product, different audience
- Multiple simultaneous hand positions — significant UI and logic complexity for minimal casual value
- Side bets (Perfect Pairs, 21+3) — each is a mini-project with its own rule system
- Achievements/badges — stats and streaks serve the same psychological purpose with far less complexity
- Running count display — card counter feature that clutters UI for casual players

See `.planning/research/FEATURES.md` for full complexity estimates and feature dependency graph.

### Architecture Approach

The game uses a strict MVC variant where GameEngine is a pure state machine that never imports UIManager, AnimationManager, or SoundManager. All inter-module communication flows through a lightweight EventBus (plain JS pub/sub, not DOM CustomEvents). GameEngine emits events (`cardDealt`, `roundEnd`, `dealerTurnStart`); all other modules subscribe. The key insight separating good from bad implementations: **game state resolves instantaneously; animations are a visual replay of already-resolved events**. The GameEngine can process the entire dealer turn synchronously, emitting a burst of `cardDealt` events; the AnimationManager queues them and plays them with stagger delays. UI buttons are disabled when the animation queue is running OR when the game phase is not PLAYER_TURN — belt and suspenders.

**Major components:**
1. **GameEngine** — finite state machine (IDLE → BETTING → DEALING → PLAYER_TURN → DEALER_TURN → RESOLVING → ROUND_END); owns all game state, deck, hands, bet ledger; emits events, never manipulates DOM
2. **EventBus** — shared pub/sub backbone; all modules communicate through it; no module imports another module's instance directly
3. **DealerAI** — pure function module (`decide(handValue, isSoft, config) → "hit" | "stand"`); irrationality as a decision modifier layer on top of standard rules, not inline
4. **UIManager** — all DOM reads and writes; listens to GameEngine events; calls GameEngine methods on user input; manages button enable/disable based on phase + animation queue state
5. **AnimationManager** — promise-based FIFO queue; each animation is a WAAPI call returning `.finished`; emits `animStart:*`, `animComplete:*`, `queueEmpty` events
6. **SoundManager** — subscribes to AnimationManager events (not GameEngine); no-op stubs until audio files are present; lazy AudioContext init on first user gesture
7. **StatsManager** — subscribes to GameEngine `roundEnd`; maintains session stats in memory; persists cumulative stats to localStorage on cash-out and `beforeunload`
8. **Constants** — single source of truth for ANIM timings, bet limits, dealer thresholds; imported by all modules; synced to CSS custom properties on init

See `.planning/research/ARCHITECTURE.md` for the full data flow, state machine diagram, build order, and anti-patterns.

### Critical Pitfalls

1. **Animation race conditions** — player can click Hit during deal animation, corrupting game state. Prevention: state machine with phase-locked buttons; AnimationManager owns promise queue; disable all action buttons during DEALING and DEALER_TURN phases. Must be solved in Phase 1; retrofitting is a near-rewrite.

2. **Ace recalculation bugs** — storing a running total and subtracting 10 on bust produces wrong values for multi-ace hands and breaks soft 17 dealer logic. Prevention: always recompute from full card array; `calculateHandValue(cards) → { total, isSoft }`; unit test `[A,A]`, `[A,A,9]`, `[A,6]`, `[A,6,5]`, `[A,A,A,8]` explicitly.

3. **Split hand data model explosion** — bolting split onto a single-hand architecture requires rewriting GameEngine, UIManager, payout logic, and animations. Prevention: model player state as `playerHands: [{ cards, bet, status }]` from Phase 1; normal play has one element in the array; split adds a second; no code needs to know the difference.

4. **Floating-point chip math** — `1000 * 1.5` accumulates errors over many rounds; blackjack 3:2 payout on odd bets produces fractional cents. Prevention: store all chip values as integer cents internally; display with `.toFixed(2)`; use `Math.floor(bet * 3 / 2)` for blackjack payouts.

5. **localStorage fragility** — stats silently fail to save at quota; JSON.parse errors on corrupted data crash the game; schema changes break old data. Prevention: wrap all storage operations in try/catch; version the schema key (`bj-stats-v1`); merge loaded data with `DEFAULT_STATS` template to fill missing fields; store session summaries (not per-hand data) to keep size manageable.

See `.planning/research/PITFALLS.md` for all 15 pitfalls with phase assignments and detection tests.

## Implications for Roadmap

Based on architecture's explicit build-order (Layer 1-6) and FEATURES.md's phase recommendations, the natural phase structure is:

### Phase 1: Foundation and Playable Core

**Rationale:** Every other feature depends on correct game logic, a clean state machine, and the right data model. The array-of-hands model, integer cents, and ES module structure must be established before any feature code. Building a headless-playable game first validates rules and scoring before investing in UI.

**Delivers:** A fully playable blackjack game in the browser — hit, stand, double down, betting, blackjack detection, correct payouts, dealer AI, smooth deal/flip animations, and clear game state display.

**Addresses:**
- All table-stakes features except split and insurance
- ANIM constants block and CSS custom properties (eliminates timing drift pitfall)
- `playerHands` array data model (eliminates split refactor pitfall)
- Integer cents chip math (eliminates floating-point pitfall)
- Phase-locked buttons and AnimationManager queue (eliminates race condition pitfall)
- Fisher-Yates shuffle (eliminates deck bias pitfall)
- `bj-` CSS prefix and ES modules (eliminates naming collision and global shadowing pitfalls)
- Z-index scale in CSS custom properties (eliminates z-index war pitfall)

**Avoids:** Animation race conditions (P1), ace bugs (P2), split explosion (P4), CSS naming (P5), timing sync (P9), chip math (P10)

**Research flag:** No additional research needed. All patterns are well-documented and stable.

### Phase 2: Full Feature Set and Persistence

**Rationale:** Split and insurance require the Phase 1 data model and state machine to be solid. Dealer irrationality requires the DealerAI pure function pattern established in Phase 1. Stats require the `roundEnd` event already emitted by GameEngine. All Phase 2 features are additive — they subscribe to existing events or extend the state machine with new phases.

**Delivers:** Complete casino blackjack feature set — split pairs, insurance, dealer irrationality with visual tell, session stats tracking (in-memory), SoundManager stubs wired to animation events, discard/sweep animation.

**Implements:**
- INSURANCE_OFFERED sub-phase in state machine (between DEALING and PLAYER_TURN)
- SPLITTING sub-state with activeHandIndex tracking
- DealerAI deviation layer (`shouldDeviate()` modifier, not inline logic)
- StatsManager session tracking (in-memory, not yet persisted)
- SoundManager stub wiring to AnimationManager events

**Avoids:** Soft 17 / deviation bugs (P6), insurance timing errors (P13), state mutation during async (P3)

**Research flag:** No additional research needed. Patterns are established; split edge cases (aces, re-split, double-after-split) are well-documented blackjack rules.

### Phase 3: Persistence, History, and Polish

**Rationale:** Stats persistence is separated from stats tracking because localStorage schema design benefits from seeing what data the game actually produces in Phase 2. Responsive layout tuning, keyboard shortcuts, and the session history view are all independent polish concerns with no dependencies on each other.

**Delivers:** Persistent stats that survive browser sessions, browsable session history, responsive layout across viewport sizes, keyboard shortcuts, visual tell for dealer deviations.

**Addresses:**
- Cumulative stats with localStorage persistence (schema-versioned, try/catch wrapped)
- Session history view (separate UI panel, reads from StatsManager)
- Responsive CSS (`clamp()`, `aspect-ratio` on cards)
- Keyboard shortcuts (`keydown` listener in InputHandler)
- Visual tell for dealer irrationality (CSS class toggle, not a new system)

**Avoids:** localStorage fragility (P7), schema evolution (P15), memory leaks from DOM element lifecycle (P12)

**Research flag:** No additional research needed. localStorage patterns are standard; responsive CSS is standard.

### Phase Ordering Rationale

- **Foundation first:** GameEngine, EventBus, Deck, Hand, and Constants have zero dependencies and must exist before any UI or feature work. Building headless game logic first validates correctness without UI complexity.
- **Data model locked in Phase 1:** The `playerHands` array model and integer cents are architectural decisions that are nearly impossible to retrofit. They must be established before any feature code touches them.
- **Animations in Phase 1:** Unlike most projects where polish is deferred, this game's animations are load-bearing UX. A card game with static placement looks broken. AnimationManager is Phase 1 infrastructure, not Phase 3 polish.
- **Stats split across Phase 2/3:** Tracking (what data to collect) is Phase 2 because it depends on understanding what the game produces. Persistence (how to store it) is Phase 3 because schema design benefits from seeing real data shapes.
- **All Phase 1 pitfalls are correctness bugs:** Race conditions, ace bugs, split data model, chip math, and timing sync are not UX issues — they are game-breaking correctness bugs. None can be deferred.

### Research Flags

Phases with standard patterns (no additional research needed):
- **Phase 1:** Browser-native APIs (ES Modules, WAAPI, CSS Grid) are stable, fully documented standards. Game loop patterns are well-established.
- **Phase 2:** Blackjack rules are centuries-old and well-documented. Split edge cases, insurance flow, and state machine patterns are all standard.
- **Phase 3:** localStorage patterns, responsive CSS, and keyboard event handling are standard browser APIs.

No phase in this project requires deeper external research. The domain is stable, the APIs are mature, and the patterns are well-documented. The implementation risk is internal complexity management, not API uncertainty.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations are browser standards (3+ years mature, evergreen support). No library churn risk. |
| Features | HIGH | Blackjack rules are centuries-old and unchanging. Feature expectations are stable domain knowledge. |
| Architecture | HIGH | Vanilla JS game architecture patterns are mature and well-established. Event-driven MVC is not experimental. |
| Pitfalls | MEDIUM-HIGH | Browser API behavior (localStorage limits, floating-point) is well-documented IEEE/spec behavior. Game-logic pitfalls are from domain expertise. No web search available to confirm current browser-specific edge cases, but these are stable. |

**Overall confidence:** HIGH

### Gaps to Address

- **Dealer irrationality tuning:** The research recommends 5–10% deviation rate but notes this needs playtesting. The exact probability and which specific deviations feel "tense" vs. "broken" can only be determined empirically. Flag this for tuning during Phase 2 implementation.

- **Card asset format:** STACK.md notes card images are user-supplied. The Renderer's `createCard()` function needs a defined convention for how card images are named and organized (e.g., `assets/cards/ace-spades.png` vs. `assets/cards/AS.png`). This is a naming convention decision, not a research gap, but it should be decided in Phase 1 before the Renderer is built.

- **Split rules scope:** Research flags re-splitting and double-after-split as edge cases that "multiply complexity." The roadmap should explicitly decide in Phase 1 planning whether re-split is in or out of scope. Deferring the decision creates an open variable in Phase 2 scope.

- **Audio file sourcing:** SoundManager stubs require no audio files in Phase 1–2. Phase 3 polish should define where audio assets come from (user-supplied, Creative Commons library, etc.) before wiring the SoundManager stubs to actual files.

## Sources

### Primary (HIGH confidence)
- MDN Web Docs — Web Animations API (`.finished` promise, `element.animate()`)
- MDN Web Docs — ES Modules (`<script type="module">`, import/export)
- MDN Web Docs — Web Storage API (localStorage, 5MB per-origin limit)
- MDN Web Docs — CSS Custom Properties, CSS Grid, CSS Flexbox
- MDN Web Docs — Web Audio API (AudioContext, decodeAudioData)
- IEEE 754 — floating-point arithmetic behavior (integer cents mitigation)
- Knuth, "The Art of Computer Programming" Vol. 2 — Fisher-Yates shuffle correctness

### Secondary (MEDIUM confidence)
- Domain expertise on blackjack rules and casino game UX conventions — table stakes features, payout ratios, insurance flow, soft 17 rule
- Established vanilla JS game architecture patterns — event-driven MVC, state machine, animation queue

### Notes
Web search was unavailable during research. All recommendations are based on stable, mature specifications and long-established patterns. No recommendation depends on recently-released APIs or rapidly-changing library ecosystems. Confidence remains HIGH for stack and architecture; MEDIUM-HIGH for pitfalls due to browser-specific edge case behavior that is well-documented but not live-verified.

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
