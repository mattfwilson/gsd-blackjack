# Phase 3: Full Casino Rules - Research

**Researched:** 2026-03-18
**Domain:** Blackjack split/insurance logic, dealer deviation AI, sound lifecycle wiring
**Confidence:** HIGH

## Summary

Phase 3 extends the existing working blackjack game with three feature clusters: (1) pair splitting with sequential hand play, (2) insurance side bet when dealer shows an ace, and (3) configurable dealer deviation from standard hit/stand logic. A fourth cluster wires existing SoundManager stubs to AnimationManager lifecycle events and adds three new stubs.

The codebase is well-prepared for all of these. GameEngine already has `#playerHands[]` and `#activeHandIndex`, Hand.js uses immutable patterns, `getAvailableActions()` drives button state, and `bj-hand-0`/`bj-hand-1` DOM zones already exist. The primary complexity is in the split flow -- managing two independent hands with separate bets, sequential play, and independent payouts -- plus the UI orchestration (active hand glow, auto-advance between hands, sequential result banners).

**Primary recommendation:** Implement engine logic first (split, insurance, deviation) with tests, then wire UI (active hand highlighting, insurance button swap, sequential banners), then sound stubs last.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Active hand indicated by a glowing border (gold/white highlight on the active hand zone)
- When hand 1 finishes (bust, stand, or double), auto-advance to hand 2 -- same pattern as round auto-advance, brief pause then focus shifts
- At round end with two hands: sequential result banners -- hand 1 result shows briefly, then hand 2 result, then overall net result
- Split aces are locked: each ace hand gets exactly one card and auto-stands (no hitting after splitting aces) -- standard casino behavior
- No re-split (ACTN-05) and no double-after-split (ACTN-06) enforced
- Insurance buttons replace the normal action buttons in the controls zone -- no separate overlay or layout addition
- Button style: visually distinct from normal action buttons (amber/gold color) to signal "this is a side bet, not a game action"
- Timing: player decides -> hole card flips immediately -> if dealer blackjack, insurance resolves; then hand continues or ends
- If insurance taken and dealer does NOT have blackjack: brief inline status message ("Insurance lost -$25") then play continues normally
- If insurance taken and dealer DOES have blackjack: insurance pays 2:1, round ends (dealer blackjack beats player hand)
- Probability: `DEALER_DEVIATION_PROB` config constant (default 0.06 / 6%), following the ANIM constants pattern -- easy to tune
- Both directions: dealer can hit when value >=17 (should stand) OR stand when value <=16 (should hit)
- Silent to the player -- no visual indicator in Phase 3 (v2 POL-02 will add a subtle visual tell)
- Internal log: deviation count only -- a simple counter on the GameEngine instance, readable for Phase 4 stats
- Three new SoundManager stubs: `splitPlaced()`, `insurancePlaced()`, `insuranceWon()`
- All stubs fire at AnimationManager lifecycle events (not game state changes) per SND-02
- `cardDealt` fires once per card during split deal (same as normal deal -- consistent, granular)
- Activating any sound: provide audio file path, remove no-op body -- no structural changes

### Claude's Discretion
- Exact glow/highlight styling for active hand (color, intensity, animation)
- Exact amber/gold shade for insurance buttons
- Timing duration of hand-1-to-hand-2 auto-advance pause
- Sequential banner timing between hand 1 result, hand 2 result, and net result
- Insurance status message exact wording and display duration

### Deferred Ideas (OUT OF SCOPE)
- Subtle visual tell when dealer deviates -- v2 POL-02 (infrastructure is in place via the deviation counter; just needs the visual layer)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ACTN-04 | Player can split a pair into two separate hands played sequentially | Engine split() method, UI active-hand management, sequential play flow |
| ACTN-05 | Split is allowed once per hand only -- no re-splitting | Engine guard: `#hasSplit` flag prevents second split |
| ACTN-06 | Player cannot double down after splitting | Engine guard: `getAvailableActions()` excludes 'doubleDown' when `#hasSplit` is true |
| ACTN-07 | Insurance when dealer shows ace -- half bet, pays 2:1 if dealer blackjack | Engine insurance methods, UI button swap, payout logic |
| DEAL-02 | Dealer deviates from standard logic at configurable low probability | `DEALER_DEVIATION_PROB` constant, Math.random() check in `#playDealerTurn()` |
| DEAL-03 | Each dealer deviation is logged internally | Simple `#deviationCount` counter on GameEngine, exposed via getState() |
| SND-02 | Sound stubs triggered at AnimationManager lifecycle events | Wire existing + new stubs at animation await points in UIController |
| SND-03 | Activating a sound requires only providing audio file path and removing no-op | Stub contract already established; new stubs follow same pattern |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS (ES Modules) | ES2020+ | All game logic and UI | Project constraint -- no external dependencies |
| CSS Custom Properties | CSS3 | Animation timings, active-hand glow | Already established pattern via `syncAnimToCSS()` |

