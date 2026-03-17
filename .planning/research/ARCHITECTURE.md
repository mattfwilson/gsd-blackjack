# Architecture Patterns

**Domain:** Browser-based single-player blackjack (vanilla JS, no build step)
**Researched:** 2026-03-16
**Confidence:** HIGH -- vanilla JS game architecture is a well-established domain with stable patterns.

## Recommended Architecture

The game follows a **Model-View-Controller variant** where a central GameEngine owns all state, a DOM-based UI layer renders that state, and manager modules (AnimationManager, SoundManager, StatsManager) handle cross-cutting concerns. Communication is event-driven: the GameEngine emits state changes, the UI subscribes and renders, and managers hook into specific events.

```
                    +------------------+
                    |   GameEngine     |  (state machine, rules, scoring)
                    |   owns: state,   |
                    |   deck, hands,   |
                    |   bets, round    |
                    +--------+---------+
                             |
                    emits events (custom EventEmitter or DOM CustomEvents)
                             |
          +------------------+------------------+
          |                  |                  |
  +-------v------+  +-------v-------+  +-------v--------+
  |   UIManager  |  | AnimationMgr  |  |  StatsManager  |
  | (DOM reads/  |  | (queue-based  |  | (aggregates,   |
  |  writes)     |  |  sequencer)   |  |  persists)     |
  +--------------+  +-------+-------+  +----------------+
                            |
                    +-------v-------+
                    | SoundManager  |
                    | (no-op stubs, |
                    |  hooks into   |
                    |  anim events) |
                    +---------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | Owns |
|-----------|---------------|-------------------|------|
| **GameEngine** | Game state machine, rule enforcement, scoring, round lifecycle | Emits events to all listeners | Game state, deck, hands, bet ledger, round phase |
| **DealerAI** | Decides hit/stand for dealer hand, includes irrationality logic | Called by GameEngine during dealer turn | Irrationality probability, threshold config |
| **Deck** | Card creation, shuffling, drawing | Owned/called by GameEngine | Card array, discard pile |
| **Hand** | Holds cards, computes value (ace-aware), tracks bust/blackjack | Owned by GameEngine (player hand(s) + dealer hand) | Cards array, computed value |
| **UIManager** | All DOM reads and writes, button state, chip display, card rendering | Listens to GameEngine events; calls GameEngine actions on user input | DOM element references, CSS class toggling |
| **AnimationManager** | Sequential animation queue, timing orchestration | Listens to GameEngine events; emits animation lifecycle events (start/complete) | Animation queue, ANIM constants, running state |
| **SoundManager** | Audio playback (initially no-op stubs) | Listens to AnimationManager events (not GameEngine directly) | Audio element pool, sound file paths |
| **StatsManager** | Session + cumulative stat aggregation, persistence | Listens to GameEngine round-end events; reads/writes localStorage | Session stats object, cumulative stats, persistence layer |
| **Constants** | All magic numbers: ANIM timings, bet limits, dealer thresholds, starting chips | Imported by all modules | Nothing (pure config) |

### Why These Boundaries

**GameEngine does not know about DOM, animation, or sound.** It is a pure state machine that could run headless in a test. This is the single most important architectural decision -- it makes the game testable and keeps complexity contained.

**AnimationManager does not know about game rules.** It receives instructions like "deal card to position X" and sequences them. It does not decide what card or when a round ends.

**SoundManager hooks into AnimationManager, not GameEngine.** Sound is synchronized to visual events (card lands on table, chips slide), not logical events (hand value changes). This means SoundManager listens for animation lifecycle events like `animationComplete:dealCard` rather than game events like `cardDealt`.

**StatsManager hooks into GameEngine, not UI.** Stats are computed from game state, not from what the user sees. This keeps stats accurate even if animations are skipped.

### Data Flow

```
User clicks "Hit"
  --> UIManager calls gameEngine.playerHit()
  --> GameEngine updates state (adds card to player hand)
  --> GameEngine emits "cardDealt" event with { target: "player", card, handValue }
  --> UIManager receives event, updates hand value display
  --> AnimationManager receives event, queues deal animation
  --> AnimationManager starts animation, emits "animStart:dealCard"
  --> SoundManager hears "animStart:dealCard", plays card-deal sound (or no-op)
  --> Animation completes, AnimationManager emits "animComplete:dealCard"
  --> AnimationManager checks queue, runs next animation or emits "queueEmpty"
  --> UIManager hears "queueEmpty", re-enables action buttons

