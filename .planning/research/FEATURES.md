# Feature Landscape

**Domain:** Browser-based single-player blackjack game
**Researched:** 2026-03-16
**Confidence:** MEDIUM (based on domain expertise; web search unavailable for live verification)

## Table Stakes

Features players expect from any blackjack game. Missing any of these and the game feels broken or amateurish.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Standard blackjack rules (hit, stand, bust at 21+) | This IS the game. Without correct rules players leave immediately. | Low | Ace as 1/11 logic is the fiddly part |
| Dealer follows house rules (hit <=16, stand >=17) | Players know these rules; incorrect dealer play destroys trust | Low | PROJECT.md adds intentional deviation on top of this baseline |
| Betting with chips before each hand | No bet = no stakes = no tension. Betting is core to blackjack's appeal | Low | $1,000 starting balance per PROJECT.md |
| Double down | Standard player action; omitting it frustrates experienced players | Low | Doubles the bet, deals exactly one more card |
| Split pairs | Expected by anyone who has played real blackjack | Medium | Splitting aces (one card only) and re-splitting are edge cases that add complexity |
| Insurance (dealer shows ace) | Standard casino offering; players expect to see the prompt | Low | 2:1 payout, side bet of half original wager |
| Card deal animation | Static card placement looks like a 1990s Flash game. Smooth dealing is baseline expectation in 2026 | Medium | AnimationManager handles this per PROJECT.md |
| Dealer hole card reveal | The dramatic flip when dealer plays is a core moment of blackjack | Low | Tied to animation system |
| Blackjack (natural 21) detection and 3:2 payout | Fundamental rule; getting this wrong is a game-breaking bug | Low | Must handle both player and dealer naturals |
| Chip balance display (current session) | Players need to know where they stand at all times | Low | Prominent, always visible |
| Clear game state indicators | Player must always know: whose turn it is, hand totals, available actions | Low | Disabling unavailable action buttons, showing totals on hands |
| Responsive card layout | Cards must not overflow or overlap illegibly on common screen sizes | Medium | CSS layout concern; no framework means manual responsive work |
| New round / replay flow | After a hand ends, starting the next one must be frictionless (one click or auto) | Low | Bet -> deal -> play -> resolve -> repeat |

## Differentiators

Features that set this game apart. Not expected, but valued when present. Several of these are already in PROJECT.md's requirements.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dealer irrationality (occasional rule-breaking) | Unique tension mechanic. No other casual blackjack game does this. Players wonder "will the dealer play straight or go rogue?" | Medium | Already in PROJECT.md. Probability tuning is important -- too frequent = frustrating, too rare = invisible. Suggest 5-10% deviation rate with visual tell |
| Session + cumulative stats with history | Most browser blackjack games are stateless throwaway experiences. Persistent stats create a reason to return | Medium | Already in PROJECT.md. localStorage persistence. Key stats: win rate, biggest win/loss, longest streak, hands played |
| Per-round stat tracking (dealer hit probability, player hit probability) | Gives analytically-minded players something to chew on; rare in casual games | Low | Already in PROJECT.md. Computed from running totals |
| Win/loss streak tracking and display | Emotional hook -- streaks make gambling exciting. Showing "5-hand win streak!" adds drama | Low | Already in PROJECT.md |
| Sound effect system (ready for drop-in audio) | Sound transforms feel from "web page" to "game." The architecture being ready means sound can be added without code changes | Low | SoundManager stubs already in PROJECT.md |
| Smooth card discard/sweep animation at round end | Most browser games just clear the table. A sweep animation adds polish | Medium | Already in PROJECT.md via AnimationManager |
| Configurable animation timing (single constants block) | Lets the user (developer) tune feel without hunting through code | Low | Already in PROJECT.md. `ANIM` constants block + CSS custom properties |
| Session history view (past sessions browsable) | Players can look back at how previous sessions went. Creates a "career" feel | Medium | Already in PROJECT.md. Requires structured storage and a separate view/panel |
| Visual "tell" when dealer deviates | Subtle hint that something unusual happened. Rewards attentive players | Low | Not in PROJECT.md but strongly recommended. Could be a brief glow, card color shift, or dealer avatar twitch |
| Keyboard shortcuts (H=hit, S=stand, D=double, etc.) | Power users and accessibility benefit. Rare in casual browser games | Low | Not in PROJECT.md. Simple keydown listener mapping |
| Running count / basic strategy hint (toggle) | Educational angle -- helps new players learn. Can be toggled off for purists | Medium | Not in PROJECT.md. Would need basic strategy chart logic |

## Anti-Features

