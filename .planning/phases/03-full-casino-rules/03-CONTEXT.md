# Phase 3: Full Casino Rules - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Add the complete blackjack action set to the already-functioning visual game: split, insurance, and dealer irrationality. Phase 2 delivers the visual game loop; Phase 3 completes the casino feature set on top of it. Stats tracking is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Split hand UX
- Active hand indicated by a glowing border (gold/white highlight on the active hand zone)
- When hand 1 finishes (bust, stand, or double), auto-advance to hand 2 — same pattern as round auto-advance, brief pause then focus shifts
- At round end with two hands: sequential result banners — hand 1 result shows briefly, then hand 2 result, then overall net result
- Split aces are locked: each ace hand gets exactly one card and auto-stands (no hitting after splitting aces) — standard casino behavior
- No re-split (ACTN-05) and no double-after-split (ACTN-06) enforced

### Insurance prompt
- Insurance buttons replace the normal action buttons in the controls zone — no separate overlay or layout addition
- Button style: visually distinct from normal action buttons (amber/gold color) to signal "this is a side bet, not a game action"
- Timing: player decides → hole card flips immediately → if dealer blackjack, insurance resolves; then hand continues or ends
- If insurance taken and dealer does NOT have blackjack: brief inline status message ("Insurance lost −$25") then play continues normally
- If insurance taken and dealer DOES have blackjack: insurance pays 2:1, round ends (dealer blackjack beats player hand)

### Dealer deviation behavior
- Probability: `DEALER_DEVIATION_PROB` config constant (default 0.06 / 6%), following the ANIM constants pattern — easy to tune
- Both directions: dealer can hit when value ≥17 (should stand) OR stand when value ≤16 (should hit)
- Silent to the player — no visual indicator in Phase 3 (v2 POL-02 will add a subtle visual tell)
- Internal log: deviation count only — a simple counter on the GameEngine instance, readable for Phase 4 stats

### Sound stub expansion
- Add three new SoundManager stubs for Phase 3 actions: `splitPlaced()`, `insurancePlaced()`, `insuranceWon()`
- Existing stubs cover: cardDealt, betPlaced, chipsWon, roundWon, bust
- All stubs fire at AnimationManager lifecycle events (not game state changes) per SND-02
- `cardDealt` fires once per card during split deal (same as normal deal — consistent, granular)
- Activating any sound: provide audio file path, remove no-op body — no structural changes

### Claude's Discretion
- Exact glow/highlight styling for active hand (color, intensity, animation)
- Exact amber/gold shade for insurance buttons
- Timing duration of hand-1-to-hand-2 auto-advance pause
- Sequential banner timing between hand 1 result, hand 2 result, and net result
- Insurance status message exact wording and display duration

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 3 requirements
- `.planning/REQUIREMENTS.md` §Player Actions (ACTN-04, ACTN-05, ACTN-06, ACTN-07) — split rules, no re-split, no double-after-split, insurance spec
- `.planning/REQUIREMENTS.md` §Dealer AI (DEAL-02, DEAL-03) — deviation probability, internal logging
- `.planning/REQUIREMENTS.md` §Sound (SND-02, SND-03) — lifecycle event wiring, sound activation contract

### Architecture constraints
- `.planning/PROJECT.md` §Constraints — vanilla JS/CSS/HTML, bj- prefix, camelCase JS / kebab-case CSS, no reserved word shadowing
- `.planning/REQUIREMENTS.md` §Code Quality (CODE-04) — two simultaneous player hand areas (already in layout)

### Engine API and existing UI
- `src/engine/GameEngine.js` — `#playerHands[]`, `#activeHandIndex` already support split; `getAvailableActions()` drives button state; `handResults[]` carries per-hand outcomes
- `src/ui/TableRenderer.js` — `bj-hand-0` and `bj-hand-1` zones already exist; split UI builds on these
- `src/SoundManager.js` — existing stubs; Phase 3 adds splitPlaced, insurancePlaced, insuranceWon
- `src/ui/AnimationManager.js` — sound stubs fire at AnimationManager lifecycle events, not game state changes
- `.planning/phases/02-visual-game/02-CONTEXT.md` — established UX patterns (auto-advance, dark navy theme, controls zone layout)

No external specs beyond requirements and PROJECT.md — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/GameEngine.js` — `#playerHands[]` + `#activeHandIndex` already in place from Phase 1; split logic extends these
- `src/ui/TableRenderer.js` — `bj-hand-0` / `bj-hand-1` hand zones already rendered; just need active-hand CSS class toggling
- `src/ui/AnimationManager.js` — animation queue and lifecycle events are the correct place to wire sound stubs
- `src/ui/UIController.js` — controls zone button-swap pattern (action buttons replaced by insurance buttons) follows existing button-state management
- `src/SoundManager.js` — add new no-op methods; zero risk

### Established Patterns
- ANIM constants block + CSS custom properties: deviation probability should follow same pattern (config constant, easy to tune)
- `getAvailableActions()` drives button enable/disable — split action ('split') and insurance action ('insurance') should be returned by this method
- Auto-advance via brief timeout after result banner — same mechanic for hand-1-to-hand-2 transition
- `handResults[]` in result object already handles per-hand outcomes — extend for two split hands

### Integration Points
- GameEngine needs: `split()` action method, `takeInsurance()` / `declineInsurance()` methods, deviation logic in dealer turn, deviation counter, updated `getAvailableActions()` to return 'split' and 'insurance' when valid
- UIController needs: insurance button-swap UI, active-hand highlight toggling, sequential result banners for split round end
- SoundManager: add `splitPlaced()`, `insurancePlaced()`, `insuranceWon()` stubs

</code_context>

<specifics>
## Specific Ideas

- Insurance buttons in controls zone should feel like a "special decision moment" — amber/gold distinguishes them clearly from the standard Hit/Stand/Double buttons against the dark navy table
- Split auto-advance should feel identical to round auto-advance — same snappy timing, same brief pause — no new UX pattern needed

</specifics>

<deferred>
## Deferred Ideas

- Subtle visual tell when dealer deviates — v2 POL-02 (infrastructure is in place via the deviation counter; just needs the visual layer)

</deferred>

---

*Phase: 03-full-casino-rules*
*Context gathered: 2026-03-18*