User clicks "Stand"
  --> UIManager calls gameEngine.playerStand()
  --> GameEngine flips to dealer turn phase
  --> GameEngine emits "dealerTurnStart"
  --> AnimationManager queues dealer hole card flip animation
  --> GameEngine calls dealerAI.decide(dealerHand) in a loop
  --> Each dealer draw emits "cardDealt" with { target: "dealer", ... }
  --> After dealer finishes, GameEngine resolves bets, emits "roundEnd" with result
  --> StatsManager receives "roundEnd", updates session + cumulative stats, persists
  --> UIManager receives "roundEnd", shows result, enables "New Hand" / "Bet" controls
```

**Key principle: state changes are instantaneous, animations are queued.** The GameEngine resolves the entire dealer turn synchronously (or in a tight async loop), emitting events for each card. The AnimationManager queues all those animations and plays them sequentially with delays. The UI waits for the animation queue to drain before enabling user input. This separation means:

1. Game logic is never blocked by animation timing
2. Animation speed can be changed without touching game logic
3. Tests can run without waiting for animations

### Game State Machine

The GameEngine operates as a finite state machine with these phases:

```
IDLE --> BETTING --> DEALING --> PLAYER_TURN --> DEALER_TURN --> RESOLVING --> ROUND_END --> BETTING
                                    |                                            |
                                    +--> SPLITTING (sub-state) -+                |
                                    |                           |                |
                                    +--> INSURANCE (sub-state) -+                |
                                                                                 |
                                                            (if bankrupt) --> GAME_OVER
```

Each phase defines which actions are legal:
- **BETTING**: `placeBet(amount)` only
- **DEALING**: No user actions; engine auto-deals
- **PLAYER_TURN**: `hit()`, `stand()`, `doubleDown()`, `split()` (if eligible), `insurance()` (if eligible)
- **DEALER_TURN**: No user actions; engine auto-plays dealer via DealerAI
- **RESOLVING**: No user actions; engine computes payouts
- **ROUND_END**: `newHand()` or `cashOut()`

The UIManager enables/disables buttons based on the current phase. This is enforced in GameEngine (throws or ignores invalid actions) AND in UI (buttons disabled). Belt and suspenders.

## Patterns to Follow

### Pattern 1: Event Bus (Simple Pub/Sub)

**What:** A lightweight event emitter that all modules communicate through. Not DOM events -- a plain JS class.

**Why:** Decouples all modules. GameEngine does not import UIManager. AnimationManager does not import SoundManager. They all emit/listen on a shared bus.

**When:** All inter-module communication.

```javascript
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
  }

  off(eventName, callback) {
    const cbs = this.listeners.get(eventName);
    if (cbs) {
      this.listeners.set(eventName, cbs.filter(cb => cb !== callback));
    }
  }

  emit(eventName, data) {
    const cbs = this.listeners.get(eventName);
    if (cbs) {
      cbs.forEach(cb => cb(data));
    }
  }
}
```

**Why not DOM CustomEvents:** DOM events bubble, require a DOM node target, and add unnecessary coupling to the document. A plain event bus is simpler, faster, and testable without a DOM.

### Pattern 2: Animation Queue with Promises

**What:** AnimationManager maintains a FIFO queue of animation descriptors. Each animation returns a Promise that resolves when the CSS transition/animation ends. The queue processes sequentially.

**When:** Any time the game needs to show card movement, flips, chip changes.

```javascript
class AnimationManager {
  constructor(eventBus) {
    this.queue = [];
    this.running = false;
    this.eventBus = eventBus;
  }