### Supporting
No external libraries. This is a vanilla JS/CSS/HTML project per project constraints.

### Existing Internal Modules
| Module | File | Role in Phase 3 |
|--------|------|-----------------|
| GameEngine | `src/engine/GameEngine.js` | Add split(), insurance, deviation logic |
| Hand.js | `src/engine/Hand.js` | No changes needed -- immutable hand operations work for split hands |
| UIController | `src/ui/UIController.js` | Orchestrate split UI, insurance button swap, sound wiring |
| TableRenderer | `src/ui/TableRenderer.js` | Active hand highlight, insurance buttons, sequential banners |
| AnimationManager | `src/ui/AnimationManager.js` | No changes needed -- existing methods serve split card animations |
| SoundManager | `src/SoundManager.js` | Add 3 new no-op stubs |
| constants.js | `src/constants.js` | Add `DEALER_DEVIATION_PROB`, new sound paths, hand-advance timing |

## Architecture Patterns

### Recommended Implementation Order
```
1. Engine: split logic (split(), hand advancement, payout per hand)
2. Engine: insurance logic (takeInsurance(), declineInsurance(), payout)
3. Engine: dealer deviation (probability check, counter, both directions)
4. Engine: getAvailableActions() updates (split, insurance conditions)
5. UI: active hand highlighting (CSS class toggle on bj-hand-0/bj-hand-1)
6. UI: split play flow in UIController (sequential hand play, auto-advance)
7. UI: insurance button swap in controls zone
8. UI: sequential result banners for split rounds
9. Sound: add 3 new SoundManager stubs
10. Sound: wire all stubs to AnimationManager lifecycle events in UIController
```

### Pattern 1: Split Engine Flow
**What:** GameEngine.split() takes one hand, creates two hands each with one card from the pair plus one new card dealt to each. Sets `#activeHandIndex = 0`. Player plays hand 0 to completion, then hand 1.
**When to use:** When player has exactly 2 cards of equal value and has not already split.
**Key implementation details:**
```javascript
// Split creates two hands from one pair
split() {
  // Validation: PLAYER_TURN, 2 cards, equal value, not already split, sufficient chips
  const hand = this.#playerHands[0];
  const card1 = hand.cards[0];
  const card2 = hand.cards[1];

  // Deduct additional bet for second hand
  this.#chips -= hand.bet;

  // Create two new hands, each starting with one card from the pair
  let hand0 = createHand(hand.bet);
  hand0 = addCardToHand(hand0, card1);
  hand0 = addCardToHand(hand0, this.#deck.draw());

  let hand1 = createHand(hand.bet);
  hand1 = addCardToHand(hand1, card2);
  hand1 = addCardToHand(hand1, this.#deck.draw());

  this.#playerHands = [hand0, hand1];
  this.#activeHandIndex = 0;
  this.#hasSplit = true;

  // Special case: split aces auto-stand both hands
  if (card1.rank === 'A') {
    // Both hands get one card and auto-stand
    // Advance directly to dealer turn
  }
}
```

### Pattern 2: Hand Advancement After Split
**What:** When active hand completes (bust, stand, double), check if there is a next hand. If yes, advance `#activeHandIndex`. If no, proceed to dealer turn.
**Key logic:**
```javascript
#advanceHand() {
  if (this.#activeHandIndex < this.#playerHands.length - 1) {
    this.#activeHandIndex++;
    // If split aces, this hand also auto-stands (already has 2 cards)
    return 'NEXT_HAND';
  }
  // All hands complete -- dealer plays
  return 'DEALER_TURN';
}
```

