# Phase 1: Game Engine - Research

**Researched:** 2026-03-16
**Domain:** Vanilla JavaScript blackjack state machine (headless, no DOM)
**Confidence:** HIGH

## Summary

Phase 1 builds a headless blackjack engine as a pure state machine. The domain is well-understood: standard blackjack rules, a 6-deck shoe with Fisher-Yates shuffle, ace-flexible hand evaluation, and a state machine that transitions through BETTING -> DEALING -> PLAYER_TURN -> DEALER_TURN -> ROUND_OVER. No external dependencies are used -- this is vanilla ES Module JavaScript that runs in any modern browser.

The primary technical challenges are: (1) correct ace counting with the isSoft flag, which has several non-obvious edge cases (A+A = 12 soft, A+A+9 = 21 hard, A+6+5 = 12 hard), (2) the state machine must be pure with no DOM leakage so Phase 2 can wrap it cleanly, and (3) the array-of-hands model must be established now even though split arrives in Phase 3.

**Primary recommendation:** Build three focused modules (Deck.js, Hand.js, GameEngine.js) plus a SoundManager stub module, with a browser-loadable test harness that validates all ace edge cases and full round flows using console.log assertions.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- One file per concern: `src/engine/Deck.js`, `src/engine/Hand.js`, `src/engine/GameEngine.js`, `src/SoundManager.js`
- Each action method (`deal`, `hit`, `stand`, `doubleDown`) returns a plain state snapshot object
- State fields: `phase`, `playerHands`, `dealerHand`, `chips`, `currentBet`, `result`
- Card object: `{ suit, rank, faceDown }`
- Hand object: `{ cards, value, isSoft, isBust, isBlackjack, bet }`
- `playerHands` is an array of hand objects (array-of-hands model for Phase 3 split readiness)
- State machine phases: `BETTING -> DEALING -> PLAYER_TURN -> DEALER_TURN -> ROUND_OVER`
- Test harness: `tests/engine.test.js` (ES module) + `tests/test.html` (open in browser)
- Output: `console.log` PASS/FAIL lines -- no DOM rendering in tests
- Constants inline per module (no shared constants file in Phase 1)
- Integer cents for all chip math

### Claude's Discretion
- Internal shuffle algorithm for the 6-deck shoe
- Cut point position for reshuffle trigger (typically ~75% through shoe)
- Exact structure of the `result` object on ROUND_OVER
- How `faceDown` is managed internally vs in the state snapshot
- SoundManager stub method signatures (beyond the named events: cardDealt, betPlaced, chipsWon, roundWon, bust)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CORE-01 | 6-deck shoe with auto-reshuffle when running low | Deck.js module with Fisher-Yates shuffle, ~75% cut point |
| CORE-02 | Hand value computed as pure function; aces flex 11->1 | Hand.js computeValue() with ace-counting algorithm |
| CORE-03 | Player blackjack pays 3:2 unless dealer also has blackjack (push) | GameEngine payout logic in ROUND_OVER transition |
| CORE-04 | Dealer blackjack beats all non-blackjack player hands | GameEngine deal/reveal logic checks dealer blackjack |
| CORE-05 | Tied values result in push (bet returned) | GameEngine result resolution comparison |
| CORE-06 | Dealer stands on all 17s (hard and soft) | Dealer turn loop: hit while value < 17, stand at >= 17 |
| CORE-07 | All chip math uses integer cents | All bet/payout values stored and computed as integers |
| BET-01 | Player starts with $1,000 in chips | GameEngine initializes chips to 100000 (cents) |
| BET-02 | Player places bet before each hand | BETTING phase requires placeBet() before deal() |
| BET-03 | Min $10, max $500 bet limits | Validation in placeBet(): 1000 <= bet <= 50000 cents |
| BET-04 | Session ends at $0 chips | State check after ROUND_OVER; chips === 0 triggers session end |
| BET-05 | Player can reset chips to $1,000 | resetSession() method on GameEngine |
| ACTN-01 | Player can hit on non-bust hand | hit() draws card, recalculates, auto-transitions on bust |
| ACTN-02 | Player can stand | stand() transitions to DEALER_TURN |
| ACTN-03 | Double down on first two cards | doubleDown() validates 2 cards, doubles bet, draws one, dealer plays |
| DEAL-01 | Dealer hits <= 16, stands >= 17 | Dealer turn loop in GameEngine |
| CODE-02 | No shadowing of reserved words or browser globals | Naming discipline: avoid `class`, `event`, `target`, `name`, `status` etc. |
| CODE-05 | ES Modules with no global scope pollution | All files use export/import, no window.* assignments |
| CODE-06 | GameEngine has zero DOM access | No document.*, window.*, or DOM API calls in engine modules |
| SND-01 | SoundManager ships with no-op stubs | SoundManager.js exports class with empty methods |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JavaScript | ES2020+ | All engine logic | Project constraint: no external dependencies |
| ES Modules (native) | Browser-native | Module system | Project constraint: `<script type="module">` |