  enqueue(animationDescriptor) {
    this.queue.push(animationDescriptor);
    if (!this.running) {
      this.processQueue();
    }
  }

  async processQueue() {
    this.running = true;
    while (this.queue.length > 0) {
      const anim = this.queue.shift();
      this.eventBus.emit(`animStart:${anim.type}`, anim);
      await this.runAnimation(anim);
      this.eventBus.emit(`animComplete:${anim.type}`, anim);
    }
    this.running = false;
    this.eventBus.emit('queueEmpty');
  }

  runAnimation(anim) {
    return new Promise(resolve => {
      // Apply CSS classes/transforms, listen for transitionend
      const element = anim.element;
      element.classList.add(anim.cssClass);
      const onEnd = () => {
        element.removeEventListener('transitionend', onEnd);
        resolve();
      };
      element.addEventListener('transitionend', onEnd);
      // Safety timeout in case transitionend never fires
      setTimeout(resolve, anim.duration + 50);
    });
  }
}
```

**Critical detail:** The safety timeout. CSS `transitionend` does not fire if the element is hidden, removed, or if the property value does not actually change. Always include a fallback timeout slightly longer than the expected duration.

### Pattern 3: ANIM Constants Block with CSS Custom Property Sync

**What:** A single object holds all animation timing values. On initialization, these are written to CSS custom properties on `:root`. CSS transitions reference the custom properties. JS references the object.

**When:** Everywhere animation timing is needed.

```javascript
const ANIM = {
  DEAL_DURATION: 400,      // ms - card slides from deck to hand position
  DEAL_STAGGER: 200,       // ms - delay between sequential card deals
  FLIP_DURATION: 300,      // ms - card flip reveal
  DISCARD_DURATION: 500,   // ms - cards sweep off table
  CHIP_SLIDE: 300,         // ms - chips move to/from pot
};

// Sync to CSS on init
function syncAnimConstants() {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(ANIM)) {
    root.style.setProperty(`--anim-${key.toLowerCase().replace(/_/g, '-')}`, `${value}ms`);
  }
}
```

CSS then uses:
```css
.bj-card--dealing {
  transition: transform var(--anim-deal-duration) ease-out;
}
```

**Why this matters:** Changing `ANIM.DEAL_DURATION = 200` in one place updates both JS timeout calculations and CSS transition speeds. No hunting for magic numbers.

### Pattern 4: Dealer AI as a Pure Function Module

**What:** DealerAI is a module with a `decide(hand, config)` function that returns `"hit"` or `"stand"`. It has no state of its own beyond configuration.

**When:** During the dealer turn phase.

```javascript
const DealerAI = {
  decide(handValue, isSoft, config) {
    // Irrationality check
    if (Math.random() < config.irrationalityRate) {
      // Deviate: stand when should hit, or hit when should stand
      return handValue <= 16 ? 'stand' : 'hit';
    }
    // Standard logic
    if (handValue < 17) return 'hit';
    if (handValue === 17 && isSoft && config.dealerHitsSoft17) return 'hit';
    return 'stand';
  }
};
```

**Why pure function:** Testable in isolation. Easy to adjust irrationality rate. No coupling to game state beyond the arguments passed in.

### Pattern 5: Module Pattern via ES Modules

**What:** Each component lives in its own `.js` file, exported as an ES module. The entry point (`main.js`) imports and wires them together.

**When:** File organization for the entire project.

```
index.html
css/
  styles.css
  animations.css
