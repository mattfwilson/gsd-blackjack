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

    // Delegated click handler for bankrupt "New Session" button
    this.#renderer.controlsZoneEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('bj-btn-new-session')) {
        this.#engine.resetSession();
        this.#pendingBet = 0;
        this.#renderer.clearTable();
        this.#render();
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

    // Re-render controls with actual state
    if (state.phase === 'ROUND_OVER') {
      // Blackjack scenario -- round resolved immediately
      await this.#handleRoundOver();
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

    // Add the new card to DOM (invisible)
    const newCard = state.playerHands[0].cards[state.playerHands[0].cards.length - 1];
    const newEl = this.#renderer.addCardToHand(this.#renderer.playerHand0El, newCard);

    // Update player score
    this.#renderer.renderPlayerScore(state.playerHands[0], this.#renderer.playerHand0El);

    // Animate slide-in
    await this.#animManager.slideCardIn(newEl, this.#renderer.shoeEl);

    if (state.phase === 'ROUND_OVER') {
      await this.#handleRoundOver();
    } else {
      this.#renderControls();
    }
  }

  async #handleStand() {
    // Disable controls during dealer turn animation
    this.#renderer.renderControls('DEALER_TURN', [], true, this.#pendingBet, this.#engine.getState().chips);

    // Save pre-stand dealer card count (should be 2)
    const dealerCardCountBefore = this.#engine.getState().dealerHand.cards.length;

    this.#engine.stand();
    const state = this.#engine.getState();

    // Animate hole card flip (second dealer card)
    const dealerCards = this.#renderer.getCardElements(this.#renderer.dealerHandEl);
    if (dealerCards.length >= 2) {
      // Update the hole card's face content before flipping
      // The card element was rendered face-down; now update its front face with actual card data
      const holeCardData = state.dealerHand.cards[1];
      this.#updateCardFace(dealerCards[1], holeCardData);
      await this.#animManager.flipCard(dealerCards[1]);
    }

    // Update dealer score to show revealed value
    this.#renderer.renderDealerScore(state.dealerHand);

    // Animate any additional dealer cards drawn beyond the initial 2
    if (state.dealerHand.cards.length > dealerCardCountBefore) {
      for (let i = dealerCardCountBefore; i < state.dealerHand.cards.length; i++) {
        const card = state.dealerHand.cards[i];
        const newEl = this.#renderer.addCardToHand(this.#renderer.dealerHandEl, card);
        await this.#animManager.slideCardIn(newEl, this.#renderer.shoeEl);
        // Update dealer score after each card
        this.#renderer.renderDealerScore(state.dealerHand);
      }
    }

    await this.#handleRoundOver();
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

    if (state.phase === 'ROUND_OVER' && !state.playerHands[0].isBust) {
      // Not bust -- dealer turn happened in engine, animate it
      const dealerCards = this.#renderer.getCardElements(this.#renderer.dealerHandEl);
      if (dealerCards.length >= 2) {
        const holeCardData = state.dealerHand.cards[1];
        this.#updateCardFace(dealerCards[1], holeCardData);
        await this.#animManager.flipCard(dealerCards[1]);
      }
      this.#renderer.renderDealerScore(state.dealerHand);

      // Animate any additional dealer cards
      if (state.dealerHand.cards.length > dealerCardCountBefore) {
        for (let i = dealerCardCountBefore; i < state.dealerHand.cards.length; i++) {
          const card = state.dealerHand.cards[i];
          const addedEl = this.#renderer.addCardToHand(this.#renderer.dealerHandEl, card);
          await this.#animManager.slideCardIn(addedEl, this.#renderer.shoeEl);
          this.#renderer.renderDealerScore(state.dealerHand);
        }
      }
    }

    await this.#handleRoundOver();
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

    // Collect all card elements and discard sweep
    const allCards = [
      ...this.#renderer.getCardElements(this.#renderer.dealerHandEl),
      ...this.#renderer.getCardElements(this.#renderer.playerHand0El),
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

    // Render dealer hand
    if (state.dealerHand && state.dealerHand.cards && state.dealerHand.cards.length > 0) {
      this.#renderer.renderHand(this.#renderer.dealerHandEl, state.dealerHand.cards);
      this.#renderer.renderDealerScore(state.dealerHand);
    }

    // Render controls
    this.#renderer.renderControls(
      state.phase,
      actions,
      this.#animManager.isBusy,
      this.#pendingBet,
      state.chips
    );
  }
}

// Boot on page load
const controller = new UIController();
