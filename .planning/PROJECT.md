# Blackjack

## What This Is

A web-based single-player blackjack game where the user plays as a standard player against an AI-controlled dealer (the house). The player bets chips each round, makes hit/stand/double-down/split/insurance decisions, and competes against a dealer that follows conventional blackjack rules most of the time — but occasionally breaks them for unpredictability. The game runs entirely in the browser with no build step required.

## Core Value

The player can sit down, play a full session of blackjack with smooth card animations and real betting stakes, and come back later to see how their cumulative record stacks up.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Player plays standard blackjack against an AI dealer in a browser
- [ ] Cards are animated on deal (sequential, staggered) and on discard (end of round)
- [ ] Dealer card flip animation reveals the hidden card at the right moment
- [ ] Player can hit, stand, double down, split, and take insurance
- [ ] Dealer AI follows hit ≤16 / stand ≥17 logic, but occasionally deviates intentionally
- [ ] Player starts each session with $1,000 in chips
- [ ] Player places a bet before each hand; betting follows standard blackjack rules
- [ ] Session stats tracked: hands played, money earned/lost per round, total earnings, dealer hit probability, player hit probability, win streak
- [ ] Cumulative stats tracked across sessions: all session stats totalled
- [ ] Stats (session + cumulative) persisted to a local file/database
- [ ] Player can view session history and past cumulative stats
- [ ] Sound hooks built in as no-op placeholders for: card dealt, bet placed, chips won, round won, bust
- [ ] Visuals (layouts, card art, color schemes) are supplied by the user and implemented as-is

### Out of Scope

- External dependencies or npm packages — vanilla HTML/CSS/JS only
- Multiplayer or networked play — single player only
- Mobile-native app — browser only
- Real money / payment integration
- OAuth or accounts — local stats file only

## Context

- The user will design all visuals (card art, table layout, color palette) and hand them to Claude for implementation. Code must accommodate dropped-in assets without structural changes.
- Sound effects will be supplied later. A SoundManager module with no-op stubs for each sound event must be in place from the start so sounds can be activated by dropping in audio files and removing the no-op.
- An AnimationManager module handles all card animation sequencing via a queue. All timing values live in a single constants block (`ANIM`) and are also exposed as CSS custom properties, so timing can be adjusted in one place.
- The dealer's irrational behavior is a deliberate design feature — it fires at low probability and causes the dealer to deviate from standard hit/stand thresholds, adding tension and unpredictability for the player.
- Stats are written to a local JSON file (or localStorage fallback) after each session ends. The player can open a stats/history view to see per-session breakdowns and lifetime totals.

## Constraints

- **Tech stack**: Vanilla HTML, CSS, JavaScript — no frameworks, no build tools, opens directly in browser
- **Assets**: Visuals supplied by user; code must be structured so asset paths are easy to swap
- **Naming**: No JS identifiers that shadow reserved words or browser globals (`class`, `event`, `target`, `window`, `document`, `name`, `status`, etc.). CSS classes use `bj-` prefix throughout. JS uses camelCase; CSS uses kebab-case — no mixing.
- **Sound**: Game ships without active audio. SoundManager stubs must be in place from day one.
- **No server**: Stats persistence uses localStorage or a local JSON file (File System Access API); no backend required.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vanilla CSS + JS for animations | No dependencies, opens in browser, user can adjust constants directly | — Pending |
| AnimationManager with `ANIM` constants block | Single place to tune all animation timing; CSS custom properties keep CSS/JS in sync | — Pending |
| SoundManager with no-op placeholders | User supplies sounds later; code is ready without requiring assets upfront | — Pending |
| Dealer irrationality as occasional rule-breaking | Adds player interest without changing core game rules | — Pending |
| $1,000 starting chips per session | Standard casino feel, gives room for a meaningful session arc | — Pending |
| Local file / localStorage for stats | No backend needed, fully self-contained | — Pending |
| `bj-` CSS prefix | Avoids collision with any utility styles user may bring in with their visuals | — Pending |

---
*Last updated: 2026-03-16 after initialization*