js/
  main.js            -- entry point, wires modules together
  eventBus.js        -- shared event bus
  constants.js       -- ANIM, GAME config
  gameEngine.js      -- state machine, rules
  deck.js            -- card creation, shuffle, draw
  hand.js            -- card collection, value computation
  dealerAI.js        -- dealer decision logic
  uiManager.js       -- all DOM interaction
  animationManager.js -- animation queue
  soundManager.js    -- audio stubs
  statsManager.js    -- stats aggregation + persistence
assets/
  cards/             -- card images (user-supplied)
  sounds/            -- audio files (user-supplied later)
```

**Why ES modules:** Native browser support (no build step needed). `<script type="module" src="js/main.js">` works in all modern browsers. Provides real encapsulation. The `type="module"` attribute also gives strict mode and deferred execution for free.

## Anti-Patterns to Avoid

### Anti-Pattern 1: God Object GameEngine

**What:** Putting DOM manipulation, animation logic, and stats tracking inside GameEngine.

**Why bad:** Untestable. Changing animation speed requires editing game logic files. Adding a sound requires touching scoring code. Everything breaks everything.

**Instead:** GameEngine is a pure state machine. It emits events. Other modules react to those events. GameEngine never imports UIManager, AnimationManager, or SoundManager.

### Anti-Pattern 2: Animation Blocking Game Logic

**What:** Using `await animationManager.animate(...)` inside GameEngine methods, so the game state is not resolved until animations complete.

**Why bad:** Tests must wait for animations. Game logic becomes timing-dependent. Skipping animations breaks the game. If an animation fails, the game hangs.

**Instead:** GameEngine resolves state immediately and emits events. AnimationManager receives those events and queues visual updates. The UIManager waits for `queueEmpty` before re-enabling user input. The game state is always ahead of what the user sees.

### Anti-Pattern 3: Scattered Timing Constants

**What:** Hard-coding `setTimeout(fn, 400)` in various files, or putting `transition: transform 0.4s` directly in CSS without a custom property.

**Why bad:** Changing animation speed requires finding every instance. CSS and JS timings drift out of sync. Debugging timing issues becomes a hunt.

**Instead:** All timing in the `ANIM` constants block, synced to CSS custom properties.

### Anti-Pattern 4: Direct localStorage Calls Throughout Codebase

**What:** Calling `localStorage.setItem(...)` in GameEngine, UIManager, or anywhere stats are touched.

**Why bad:** No single source of truth for persisted data. Race conditions. Hard to migrate to File System Access API later. Hard to test.

**Instead:** StatsManager owns all persistence. It exposes `save()` and `load()` methods. Internally it uses localStorage (with File System Access API as a future upgrade path). No other module touches storage directly.

### Anti-Pattern 5: Using setInterval for Card Deal Sequencing

**What:** Using `setInterval` to deal cards one at a time with fixed delays.

**Why bad:** Interval drift. No way to know when the sequence is done. Cancellation is error-prone. Does not compose with other animation sequences.

**Instead:** The animation queue with Promises (Pattern 2). Each deal is an enqueued animation. The queue processes them sequentially. Completion is a resolved Promise. The `queueEmpty` event signals "all animations done."

## How AnimationManager Queue Integrates with Game State Transitions

The key insight: **game state is always resolved before animations begin.**

When the player hits and the GameEngine deals a card:

1. GameEngine computes the new hand value, checks for bust, updates state
2. GameEngine emits `cardDealt` with full state payload (card, hand value, bust status)
3. AnimationManager hears `cardDealt`, enqueues a deal animation
4. UIManager hears `cardDealt`, updates the hand value text immediately (or waits for animation -- design choice; recommend updating after animation for better UX)
5. If the player busted, GameEngine also emits `playerBust` and transitions to RESOLVING
6. AnimationManager queues the bust indication after the deal animation
7. UIManager disables all action buttons immediately (state is RESOLVING, not PLAYER_TURN)
8. When animation queue drains (`queueEmpty`), UIManager shows the round result

For the dealer turn, the entire sequence of dealer draws is resolved by GameEngine first, emitting a burst of `cardDealt` events. AnimationManager queues them all and plays them out with stagger delays. The player watches the dealer "think" through animations, but the outcome is already determined.

This means: **the animation queue is a visual replay of already-resolved game events.**

## How SoundManager Hooks into AnimationManager Events

SoundManager listens to AnimationManager lifecycle events, not GameEngine events:

| AnimationManager Event | SoundManager Action |
|------------------------|---------------------|
| `animStart:dealCard` | Play card-slide sound |
| `animComplete:dealCard` | Play card-land sound (optional) |
| `animStart:flipCard` | Play card-flip sound |
| `animStart:chipSlide` | Play chip-clink sound |
| `animComplete:resolveRound` (win) | Play win-chime sound |
| `animComplete:resolveRound` (bust) | Play bust sound |

Why this mapping: Sound should be synchronized to what the player sees, not to internal state changes. If we hooked SoundManager to GameEngine events, sounds would play before the card visually appears (because game state resolves before animations).

SoundManager structure:

```javascript
class SoundManager {
  constructor(eventBus) {
    this.sounds = {
      dealCard: null,    // no-op until audio file provided
      flipCard: null,
      chipSlide: null,
      winChime: null,
      bustSound: null,
    };

    eventBus.on('animStart:dealCard', () => this.play('dealCard'));
    eventBus.on('animStart:flipCard', () => this.play('flipCard'));
    eventBus.on('animStart:chipSlide', () => this.play('chipSlide'));
    // ... etc
  }