### Pattern 3: Insurance Flow (New Game Phase)
**What:** After deal, if dealer upcard is ace and no blackjack for player, enter `INSURANCE_OFFER` phase. Player takes or declines. Then check dealer blackjack.
**Key consideration:** Insurance happens BEFORE the player turn. The flow becomes:
```
DEALING -> deal() ->
  if dealer upcard is ace && player does not have blackjack:
    INSURANCE_OFFER -> takeInsurance()/declineInsurance() ->
      if dealer blackjack: ROUND_OVER
      else: PLAYER_TURN
  else:
    normal flow (PLAYER_TURN or ROUND_OVER for blackjack)
```

### Pattern 4: Dealer Deviation
**What:** In `#playDealerTurn()`, before each hit/stand decision, roll `Math.random() < DEALER_DEVIATION_PROB`. If deviation triggers, invert the decision.
```javascript
#shouldDealerHit() {
  const standardHit = this.#dealerHand.value < 17;

  if (Math.random() < DEALER_DEVIATION_PROB) {
    this.#deviationCount++;
    return !standardHit; // Invert the decision
  }
  return standardHit;
}
```

### Pattern 5: Insurance Button Swap
**What:** During INSURANCE_OFFER phase, controls zone replaces action buttons with two amber/gold buttons: "Insurance" and "No Insurance". Same pattern as bankrupt state button swap.
```javascript
// In TableRenderer -- follow existing _renderBankruptControls() pattern
_renderInsuranceControls(insuranceCost) {
  // Hide chip-row and action-row
  // Create insurance buttons in amber/gold style
  // Show insurance cost in button text
}
```

### Pattern 6: Active Hand Highlighting
**What:** CSS class `bj-hand-area--active` toggled on the current hand's container.
```css
.bj-hand-area--active {
  box-shadow: 0 0 12px 4px rgba(230, 184, 0, 0.6);
  border-radius: 8px;
}
```

### Pattern 7: Sequential Result Banners
**What:** For split rounds, show three sequential banners: hand 1 result, hand 2 result, then net result.
```javascript
// In UIController #handleRoundOver for split:
async #handleSplitRoundOver() {
  // Show hand 1 result banner (highlight hand 0)
  await this.#renderer.showResult(result.handResults[0], ...);
  // Show hand 2 result banner (highlight hand 1)
  await this.#renderer.showResult(result.handResults[1], ...);
  // Show net result banner
  await this.#renderer.showResult(netResult, ...);
  // Then discard and clear as normal
}
```

### Pattern 8: Sound Wiring to Animation Lifecycle
**What:** Sound stubs fire at AnimationManager await points, not game state transitions. In UIController, call sound methods at the same points where animations complete.
```javascript
// After each card animation completes:
await this.#animManager.slideCardIn(newEl, this.#renderer.shoeEl);
this.#sound.cardDealt(); // Fire AFTER animation, not after engine state change

// After split action:
this.#sound.splitPlaced(); // Fire after split cards are dealt and animated

// After insurance decision:
this.#sound.insurancePlaced(); // Fire when insurance is confirmed
```

### Anti-Patterns to Avoid
- **Firing sounds on engine state changes instead of animation events:** SND-02 explicitly requires lifecycle event timing. Sound on state change would play before the visual event.
- **Modifying Hand.js for split-specific logic:** Hand.js is pure and generic -- split logic belongs in GameEngine.
- **Re-rendering both hands on every action:** Only update the active hand's DOM; the inactive hand is static.
- **Using a modal/overlay for insurance:** Decision explicitly says insurance buttons replace action buttons in the controls zone.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card value comparison for split eligibility | Custom value extraction | Compare card ranks directly (both `rank` properties must be equal, or both must be 10-value: 10/J/Q/K) | Standard blackjack: "equal value" means 10-J, Q-K, etc. are all splittable pairs |
| Animation timing for hand transitions | New animation system | Existing `#delay()` in AnimationManager + setTimeout pattern from result banner | Consistency with established patterns |
| Insurance cost calculation | Complex formula | `Math.floor(hand.bet / 2)` | Insurance is always exactly half the original bet |
| Deviation randomness | Custom RNG | `Math.random()` with threshold check | Simple probability gate; no cryptographic need |

**Key insight:** Nearly all Phase 3 mechanics extend existing patterns. The engine's array-of-hands model, the UI's button-swap pattern, and the animation lifecycle are all purpose-built for these features.

## Common Pitfalls

