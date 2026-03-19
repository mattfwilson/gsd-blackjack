import { GameEngine } from '../engine/GameEngine.js';
import { SoundManager } from '../SoundManager.js';
import { TableRenderer } from './TableRenderer.js';
import { AnimationManager } from './AnimationManager.js';
import { ANIM, syncAnimToCSS } from '../constants.js';
import { formatChips } from './CardRenderer.js';

/**
 * UIController -- wires GameEngine to DOM via TableRenderer and AnimationManager.
 * Manages game flow: betting, dealing with animations, player actions, round resolution.
 */
export class UIController {
  /** @type {GameEngine} */
  #engine;
  /** @type {SoundManager} */
  #sound;
  /** @type {TableRenderer} */
  #renderer;
  /** @type {AnimationManager} */
  #animManager;
  /** Accumulated bet in cents before Deal is pressed */
  #pendingBet = 0;

  constructor() {
    this.#engine = new GameEngine();
    this.#sound = new SoundManager();
    this.#renderer = new TableRenderer();
    this.#animManager = new AnimationManager();

    syncAnimToCSS();
    this.#bindEvents();
    this.#render();
  }

  get pendingBet() { return this.#pendingBet; }
  get animBusy() { return this.#animManager.isBusy; }

  #bindEvents() {
    // Chip buttons: accumulate pending bet
    this.#renderer.chipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.#animManager.isBusy) return;
        const amount = parseInt(btn.dataset.amount, 10);
        const state = this.#engine.getState();
        if (
          this.#pendingBet + amount <= state.chips &&
          this.#pendingBet + amount <= 50000
        ) {
          this.#pendingBet += amount;
          this.#render();
        }
      });
    });

    // Clear button: reset pending bet
    this.#renderer.clearBtn.addEventListener('click', () => {
      if (this.#animManager.isBusy) return;
      this.#pendingBet = 0;
      this.#render();
    });

    // Deal button: place bet and deal with animation
    this.#renderer.dealBtn.addEventListener('click', () => {
      if (this.#animManager.isBusy) return;
      if (this.#pendingBet >= 1000) {
        this.#handleDeal();
      }
    });

    // Hit button
    this.#renderer.hitBtn.addEventListener('click', () => {
      if (this.#animManager.isBusy) return;
      this.#handleHit();
    });

    // Stand button
    this.#renderer.standBtn.addEventListener('click', () => {
      if (this.#animManager.isBusy) return;
      this.#handleStand();
    });

    // Double button
    this.#renderer.doubleBtn.addEventListener('click', () => {
      if (this.#animManager.isBusy) return;
      this.#handleDouble();
    });

    // Split button
    if (this.#renderer.splitBtn) {
      this.#renderer.splitBtn.addEventListener('click', () => {
        if (this.#animManager.isBusy) return;
        this.#handleSplit();
      });
    }

    // Delegated click handler for dynamic buttons (bankrupt, insurance)
    this.#renderer.controlsZoneEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('bj-btn-new-session')) {
        this.#engine.resetSession();
        this.#pendingBet = 0;
        this.#renderer.clearTable();
        this.#render();
      }
      if (e.target.classList.contains('bj-btn-insurance')) {
        this.#handleTakeInsurance();
      }
      if (e.target.classList.contains('bj-btn-no-insurance')) {
        this.#handleDeclineInsurance();
      }
    });
  }

  async #handleDeal() {
    const betAmount = this.#pendingBet;
    this.#pendingBet = 0;
    this.#engine.placeBet(betAmount);
    const chipsAfterBet = this.#engine.getState().chips;
    this.#engine.deal();

    const state = this.#engine.getState();

    // Render cards into DOM (invisible, opacity 0)
    this.#renderer.renderHand(this.#renderer.playerHand0El, state.playerHands[0].cards);
    this.#renderer.renderPlayerScore(state.playerHands[0], this.#renderer.playerHand0El);
    this.#renderer.renderHand(this.#renderer.dealerHandEl, state.dealerHand.cards);
    this.#renderer.renderDealerScore(state.dealerHand);
    this.#renderer.renderChips(chipsAfterBet);
    this.#renderer.renderBet(state.currentBet);

    // Disable all buttons during deal animation
    this.#renderer.renderControls(state.phase, [], true, this.#pendingBet, state.chips);

    // Build deal order: player card 0, dealer card 0, player card 1, dealer card 1
    const playerCards = this.#renderer.getCardElements(this.#renderer.playerHand0El);
    const dealerCards = this.#renderer.getCardElements(this.#renderer.dealerHandEl);
    const dealOrder = [playerCards[0], dealerCards[0], playerCards[1], dealerCards[1]];

    await this.#animManager.dealCards(dealOrder, this.#renderer.shoeEl);
    this.#sound.betPlaced();
    // Cards have been dealt -- fire cardDealt for each card dealt
    for (let i = 0; i < dealOrder.length; i++) {
      this.#sound.cardDealt();
    }

    // Re-render controls with actual state
    if (state.phase === 'ROUND_OVER') {
      // Blackjack scenario -- round resolved immediately
      await this.#handleRoundOver();
    } else if (state.phase === 'INSURANCE_OFFER') {
      this.#renderer.showScores();
      const insuranceCost = Math.floor(state.currentBet / 2);
      this.#renderer._renderInsuranceControls(insuranceCost);
    } else {
      this.#renderer.showScores();
      this.#renderControls();
    }
  }

  async #handleHit() {
    // Disable controls during animation
    this.#renderer.renderControls('PLAYER_TURN', [], true, this.#pendingBet, this.#engine.getState().chips);

    this.#engine.hit();
    const state = this.#engine.getState();

    // Use activeHandIndex to determine the correct container
    const activeContainer = state.activeHandIndex === 0
      ? this.#renderer.playerHand0El
      : this.#renderer.playerHand1El;
    const activeHand = state.playerHands[state.hasSplit ? (state.phase === 'ROUND_OVER' ? this.#lastActiveIndex ?? 0 : state.activeHandIndex) : 0];

    // For split: figure out which hand was just hit (might have advanced due to bust)
    // The hand that got the card is determined by looking at card counts
    let hitHandIndex;
    if (state.hasSplit) {
      // Find which hand has more cards than before (the one that was hit)
      // Since we just called hit(), the active hand before bust-advance had the card added
      // Use the container that corresponds to the hand with the new card
      hitHandIndex = this.#findHitHandIndex(state);
    } else {
      hitHandIndex = 0;
    }

    const hitContainer = hitHandIndex === 0
      ? this.#renderer.playerHand0El
      : this.#renderer.playerHand1El;
    const hitHand = state.playerHands[hitHandIndex];

    // Add the new card to DOM (invisible)
    const newCard = hitHand.cards[hitHand.cards.length - 1];
    const newEl = this.#renderer.addCardToHand(hitContainer, newCard);

    // Update player score
    this.#renderer.renderPlayerScore(hitHand, hitContainer);

    // Animate slide-in
    await this.#animManager.slideCardIn(newEl, this.#renderer.shoeEl);
    this.#sound.cardDealt();
    if (hitHand.isBust) {
      this.#sound.bust();
    }

    if (state.phase === 'ROUND_OVER') {
      if (state.hasSplit) {
        this.#renderer.clearActiveHand();
        await this.#animateDealerTurn(state);
        await this.#handleSplitRoundOver();
      } else {
        await this.#handleRoundOver();
      }
    } else {
      // Check if hand advanced (bust on hand 0 moved to hand 1)
      if (state.hasSplit) {
        this.#renderer.setActiveHand(state.activeHandIndex);
      }
      this.#renderControls();
    }
  }

  /** Track which hand index was last active before bust-advance */
  #lastActiveIndex;

  /**
   * Find which hand was just hit by checking card counts against DOM.
   * The engine may have advanced activeHandIndex on bust.
   */
  #findHitHandIndex(state) {
    // The hand that was hit is the one whose card count exceeds DOM card count
    const dom0Count = this.#renderer.getCardElements(this.#renderer.playerHand0El).length;
    const dom1Count = this.#renderer.getCardElements(this.#renderer.playerHand1El).length;
    const engine0Count = state.playerHands[0].cards.length;
    const engine1Count = state.playerHands[1] ? state.playerHands[1].cards.length : 0;

    if (engine0Count > dom0Count) return 0;
    if (engine1Count > dom1Count) return 1;
    // Fallback: use activeHandIndex
    return state.activeHandIndex;
  }

  async #handleStand() {
    // Disable controls during dealer turn animation
    this.#renderer.renderControls('DEALER_TURN', [], true, this.#pendingBet, this.#engine.getState().chips);

    const dealerCardCountBefore = this.#engine.getState().dealerHand.cards.length;

    this.#engine.stand();
    const state = this.#engine.getState();

    if (state.phase === 'ROUND_OVER') {
      // Animate dealer turn
      await this.#animateDealerTurn(state, dealerCardCountBefore);

      if (state.hasSplit) {
        this.#renderer.clearActiveHand();
        await this.#handleSplitRoundOver();
      } else {
        await this.#handleRoundOver();
      }
    } else if (state.phase === 'PLAYER_TURN') {
      // Hand advanced to next (split scenario)
      await new Promise(r => setTimeout(r, ANIM.HAND_ADVANCE_DELAY));
      this.#renderer.setActiveHand(state.activeHandIndex);
      this.#renderControls();
    }
  }

  async #handleDouble() {
    // Disable controls during animation
    this.#renderer.renderControls('PLAYER_TURN', [], true, this.#pendingBet, this.#engine.getState().chips);

    // Save pre-double dealer card count
    const dealerCardCountBefore = this.#engine.getState().dealerHand.cards.length;

    this.#engine.doubleDown();
    const state = this.#engine.getState();

    // Update bet display (doubled)
    this.#renderer.renderBet(state.currentBet);

    // Add the new player card (invisible) and animate in
    const newCard = state.playerHands[0].cards[state.playerHands[0].cards.length - 1];
    const newEl = this.#renderer.addCardToHand(this.#renderer.playerHand0El, newCard);
    this.#renderer.renderPlayerScore(state.playerHands[0], this.#renderer.playerHand0El);
    await this.#animManager.slideCardIn(newEl, this.#renderer.shoeEl);
    this.#sound.cardDealt();
    if (state.playerHands[0].isBust) {
      this.#sound.bust();
    }

    if (state.phase === 'ROUND_OVER' && state.playerHands[state.activeHandIndex || 0].isBust) {
      // Bust path (no dealer turn)
      await this.#handleRoundOver();
    } else if (state.phase === 'ROUND_OVER') {
      await this.#animateDealerTurn(state, dealerCardCountBefore);
      await this.#handleRoundOver();
    }
  }

  async #handleSplit() {
    // Disable controls during split animation
    this.#renderer.renderControls('PLAYER_TURN', [], true, this.#pendingBet, this.#engine.getState().chips);

    this.#engine.split();
    const state = this.#engine.getState();

    // Render both hands
    this.#renderer.renderHand(this.#renderer.playerHand0El, state.playerHands[0].cards);
    this.#renderer.renderPlayerScore(state.playerHands[0], this.#renderer.playerHand0El);
    this.#renderer.renderHand(this.#renderer.playerHand1El, state.playerHands[1].cards);
    this.#renderer.renderPlayerScore(state.playerHands[1], this.#renderer.playerHand1El);

    // Update chips display (second bet deducted)
    this.#renderer.renderChips(state.chips);

    // Animate all new cards
    const hand0Cards = this.#renderer.getCardElements(this.#renderer.playerHand0El);
    const hand1Cards = this.#renderer.getCardElements(this.#renderer.playerHand1El);

    for (const el of [...hand0Cards, ...hand1Cards]) {
      await this.#animManager.slideCardIn(el, this.#renderer.shoeEl);
    }
    this.#sound.splitPlaced();
    // Fire cardDealt for each new card (2 new cards dealt, one per hand)
    this.#sound.cardDealt();
    this.#sound.cardDealt();

    // Show scores
    this.#renderer.showScores();

    if (state.phase === 'ROUND_OVER') {
      // Split aces auto-stood both hands: dealer played, round over
      await this.#animateDealerTurn(state);
      this.#renderer.clearActiveHand();
      await this.#handleSplitRoundOver();
    } else {
      // Set active hand glow on hand 0
      this.#renderer.setActiveHand(state.activeHandIndex);
      this.#renderControls();
    }
  }

  async #handleTakeInsurance() {
    this.#engine.takeInsurance();
    const state = this.#engine.getState();

    // Remove insurance buttons, restore normal controls
    this.#renderer._removeInsuranceControls();

    // Flip dealer hole card
    const dealerCards = this.#renderer.getCardElements(this.#renderer.dealerHandEl);
    if (dealerCards.length >= 2) {
      const holeCardData = state.dealerHand.cards[1];
      this.#updateCardFace(dealerCards[1], holeCardData);
      await this.#animManager.flipCard(dealerCards[1]);
    }
    this.#sound.insurancePlaced();
    this.#renderer.renderDealerScore(state.dealerHand);
    this.#renderer.renderChips(state.chips);

    if (state.phase === 'ROUND_OVER') {
      // Dealer had blackjack, insurance won
      if (state.result.insuranceResult === 'WON') {
        this.#sound.insuranceWon();
        const payoutDollars = Math.floor(state.result.insurancePayout / 100);
        await this.#renderer.showStatusMessage(`Insurance pays +$${payoutDollars}`, 1500);
      }
      await this.#handleRoundOver();
    } else {
      // Dealer did NOT have blackjack, insurance lost
      const lostDollars = Math.floor(state.insuranceBet / 100);
      await this.#renderer.showStatusMessage(`Insurance lost -$${lostDollars}`, 1500);
      this.#renderControls();
    }
  }

  async #handleDeclineInsurance() {
    this.#engine.declineInsurance();
    const state = this.#engine.getState();

    // Remove insurance buttons
    this.#renderer._removeInsuranceControls();

    if (state.phase === 'ROUND_OVER') {
      // Dealer had blackjack
      const dealerCards = this.#renderer.getCardElements(this.#renderer.dealerHandEl);
      if (dealerCards.length >= 2) {
        const holeCardData = state.dealerHand.cards[1];
        this.#updateCardFace(dealerCards[1], holeCardData);
        await this.#animManager.flipCard(dealerCards[1]);
      }
      this.#renderer.renderDealerScore(state.dealerHand);
      await this.#handleRoundOver();
    } else {
      // No dealer blackjack, play continues
      this.#renderControls();
    }
  }

  /**
   * Animate dealer turn: flip hole card and animate any additional cards drawn.
   * @param {object} state - Engine state after dealer turn completed
   * @param {number} [dealerCardCountBefore=2] - Number of dealer cards before dealer drew
   */
  async #animateDealerTurn(state, dealerCardCountBefore = 2) {
    // Flip hole card
    const dealerCards = this.#renderer.getCardElements(this.#renderer.dealerHandEl);
    if (dealerCards.length >= 2) {
      const holeCardData = state.dealerHand.cards[1];
      this.#updateCardFace(dealerCards[1], holeCardData);
      await this.#animManager.flipCard(dealerCards[1]);
    }
    this.#renderer.renderDealerScore(state.dealerHand);

    // Animate additional dealer cards
    if (state.dealerHand.cards.length > dealerCardCountBefore) {
      for (let i = dealerCardCountBefore; i < state.dealerHand.cards.length; i++) {
        const card = state.dealerHand.cards[i];
        const addedEl = this.#renderer.addCardToHand(this.#renderer.dealerHandEl, card);
        await this.#animManager.slideCardIn(addedEl, this.#renderer.shoeEl);
        this.#sound.cardDealt();
        this.#renderer.renderDealerScore(state.dealerHand);
      }
    }
  }

  /**
   * Handle split round over: show sequential banners, discard, and reset.
   */
  async #handleSplitRoundOver() {
    const state = this.#engine.getState();
    const result = state.result;

    // Disable all controls during result display
    this.#renderer.renderControls(state.phase, [], true, this.#pendingBet, state.chips);

    // Show sequential banners
    const perHandBet = state.playerHands[0].bet;
    await this.#renderer.showSplitResult(result.handResults, perHandBet);
    const netPayout = result.handResults.reduce((s, h) => s + h.payout, 0);
    const totalBet = state.playerHands.reduce((s, h) => s + h.bet, 0);
    if (netPayout > totalBet) {
      this.#sound.chipsWon();
      this.#sound.roundWon();
    }

    // Discard all cards (from both hand zones and dealer)
    const allCards = [
      ...this.#renderer.getCardElements(this.#renderer.dealerHandEl),
      ...this.#renderer.getCardElements(this.#renderer.playerHand0El),
      ...this.#renderer.getCardElements(this.#renderer.playerHand1El),
    ];

    if (allCards.length > 0) {
      await this.#animManager.discardAll(allCards, this.#renderer.discardEl);
    }

    this.#renderer.hideScores();
    this.#renderer.clearTable();

    // Render chips with updated balance
    this.#renderer.renderChips(state.chips);

    if (state.chips > 0) {
      this.#engine.startNewRound();
      this.#render();
    } else {
      this.#render();
    }
  }

  /**
   * Update the front face content of an already-rendered card element.
   * Used when hole card is revealed -- the DOM element was created face-down
   * and needs its front face populated with the actual card data.
   */
  #updateCardFace(cardEl, cardData) {
    const SUIT_SYMBOLS = {
      hearts: '\u2665',
      diamonds: '\u2666',
      clubs: '\u2663',
      spades: '\u2660',
    };
    const RED_SUITS = new Set(['hearts', 'diamonds']);

    const suitSymbol = SUIT_SYMBOLS[cardData.suit];
    const colorClass = RED_SUITS.has(cardData.suit) ? 'bj-card--red' : 'bj-card--black';

    const front = cardEl.querySelector('.bj-card-front');
    if (front) {
      front.className = `bj-card-front ${colorClass}`;
      // Update corner and suit content
      const corners = front.querySelectorAll('.bj-card-corner');
      corners.forEach(corner => {
        corner.innerHTML = `${cardData.rank}<br>${suitSymbol}`;
      });
      const suitEl = front.querySelector('.bj-card-suit');
      if (suitEl) {
        suitEl.textContent = suitSymbol;
      }
    }
  }

  async #handleRoundOver() {
    const state = this.#engine.getState();
    const result = state.result;
    const currentBet = state.currentBet;
    const isBust = state.playerHands[0] ? state.playerHands[0].isBust : false;

    // Disable all controls during result display
    this.#renderer.renderControls(state.phase, [], true, this.#pendingBet, state.chips);

    // Show result banner and wait for auto-clear
    await this.#renderer.showResult(result, currentBet, isBust);
    if (result.outcome === 'WIN' || result.outcome === 'BLACKJACK') {
      this.#sound.chipsWon();
      this.#sound.roundWon();
    }

    // Collect all card elements and discard sweep
    const allCards = [
      ...this.#renderer.getCardElements(this.#renderer.dealerHandEl),
      ...this.#renderer.getCardElements(this.#renderer.playerHand0El),
      ...this.#renderer.getCardElements(this.#renderer.playerHand1El),
    ];

    if (allCards.length > 0) {
      await this.#animManager.discardAll(allCards, this.#renderer.discardEl);
    }

    this.#renderer.hideScores();

    // Clear the table
    this.#renderer.clearTable();

    // Start new round or show bankrupt state
    if (state.chips > 0) {
      this.#engine.startNewRound();
      this.#render();
    } else {
      this.#render();
    }
  }

  /**
   * Re-render controls only (used after animations complete).
   */
  #renderControls() {
    const state = this.#engine.getState();
    const actions = this.#engine.getAvailableActions();
    this.#renderer.renderControls(
      state.phase,
      actions,
      this.#animManager.isBusy,
      this.#pendingBet,
      state.chips
    );
  }

  #render() {
    const state = this.#engine.getState();
    const actions = this.#engine.getAvailableActions();

    // Render chip balance
    this.#renderer.renderChips(state.chips);

    // During BETTING show pending bet, during play show locked-in bet
    const displayBet = state.phase === 'BETTING' ? this.#pendingBet : state.currentBet;
    this.#renderer.renderBet(displayBet);

    // Render player hand(s)
    if (state.playerHands[0] && state.playerHands[0].cards.length > 0) {
      this.#renderer.renderHand(this.#renderer.playerHand0El, state.playerHands[0].cards);
      this.#renderer.renderPlayerScore(state.playerHands[0], this.#renderer.playerHand0El);
    }

    if (state.playerHands[1] && state.playerHands[1].cards.length > 0) {
      this.#renderer.renderHand(this.#renderer.playerHand1El, state.playerHands[1].cards);
      this.#renderer.renderPlayerScore(state.playerHands[1], this.#renderer.playerHand1El);
    }

    // Render dealer hand
    if (state.dealerHand && state.dealerHand.cards && state.dealerHand.cards.length > 0) {
      this.#renderer.renderHand(this.#renderer.dealerHandEl, state.dealerHand.cards);
      this.#renderer.renderDealerScore(state.dealerHand);
    }

    // Render controls
    if (state.phase === 'INSURANCE_OFFER') {
      const insuranceCost = Math.floor(state.currentBet / 2);
      this.#renderer._renderInsuranceControls(insuranceCost);
    } else {
      this.#renderer.renderControls(
        state.phase,
        actions,
        this.#animManager.isBusy,
        this.#pendingBet,
        state.chips
      );
    }
  }
}

// Boot on page load
const controller = new UIController();