  play(soundName) {
    const audio = this.sounds[soundName];
    if (!audio) return; // no-op stub: sound file not loaded
    audio.currentTime = 0;
    audio.play().catch(() => {}); // swallow autoplay errors silently
  }

  loadSound(soundName, filePath) {
    this.sounds[soundName] = new Audio(filePath);
  }
}
```

Activating a sound later = calling `soundManager.loadSound('dealCard', 'assets/sounds/deal.mp3')`. No code changes needed.

## How StatsManager Persists to localStorage

StatsManager listens to `roundEnd` events from GameEngine and maintains two data structures:

```javascript
// Session stats (reset each page load / new session)
{
  sessionId: "2026-03-16T14:30:00Z",
  handsPlayed: 0,
  handsWon: 0,
  handsLost: 0,
  handsPushed: 0,
  moneyWagered: 0,
  moneyWon: 0,
  moneyLost: 0,
  netEarnings: 0,
  currentStreak: 0,
  bestWinStreak: 0,
  dealerHits: 0,       // total dealer hit decisions observed
  dealerStands: 0,     // total dealer stand decisions observed
  playerHits: 0,       // total player hit decisions
  playerStands: 0,     // total player stand decisions
}

// Cumulative stats (persisted across sessions)
{
  totalSessions: 0,
  totalHandsPlayed: 0,
  totalMoneyWon: 0,
  totalMoneyLost: 0,
  totalNetEarnings: 0,
  bestWinStreak: 0,
  sessions: [           // array of completed session summaries
    { sessionId, handsPlayed, netEarnings, ... }
  ]
}
```

Persistence flow:
1. On page load, StatsManager reads cumulative stats from `localStorage.getItem('bj-cumulative-stats')`
2. After each round, StatsManager updates session stats in memory (no write yet)
3. On session end (user clicks "Cash Out", or `beforeunload` fires), StatsManager:
   - Appends current session summary to cumulative `sessions` array
   - Updates cumulative totals
   - Writes to `localStorage.setItem('bj-cumulative-stats', JSON.stringify(cumulative))`
4. The `beforeunload` handler is a safety net -- primary save is on explicit cash-out

**localStorage key:** `bj-cumulative-stats` (prefixed to avoid collisions).

**File System Access API (future):** If upgraded later, StatsManager's `save()` and `load()` methods are the only code that changes. Nothing else in the app knows or cares about the persistence mechanism.

## Suggested Build Order

Build order follows dependency chains. Each layer requires the one(s) above it.

```
Layer 1: Foundation (no dependencies)
  constants.js, eventBus.js, deck.js, hand.js