### Pitfall 1: Split Bet Accounting Errors
**What goes wrong:** Failing to deduct the second bet for the split hand, or miscalculating payouts when one hand wins and one loses.
**Why it happens:** Split creates two independent bets. Each hand has its own bet and its own payout. The `#currentBet` field becomes ambiguous.
**How to avoid:** Each hand in `#playerHands` already has a `bet` field. Use per-hand bets for payout calculation. Do NOT use `#currentBet` for split payouts -- use `hand.bet` for each hand independently. The `#currentBet` field should represent the original bet (for insurance calculation).
**Warning signs:** Net chip change after a split round does not equal sum of individual hand payouts.

### Pitfall 2: Split Aces Special Case
**What goes wrong:** Allowing the player to hit after splitting aces, or dealing more than one card to each ace hand.
**Why it happens:** Standard flow allows hitting -- split aces are the exception.
**How to avoid:** After splitting, check if the original card was an ace. If so, each hand gets exactly one dealt card and auto-stands. Skip PLAYER_TURN for both hands entirely and go straight to dealer turn.
**Warning signs:** Player can hit after splitting aces.

### Pitfall 3: Insurance Timing vs Blackjack Check
**What goes wrong:** Checking for dealer blackjack before offering insurance, or offering insurance when player has blackjack.
**Why it happens:** The deal() method currently checks for blackjack immediately. Insurance must be offered AFTER deal but BEFORE blackjack resolution (for the non-player-blackjack case).
**How to avoid:** Restructure deal() flow: deal cards -> check player blackjack first (auto-resolve) -> if dealer upcard is ace and player does NOT have blackjack -> enter INSURANCE_OFFER phase -> after insurance decision -> check dealer blackjack -> resolve or continue.
**Warning signs:** Insurance is never offered, or insurance is offered even when player has blackjack.

### Pitfall 4: Dealer Deviation Causing Infinite Loop
**What goes wrong:** If deviation makes dealer stand at value < 17, the while loop exits. But if deviation makes dealer hit at value >= 17, they could keep hitting forever if deviation keeps triggering.
**Why it happens:** The deviation is checked on each iteration of the dealer loop.
**How to avoid:** Apply deviation only ONCE per dealer turn, or cap dealer hand at a maximum number of cards, or apply deviation at the decision boundary only (first decision point where standard logic would act).
**Warning signs:** Dealer draws excessive cards or browser hangs.

### Pitfall 5: getAvailableActions Incomplete for New Actions
**What goes wrong:** Forgetting to add 'split' and 'insurance' to getAvailableActions, causing UI buttons to never enable.
**Why it happens:** The existing switch-case in getAvailableActions needs new conditions.
**How to avoid:** Add 'split' condition in PLAYER_TURN case (2 cards, equal value, not already split, sufficient chips). Add 'insurance' return in new INSURANCE_OFFER case.
**Warning signs:** Split/insurance buttons are always disabled.

### Pitfall 6: UI Not Updating Active Hand During Split Play
**What goes wrong:** Both hand zones look identical -- player does not know which hand they are playing.
**Why it happens:** No visual indicator of active hand.
**How to avoid:** Toggle `bj-hand-area--active` CSS class on the active hand's container element whenever `#activeHandIndex` changes. Remove it from the previous hand.
**Warning signs:** Player confusion about which hand is active.

### Pitfall 7: Result Object Shape Change Breaking UI
**What goes wrong:** Split rounds produce a different result shape (two handResults entries, net outcome) which breaks existing `showResult()` and `#handleRoundOver()`.
**Why it happens:** Existing code assumes single-hand result.
**How to avoid:** Extend result object carefully. Keep `outcome` as the net outcome. `handResults[]` already exists but currently always has one entry. For split, it has two. UI checks `handResults.length` to decide single vs sequential banner flow.
**Warning signs:** Result banner shows wrong text or crashes on split round end.

## Code Examples

### Split Eligibility Check
```javascript
// In getAvailableActions(), PLAYER_TURN case:
const hand = this.#playerHands[this.#activeHandIndex];
if (
  hand.cards.length === 2 &&
  !this.#hasSplit &&
  this.#getCardValue(hand.cards[0]) === this.#getCardValue(hand.cards[1]) &&
  this.#chips >= hand.bet
) {
  actions.push('split');
}

// Helper: get numeric value for split comparison
// 10, J, Q, K all have value 10 -- they can all split with each other
#getCardValue(card) {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank, 10);
}
```