Features to explicitly NOT build. These add complexity without matching the project's goals.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multiplayer / networked play | Explicitly out of scope (PROJECT.md). Adds server dependency, latency handling, synchronization -- massive complexity for a single-player game | Keep single-player. The dealer irrationality mechanic provides the "opponent unpredictability" that multiplayer would |
| Real money / payment integration | Out of scope and introduces legal/regulatory burden | Chips are play money with no cash value |
| User accounts / OAuth | Out of scope. Adds backend dependency, password management, security surface | localStorage for stats. No login required |
| Card counting trainer mode | Tempting feature, but scope creep. Changes the game from "play blackjack" to "learn to count cards" -- different product | If desired later, build as separate mode/page, not integrated into core game |
| Multiple hand positions (play 2-3 hands simultaneously) | Significant UI and game logic complexity. Changes the betting flow, split logic, and layout | Single hand keeps UI clean and logic simple |
| Side bets (Perfect Pairs, 21+3, etc.) | Each side bet is its own rule system. Adds UI clutter, testing surface, and confusion for casual players | Standard blackjack bets only (main bet + insurance) |
| Deck penetration / shoe composition display | Card counter feature that clutters the UI for casual players | Omit entirely. The game is for fun, not advantage play practice |
| Elaborate 3D card animations / WebGL | Overkill for vanilla CSS/JS. Fragile, hard to maintain, GPU-dependent | CSS transforms and transitions provide smooth 2D animations that work everywhere |
| Chat / social features | No multiplayer = no one to chat with. Adds complexity for zero value | Omit |
| Achievements / badges system | Scope creep. Stats already provide the "progression" hook. Achievements need design, art, unlock logic, notification UI | Stats and streaks serve the same psychological purpose with far less complexity |
| Surrender option | While a real blackjack rule, it's rarely used by casual players and adds another button/decision point that clutters the UI | Omit. Hit/stand/double/split/insurance is the right action set |
| Framework or build tooling | Explicitly constrained out (PROJECT.md). Vanilla HTML/CSS/JS only | Embrace vanilla. Module pattern with ES modules (type="module") gives clean organization without a bundler |

## Feature Dependencies

```
Betting System --> All gameplay (no bet = no hand)
Card Deck/Shoe --> Deal Animation --> Hit/Stand/Double/Split logic
Dealer AI (standard rules) --> Dealer Irrationality (deviation layer on top)
Hand Evaluation (totals, bust, blackjack) --> Payout Calculation --> Chip Balance Update
Chip Balance --> Betting System (can't bet more than you have)
AnimationManager --> Deal animation, flip animation, discard animation
SoundManager stubs --> Sound hooks in game events (deal, bet, win, bust)
Session Stats Tracking --> Cumulative Stats Aggregation --> Stats History View
localStorage persistence --> Cumulative Stats, Session History
Split logic --> Double after split (if allowed), re-split logic
Insurance prompt --> Dealer ace detection --> Blackjack check
```

**Critical path:** Betting -> Deck -> Deal -> Hand evaluation -> Payout -> Stats. Everything else layers on top.

## MVP Recommendation

**Prioritize (Phase 1 -- playable game):**
1. Standard blackjack rules with hit/stand (table stakes, foundation of everything)
2. Betting system with chip balance ($1,000 start)
3. Card deal and flip animations (AnimationManager with `ANIM` constants)
4. Double down (simple extension of hit logic)
5. Blackjack detection and correct payouts (3:2)
6. Clear game state UI (totals, available actions, balance)

**Prioritize (Phase 2 -- full feature set):**
1. Split pairs (most complex table stakes feature)
2. Insurance
3. Dealer irrationality mechanic (key differentiator)
4. Session stats tracking
5. SoundManager stubs wired to game events
6. Discard/sweep animation

**Prioritize (Phase 3 -- polish and persistence):**
1. Cumulative stats with localStorage persistence
2. Session history view
3. Responsive layout tuning
4. Keyboard shortcuts
5. Visual "tell" for dealer deviation

**Defer indefinitely:**
- Card counting trainer: Different product, different audience
- Multiple hand positions: Complexity not justified for casual play
- Side bets: Each one is a mini-project

## Complexity Budget

| Feature | Estimated Effort | Risk |
|---------|-----------------|------|
| Core blackjack (hit/stand/bust/payout) | Low | Low -- well-defined rules |
| Betting system | Low | Low |
| Deal + flip animations | Medium | Medium -- animation timing is fiddly to get right |
| Double down | Low | Low -- one card, double bet |
| Split | Medium-High | Medium -- edge cases (aces, re-split, double-after-split) multiply complexity |
| Insurance | Low | Low -- straightforward side bet |
| Dealer irrationality | Medium | Medium -- balancing deviation probability for fun without frustration |
| Session stats | Low-Medium | Low |
| Cumulative stats + persistence | Medium | Low -- localStorage is simple but data schema matters |
| Session history view | Medium | Low -- separate UI panel |
| Discard animation | Low-Medium | Low -- AnimationManager already exists |
| Keyboard shortcuts | Low | Low |

## Sources

- PROJECT.md requirements and constraints (primary source)
- Domain knowledge of blackjack rules and casino game UX patterns (training data -- MEDIUM confidence)
- Note: Web search was unavailable for this research session. Feature landscape is based on well-established blackjack game conventions which are stable and well-known. Confidence remains MEDIUM rather than LOW because blackjack is a centuries-old game with extremely well-documented rules and player expectations.