### Supporting
No external dependencies. This is a zero-dependency vanilla JS project by design.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom test harness | Jest/Vitest | Project requires browser-loadable tests with no build step |
| Manual shuffle | lodash.shuffle | No external deps allowed; Fisher-Yates is trivial to implement correctly |
| Class-based modules | Functional modules | Classes provide clear encapsulation for Deck/Hand/GameEngine; either works |

**Installation:**
```bash
# No installation needed -- vanilla JS, open index.html in browser
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  engine/
    Deck.js          # 6-deck shoe: create, shuffle, draw, reshuffle detection
    Hand.js          # Hand creation, value computation, ace logic, blackjack detection
    GameEngine.js    # State machine: phases, actions, dealer AI, payouts
  SoundManager.js    # No-op stub for sound events
tests/
  engine.test.js     # ES module test suite
  test.html          # Browser harness that loads test suite
index.html           # Main entry point (minimal in Phase 1)
```

### Pattern 1: Snapshot-Returning State Machine
**What:** Every action method on GameEngine returns a frozen/plain state snapshot object. The caller (future UI) reads the snapshot to decide what to render. The engine never mutates previously returned snapshots.
**When to use:** Always -- this is the core API pattern.
**Example:**
```javascript
// GameEngine.js
export class GameEngine {
  placeBet(amountCents) {
    // validate phase === 'BETTING', validate amount
    this.#currentBet = amountCents;
    this.#chips -= amountCents;
    this.#phase = 'DEALING';
    return this.#getState();
  }

  deal() {
    // validate phase === 'DEALING'
    // deal 2 cards to player, 2 to dealer (one faceDown)
    // check for blackjacks
    this.#phase = 'PLAYER_TURN'; // or ROUND_OVER if blackjack
    return this.#getState();
  }

  hit() { /* ... */ return this.#getState(); }
  stand() { /* ... */ return this.#getState(); }
  doubleDown() { /* ... */ return this.#getState(); }

  #getState() {
    return {
      phase: this.#phase,
      playerHands: this.#playerHands.map(h => ({ ...h, cards: [...h.cards] })),
      dealerHand: { ...this.#dealerHand, cards: [...this.#dealerHand.cards] },
      chips: this.#chips,
      currentBet: this.#currentBet,
      result: this.#result
    };
  }
}
```

### Pattern 2: Pure Hand Value Computation
**What:** Hand value calculation is a pure function that takes a card array and returns `{ value, isSoft, isBust, isBlackjack }`. No mutation, no side effects.
**When to use:** Every time cards change in any hand.
**Example:**
```javascript
// Hand.js
export function computeHandValue(cards) {
  let value = 0;
  let aceCount = 0;

  for (const card of cards) {
    if (card.rank === 'A') {
      aceCount++;
      value += 11;
    } else if (['K', 'Q', 'J'].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank, 10);
    }
  }

  // Demote aces from 11 to 1 as needed
  while (value > 21 && aceCount > 0) {
    value -= 10;
    aceCount--;
  }

  const isSoft = aceCount > 0 && value <= 21;
  const isBust = value > 21;
  const isBlackjack = cards.length === 2 && value === 21;

  return { value, isSoft, isBust, isBlackjack };
}
```