### Insurance Phase Integration in deal()
```javascript
// After dealing, before blackjack resolution:
const dealerUpcard = this.#dealerHand.cards[0]; // First card is face-up

if (!playerBJ && dealerUpcard.rank === 'A') {
  this.#phase = 'INSURANCE_OFFER';
  return this.#getState();
}
// ... existing blackjack checks continue
```

### Dealer Deviation in Play Loop
```javascript
#playDealerTurn() {
  this.#revealDealerHoleCard();
  // ... recompute dealer value ...

  while (true) {
    const shouldHitStandard = this.#dealerHand.value < 17;
    let shouldHit = shouldHitStandard;

    // Deviation check
    if (Math.random() < DEALER_DEVIATION_PROB) {
      shouldHit = !shouldHitStandard;
      this.#deviationCount++;
    }

    if (!shouldHit) break;
    if (this.#dealerHand.isBust) break; // Safety: stop if already bust

    const card = this.#deck.draw();
    this.#dealerHand = addCardToHand(this.#dealerHand, card);
  }
}
```

### Resolve Round for Multiple Hands
```javascript
#resolveRound() {
  const dealerValue = this.#dealerHand.value;
  const dealerBust = this.#dealerHand.isBust;
  const handResults = [];
  let totalPayout = 0;

  for (const hand of this.#playerHands) {
    let outcome, payout;
    if (hand.isBust) {
      outcome = 'LOSS'; payout = 0;
    } else if (dealerBust) {
      outcome = 'WIN'; payout = hand.bet * 2;
    } else if (hand.value > dealerValue) {
      outcome = 'WIN'; payout = hand.bet * 2;
    } else if (hand.value < dealerValue) {
      outcome = 'LOSS'; payout = 0;
    } else {
      outcome = 'PUSH'; payout = hand.bet;
    }
    handResults.push({ outcome, payout });
    totalPayout += payout;
    this.#chips += payout;
  }

  // Net outcome for banner
  const totalBet = this.#playerHands.reduce((sum, h) => sum + h.bet, 0);
  const netOutcome = totalPayout > totalBet ? 'WIN'
                   : totalPayout < totalBet ? 'LOSS'
                   : 'PUSH';

  this.#result = {
    outcome: netOutcome,
    playerValue: this.#playerHands[0].value, // Primary hand
    dealerValue,
    payout: totalPayout,
    handResults
  };
  this.#phase = 'ROUND_OVER';
}
```

### Constants Additions
```javascript
// In constants.js -- add to ANIM or create new config block:
export const DEALER_DEVIATION_PROB = 0.06;

// Add to ANIM for timing:
export const ANIM = Object.freeze({
  // ... existing ...
  HAND_ADVANCE_DELAY: 800,   // Pause between hand 1 end and hand 2 start
  BANNER_SEQUENTIAL: 1500,   // Duration per sequential banner in split results
});

// Add to ASSET_PATHS.SOUNDS:
export const ASSET_PATHS = Object.freeze({
  // ...
  SOUNDS: Object.freeze({
    // ... existing ...
    splitPlaced: '',
    insurancePlaced: '',
    insuranceWon: '',
  }),
});
```

### Insurance Button CSS
```css
/* Amber/gold insurance buttons -- visually distinct from standard action buttons */
.bj-btn-insurance,
.bj-btn-no-insurance {
  min-width: 120px;
  height: 44px;
  border-radius: 8px;
  background: #d4940a;
  color: #0a0e1a;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.bj-btn-insurance:hover,
.bj-btn-no-insurance:hover {
  background: #e6a810;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-hand only | `#playerHands[]` + `#activeHandIndex` | Phase 1 (foundation) | Split support was pre-built into data model |
| Hardcoded dealer logic | Configurable deviation probability | Phase 3 | Adds unpredictability; preparation for Phase 4 stats |
| Sound on state change | Sound on animation lifecycle | Phase 3 (SND-02) | Audio syncs to visual events, not logic events |

## Open Questions

1. **Split of 10-value cards: rank equality or value equality?**
   - What we know: Standard casino rules allow splitting any two cards of equal value (10-J is splittable). Some casinos require same rank.
   - Recommendation: Use VALUE equality (10/J/Q/K all equal 10) -- this is the more common casino rule and produces more interesting gameplay. The CONTEXT.md says "two cards of equal value" which supports value-based comparison.