Layer 2: Core Logic (depends on Layer 1)
  dealerAI.js, gameEngine.js

Layer 3: Visual Layer (depends on Layer 2)
  uiManager.js (basic: buttons, hand display, no animation)

Layer 4: Animation (depends on Layer 3)
  animationManager.js (queue + CSS integration)

Layer 5: Cross-cutting (depends on Layers 2-4)
  soundManager.js (hooks into animationManager events)
  statsManager.js (hooks into gameEngine events)

Layer 6: Polish
  Stats history view UI
  Animation tuning
  Edge case handling (split, insurance, double-down animations)
```

**Rationale:**

- **Layer 1 first** because GameEngine cannot function without Deck, Hand, and constants. EventBus is the communication backbone.
- **Layer 2 second** because you need a playable game (even headless / console-logged) before building UI. This validates rules and scoring.
- **Layer 3 third** because once game logic works, you need to see it. Start with a basic DOM renderer that updates on events -- no animation yet. This gives a playable (ugly) game.
- **Layer 4 fourth** because animation is an enhancement over a working game. Adding the AnimationManager queue on top of a working static UI is straightforward.
- **Layer 5 last** because sound and stats are pure additions that don't affect gameplay. They subscribe to events that already exist.

**Critical dependency:** UIManager must disable action buttons while AnimationManager queue is processing. This means UIManager needs to listen to both GameEngine (for state phase) and AnimationManager (for `queueEmpty`). Wire this carefully: buttons are disabled when phase is not PLAYER_TURN OR when animation queue is running.

## Scalability Considerations

| Concern | This Project (1 player) | If Extended (multiple AI players) |
|---------|------------------------|-----------------------------------|
| State complexity | Single state machine, straightforward | Multiple hands per round, need hand-indexing |
| Animation queue | Sequential queue sufficient | May need parallel queues (one per seat) |
| DOM nodes | ~20 card elements max | Could reach 50+; consider object pooling |
| localStorage | Well under 5MB limit | Still fine; localStorage limit is 5-10MB |
| Event volume | Low (few events per second) | Moderate; event bus remains fine |

For this project's scope (single player, single browser), none of these are concerns. The architecture handles the requirements comfortably.

## File / Module Dependency Graph

```
main.js
  imports: eventBus, constants, GameEngine, DealerAI, Deck,
           UIManager, AnimationManager, SoundManager, StatsManager

gameEngine.js
  imports: eventBus, constants, Deck, Hand, DealerAI

uiManager.js
  imports: eventBus, constants

animationManager.js
  imports: eventBus, constants (ANIM block)

soundManager.js
  imports: eventBus

statsManager.js
  imports: eventBus

dealerAI.js
  imports: constants (dealer thresholds)

deck.js
  imports: (none)

hand.js
  imports: (none)

constants.js
  imports: (none)

eventBus.js
  imports: (none)
```

**Note:** `main.js` is the only file that imports everything. It creates instances and wires them together (dependency injection). No module imports another module's instance directly -- they all communicate through the EventBus passed in at construction time.

## Sources

- Architecture patterns based on established vanilla JS game development practices (event-driven architecture, state machine patterns, animation queue patterns). These are stable, well-documented patterns that have not changed materially.
- CSS custom properties for JS/CSS timing sync is a standard technique documented in MDN Web Docs.
- ES modules (`type="module"`) browser support is universal in modern browsers (Chrome 61+, Firefox 60+, Safari 11+, Edge 16+).
- localStorage 5MB limit is per-origin, documented in the Web Storage API spec.
- `transitionend` event reliability caveats are documented in MDN and are a known browser behavior.

**Confidence:** HIGH. Vanilla JS game architecture is a mature, stable domain. The patterns recommended here have been in widespread use for years and are not subject to framework churn.