### Pattern 3: Fisher-Yates Shuffle for the Shoe
**What:** The Durstenfeld variant of Fisher-Yates produces an unbiased shuffle in O(n) time. The shoe contains 6 x 52 = 312 cards. A cut point at ~75% (card 234) triggers reshuffle before the next round.
**When to use:** When creating/resetting the shoe.
**Example:**
```javascript
// Deck.js
export class Deck {
  #cards = [];
  #cutPoint;
  #drawIndex = 0;

  constructor(deckCount = 6) {
    this.#cutPoint = Math.floor(deckCount * 52 * 0.75);
    this.reset(deckCount);
  }

  reset(deckCount = 6) {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    this.#cards = [];
    for (let d = 0; d < deckCount; d++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          this.#cards.push({ suit, rank, faceDown: false });
        }
      }
    }
    this.#shuffle();
    this.#drawIndex = 0;
  }

  #shuffle() {
    const arr = this.#cards;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  draw() {
    return { ...this.#cards[this.#drawIndex++], faceDown: false };
  }

  needsReshuffle() {
    return this.#drawIndex >= this.#cutPoint;
  }
}
```

### Pattern 4: faceDown Management
**What:** The dealer's second card is dealt with `faceDown: true`. When the dealer turn begins or blackjack is checked, it is revealed. The state snapshot should reflect the current faceDown status so the UI knows what to show.
**When to use:** During deal (set faceDown on dealer's hole card) and during dealer reveal.

### Anti-Patterns to Avoid
- **Mutating returned state objects:** Never return internal arrays/objects directly. Always return copies/snapshots. If the caller mutates the returned state, it must not corrupt engine internals.
- **DOM access in engine modules:** Zero `document.*`, `window.*`, `alert()`, `console.log` (except tests). The engine must be importable in Node.js or a worker context.
- **Floating-point chip math:** Never use dollars as floats. `$10.50` is `1050` cents internally. All arithmetic stays in integer cents until display formatting.
- **Forgetting to demote multiple aces:** A hand of A+A+A+8 = 21 (two aces demoted to 1). The while-loop demotion handles this, but a naive single-if does not.
- **Checking blackjack on more than 2 cards:** Blackjack is specifically ace + 10-value card on the initial deal (exactly 2 cards). A 3-card 21 is not blackjack.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card shuffling | Custom random sort (`arr.sort(() => Math.random() - 0.5)`) | Fisher-Yates (Durstenfeld variant) | sort-based shuffle is biased; Fisher-Yates is provably unbiased |

**Key insight:** This is a vanilla JS project with no external dependencies allowed. Everything is hand-rolled by design. The only "don't hand-roll" concern is using the correct shuffle algorithm rather than a naive one.

## Common Pitfalls

### Pitfall 1: Incorrect Ace Counting
**What goes wrong:** Hand A+6 = 17 soft. Player hits and gets 5. Now A+6+5 = 12 hard (ace demoted to 1). Forgetting to update `isSoft` or miscounting when multiple aces are present.
**Why it happens:** Developers handle one ace correctly but fail on multi-ace hands.
**How to avoid:** Use the while-loop demotion pattern. Track aceCount (number of aces still counted as 11). `isSoft = aceCount > 0 && value <= 21`.
**Warning signs:** Test cases A+A (should be 12 soft), A+A+9 (should be 21 hard -- both aces demoted? No: 11+1+9=21, one ace as 11, one as 1, isSoft=true). Wait -- let me be precise:
- A+A: 11+1=12, soft (one ace still at 11)
- A+A+9: 11+1+9=21, soft (one ace still at 11)
- A+6: 11+6=17, soft
- A+6+5: 1+6+5=12, hard (ace demoted)
- A+A+A+8: start at 33 (3x11+8), demote twice: 33-10-10=13, one ace still at 11, so soft 13. Wait: 11+1+1+8=21. Let me recount: 3 aces + 8. Start: 11+11+11+8=41. Demote: 41-10=31 (aceCount=2), 31-10=21 (aceCount=1). Value=21, aceCount=1, isSoft=true. So A+A+A+8 = 21 soft.

This complexity is exactly why the test cases matter. The algorithm must be verified against all these cases.

### Pitfall 2: State Machine Phase Violations
**What goes wrong:** Calling `hit()` during BETTING phase, or `placeBet()` during PLAYER_TURN.
**Why it happens:** No phase validation on action methods.
**How to avoid:** Every action method starts with a phase guard: `if (this.#phase !== 'PLAYER_TURN') throw new Error(...)`. Return clear errors.
**Warning signs:** Tests that call actions out of order should throw, not silently corrupt state.

### Pitfall 3: sort-Based Shuffle Bias
**What goes wrong:** Using `array.sort(() => Math.random() - 0.5)` produces a biased shuffle where some permutations are more likely than others.
**Why it happens:** Comparison-based sorts have implementation-dependent behavior with inconsistent comparators.
**How to avoid:** Use Fisher-Yates (Durstenfeld) -- loop backwards, swap with random index in [0, i].
**Warning signs:** Statistical tests on shuffle output show non-uniform distribution.

### Pitfall 4: Dealer Plays When They Shouldn't
**What goes wrong:** Dealer takes cards even when player already busted.
**Why it happens:** State machine always transitions to DEALER_TURN without checking if all player hands busted.
**How to avoid:** After player busts (or all hands bust in future split scenario), skip DEALER_TURN and go straight to ROUND_OVER with loss result.
**Warning signs:** Dealer busting after player already busted should result in player loss, not push.

### Pitfall 5: Double Down Doesn't Validate Chip Balance
**What goes wrong:** Player doubles down but doesn't have enough chips to cover the doubled bet.
**Why it happens:** Missing validation in doubleDown().
**How to avoid:** Check `this.#chips >= this.#currentBet` before allowing double down. If insufficient chips, either reject or allow "double for less" (typically reject in simple implementations).
**Warning signs:** Negative chip balance after double down.

### Pitfall 6: Blackjack Detection Timing
**What goes wrong:** Not checking for dealer/player blackjack immediately after dealing. Round proceeds to PLAYER_TURN when it should resolve immediately.
**Why it happens:** Blackjack check is forgotten or placed after phase transition.
**How to avoid:** In `deal()`, after dealing 4 cards: check player blackjack, check dealer blackjack (peek at hole card), resolve immediately if either has blackjack. Transition to ROUND_OVER, not PLAYER_TURN.
**Warning signs:** Player with blackjack being asked to hit/stand.

### Pitfall 7: Variable Name Shadowing
**What goes wrong:** Using `name`, `status`, `event`, `class` as variable names shadows browser globals or reserved words.
**Why it happens:** These are natural names for game concepts.
**How to avoid:** Use specific names: `playerName`, `roundPhase` (not `status`), `gameEvent`, `cardRank` (not `class`). CODE-02 requires this explicitly.
**Warning signs:** Subtle bugs in browsers where `window.name` or `window.status` behave unexpectedly.

## Code Examples

### Ace Edge Cases -- Test Expectations
```javascript
// These are the exact test cases required by CONTEXT.md

// A + A = 12 soft (11 + 1, one ace still at 11)
assert(computeHandValue([ace, ace]), { value: 12, isSoft: true, isBust: false, isBlackjack: false });

// A + A + 9 = 21 soft (11 + 1 + 9, one ace still at 11)
assert(computeHandValue([ace, ace, nine]), { value: 21, isSoft: true, isBust: false, isBlackjack: false });

// A + 6 = 17 soft
assert(computeHandValue([ace, six]), { value: 17, isSoft: true, isBust: false, isBlackjack: false });

// A + 6 + 5 = 12 hard (ace demoted: 1 + 6 + 5)
assert(computeHandValue([ace, six, five]), { value: 12, isSoft: false, isBust: false, isBlackjack: false });

// A + A + A + 8 = 21 soft (11 + 1 + 1 + 8, one ace at 11)
assert(computeHandValue([ace, ace, ace, eight]), { value: 21, isSoft: true, isBust: false, isBlackjack: false });
```

### Payout Logic in Integer Cents
```javascript
// Regular win: 1:1 payout
// Bet 1000 cents ($10) -> win 1000, return bet: chips += 2000

// Blackjack win: 3:2 payout
// Bet 1000 cents ($10) -> win 1500, return bet: chips += 2500
// Math.floor(bet * 3 / 2) for odd cent amounts

// Push: return bet
// chips += bet (1000)

// Loss: bet already deducted
// chips += 0

function calculatePayout(bet, outcome) {
  switch (outcome) {
    case 'BLACKJACK': return bet + Math.floor(bet * 3 / 2); // bet back + 3:2 winnings
    case 'WIN': return bet * 2;       // bet back + 1:1 winnings
    case 'PUSH': return bet;          // bet returned
    case 'LOSS': return 0;            // already deducted
  }
}
```

### Result Object Structure (Claude's Discretion)
```javascript
// Recommended result object for ROUND_OVER phase
const result = {
  outcome: 'WIN' | 'LOSS' | 'PUSH' | 'BLACKJACK',  // primary outcome
  playerValue: 20,       // final player hand value
  dealerValue: 18,       // final dealer hand value
  payout: 2000,          // amount returned to chips (cents)
  handResults: [         // per-hand results (array for split readiness)
    { outcome: 'WIN', payout: 2000 }
  ]
};
```

### Browser Test Harness Pattern
```javascript
// tests/engine.test.js
import { Deck } from '../src/engine/Deck.js';
import { computeHandValue, createHand } from '../src/engine/Hand.js';
import { GameEngine } from '../src/engine/GameEngine.js';

let passed = 0;
let failed = 0;

function assert(actual, expected, label) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    console.log(`PASS: ${label}`);
    passed++;
  } else {
    console.log(`FAIL: ${label}`);
    console.log(`  Expected: ${expectedStr}`);
    console.log(`  Actual:   ${actualStr}`);
    failed++;
  }
}

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    console.log(`PASS: ${label}`);
    passed++;
  } else {
    console.log(`FAIL: ${label} -- expected ${expected}, got ${actual}`);
    failed++;
  }
}

// ... test cases ...

console.log(`\nResults: ${passed} passed, ${failed} failed`);
```

```html
<!-- tests/test.html -->
<!DOCTYPE html>
<html>
<head><title>Blackjack Engine Tests</title></head>
<body>
  <h1>Open browser console to see test results</h1>
  <script type="module" src="engine.test.js"></script>
</body>
</html>
```

### SoundManager No-Op Stub
```javascript
// src/SoundManager.js
export class SoundManager {
  cardDealt() {}
  betPlaced() {}
  chipsWon() {}
  roundWon() {}
  bust() {}
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `var` declarations | `const`/`let` with block scoping | ES2015+ | Prevents accidental global leaks |
| Prototype-based classes | `class` with `#private` fields | ES2022+ | True encapsulation for engine internals |
| CommonJS `require()` | ES Modules `import`/`export` | Stable in browsers since ~2018 | Native browser support, no bundler needed |
| `Math.random()` sort shuffle | Fisher-Yates shuffle | Always was the correct approach | Unbiased permutations |

**Deprecated/outdated:**
- `var` keyword: use `const` by default, `let` when reassignment needed
- IIFE module pattern: ES Modules replace this entirely
- `arguments` object: use rest parameters `(...args)`

## Open Questions

1. **3:2 Payout Rounding**
   - What we know: Blackjack pays 3:2. For odd-cent bets, `bet * 3 / 2` produces a non-integer.
   - What's unclear: Whether to floor, round, or ceil the result.
   - Recommendation: Use `Math.floor(bet * 3 / 2)`. Standard casino practice rounds down (in favor of house). With $10 minimum bet (1000 cents), this only matters for odd multiples -- and 1000 * 3 / 2 = 1500 (clean). Floor is the safe default.

2. **Dealer Blackjack Peek Timing**
   - What we know: Dealer checks hole card for blackjack when showing an ace or 10-value card.
   - What's unclear: Whether to implement the peek mechanic (dealer checks before player acts) or simplify.
   - Recommendation: Implement peek. If dealer has blackjack, round ends immediately (player doesn't waste actions). This is standard casino behavior and required by CORE-04.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Custom browser-loadable harness (vanilla JS, no framework) |
| Config file | none -- `tests/test.html` loads `tests/engine.test.js` as ES module |
| Quick run command | Open `tests/test.html` in browser, check console |
| Full suite command | Open `tests/test.html` in browser, check console |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CORE-01 | 6-deck shoe deals and reshuffles at cut point | unit | Open test.html, check console | No -- Wave 0 |
| CORE-02 | Ace value computation for all edge cases | unit | Open test.html, check console | No -- Wave 0 |
| CORE-03 | Player blackjack pays 3:2, push if dealer also | unit | Open test.html, check console | No -- Wave 0 |
| CORE-04 | Dealer blackjack beats non-blackjack hands | unit | Open test.html, check console | No -- Wave 0 |
| CORE-05 | Tied values result in push | unit | Open test.html, check console | No -- Wave 0 |
| CORE-06 | Dealer stands on all 17s | unit | Open test.html, check console | No -- Wave 0 |
| CORE-07 | Chip math in integer cents | unit | Open test.html, check console | No -- Wave 0 |
| BET-01 | Start with 100000 cents | unit | Open test.html, check console | No -- Wave 0 |
| BET-02 | Must place bet before deal | unit | Open test.html, check console | No -- Wave 0 |
| BET-03 | Bet limits enforced | unit | Open test.html, check console | No -- Wave 0 |
| BET-04 | Session ends at 0 chips | unit | Open test.html, check console | No -- Wave 0 |
| BET-05 | Reset chips to starting amount | unit | Open test.html, check console | No -- Wave 0 |
| ACTN-01 | Hit draws card, busts if over 21 | unit | Open test.html, check console | No -- Wave 0 |
| ACTN-02 | Stand transitions to dealer turn | unit | Open test.html, check console | No -- Wave 0 |
| ACTN-03 | Double down: validate, double bet, one card | unit | Open test.html, check console | No -- Wave 0 |
| DEAL-01 | Dealer hits <= 16, stands >= 17 | unit | Open test.html, check console | No -- Wave 0 |
| CODE-02 | No shadowing of reserved words | manual | Code review | N/A -- manual |
| CODE-05 | ES Modules, no globals | manual | Code review + console check for window leaks | N/A -- manual |
| CODE-06 | Zero DOM access in engine | manual | Code review -- grep for document/window | N/A -- manual |
| SND-01 | SoundManager has no-op stubs | unit | Open test.html, check console | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** Open `tests/test.html` in browser, verify all PASS in console
- **Per wave merge:** Full test suite via test.html
- **Phase gate:** All tests PASS, zero FAIL lines in console

### Wave 0 Gaps
- [ ] `tests/engine.test.js` -- full test suite covering all requirements above
- [ ] `tests/test.html` -- browser harness HTML file
- [ ] No framework install needed -- vanilla JS test harness

## Sources

### Primary (HIGH confidence)
- Blackjack rules: standard casino rules are well-documented and stable
- Fisher-Yates shuffle: [Wikipedia - Fisher-Yates shuffle](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle) -- verified algorithm correctness
- [Mike Bostock's shuffle visualization](https://bost.ocks.org/mike/shuffle/) -- demonstrates bias in naive approaches

### Secondary (MEDIUM confidence)
- [PlayUSA Blackjack Rules](https://www.playusa.com/blackjack/rules/) -- verified standard dealer behavior
- [MDN JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) -- ES Module browser support

### Tertiary (LOW confidence)
- None -- all findings verified against authoritative sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- vanilla JS with no dependencies, well-understood domain
- Architecture: HIGH -- state machine pattern is straightforward, decisions locked in CONTEXT.md
- Pitfalls: HIGH -- blackjack ace counting edge cases are well-documented, shuffle bias is well-known

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable domain, no moving parts)