2. **Dealer deviation: once per turn or per decision?**
   - What we know: CONTEXT says "deviates from standard hit/stand logic at a configurable low probability"
   - What's unclear: Does the 6% apply once for the entire dealer turn, or at each hit/stand decision point?
   - Recommendation: Apply per-decision for more natural behavior. A dealer who should hit 3 times has 3 chances to deviate. This makes the probability more meaningful and produces more varied outcomes.

3. **Insurance when player has blackjack?**
   - What we know: In standard casino rules, insurance IS offered when player has blackjack (it is called "even money"). REQUIREMENTS say insurance when dealer upcard is ace.
   - Recommendation: Do NOT offer insurance when player has blackjack, following the CONTEXT.md flow which implies insurance is for non-blackjack hands. Player blackjack auto-resolves as it does today.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Custom assert functions in `tests/engine.test.js` (browser ES module + console runner) |
| Config file | `tests/test.html` (browser entry point) |
| Quick run command | Open `tests/test.html` in browser, check console |
| Full suite command | Same -- single test file covers all engine tests |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ACTN-04 | Split pair into two hands, played sequentially | unit | `tests/engine.test.js` -- split section | No -- Wave 0 |
| ACTN-05 | No re-split allowed | unit | `tests/engine.test.js` -- split guard | No -- Wave 0 |
| ACTN-06 | No double-after-split | unit | `tests/engine.test.js` -- split guard | No -- Wave 0 |
| ACTN-07 | Insurance at half bet, pays 2:1 | unit | `tests/engine.test.js` -- insurance section | No -- Wave 0 |
| DEAL-02 | Dealer deviates at configurable probability | unit | `tests/engine.test.js` -- deviation section | No -- Wave 0 |
| DEAL-03 | Deviation logged internally | unit | `tests/engine.test.js` -- deviation counter | No -- Wave 0 |
| SND-02 | Stubs fire at AnimationManager lifecycle | manual-only | Visual inspection in browser (animation timing) | N/A |
| SND-03 | Sound activation requires only file path + remove no-op | unit | `tests/engine.test.js` -- SoundManager stubs | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** Open `tests/test.html` in browser, verify all PASS
- **Per wave merge:** Full test suite green + manual visual inspection of split/insurance UI
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/engine.test.js` -- add split tests (split creates 2 hands, split aces auto-stand, no re-split, no double-after-split, per-hand payouts)
- [ ] `tests/engine.test.js` -- add insurance tests (insurance offered when dealer shows ace, half-bet deducted, 2:1 payout on dealer BJ, insurance lost message)
- [ ] `tests/engine.test.js` -- add deviation tests (deviation counter increments, dealer can hit above 17, dealer can stand below 17)
- [ ] `tests/engine.test.js` -- add new SoundManager stub tests (splitPlaced, insurancePlaced, insuranceWon exist and return undefined)

## Sources

### Primary (HIGH confidence)
- `src/engine/GameEngine.js` -- current engine implementation, existing `#playerHands[]` / `#activeHandIndex` / `getAvailableActions()`
- `src/engine/Hand.js` -- immutable hand operations, `createHand()` / `addCardToHand()` / `computeHandValue()`
- `src/ui/UIController.js` -- current game flow orchestration, animation await patterns
- `src/ui/TableRenderer.js` -- DOM rendering, `bj-hand-0` / `bj-hand-1` zones, button state management, bankrupt controls swap pattern
- `src/ui/AnimationManager.js` -- animation lifecycle, `#busy` flag, promise-based flow
- `src/SoundManager.js` -- existing 5 no-op stubs
- `src/constants.js` -- ANIM constants, ASSET_PATHS pattern
- `.planning/phases/03-full-casino-rules/03-CONTEXT.md` -- locked user decisions
- `.planning/REQUIREMENTS.md` -- ACTN-04 through ACTN-07, DEAL-02/03, SND-02/03

### Secondary (MEDIUM confidence)
- Standard blackjack rules (split aces, insurance, 10-value splitting) -- well-established casino conventions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - vanilla JS project, no library choices to make
- Architecture: HIGH - codebase read thoroughly, all extension points identified, patterns well-established
- Pitfalls: HIGH - derived directly from code analysis of existing engine/UI interaction patterns
- Split rules: HIGH - standard casino rules are well-defined; user decisions lock all ambiguous points

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable domain -- blackjack rules do not change)
