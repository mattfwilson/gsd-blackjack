import { GameEngine } from '../engine/GameEngine.js';
import { SoundManager } from '../SoundManager.js';
import { TableRenderer } from './TableRenderer.js';
import { ANIM, syncAnimToCSS } from '../constants.js';
import { formatChips } from './CardRenderer.js';

/**
 * UIController -- wires GameEngine to DOM via TableRenderer.
 * Manages game flow: betting, dealing, player actions, round resolution.
 */
export class UIController {
  /** @type {GameEngine} */
  #engine;
  /** @type {SoundManager} */
  #sound;
  /** @type {TableRenderer} */
  #renderer;
  /** Accumulated bet in cents before Deal is pressed */
  #pendingBet = 0;
  /** True while animations are in progress (Plan 03 AnimationManager) */
  #animBusy = false;

  constructor() {
    this.#engine = new GameEngine();
    this.#sound = new SoundManager();
    this.#renderer = new TableRenderer();

    syncAnimToCSS();
    this.#bindEvents();
    this.#render();
  }

  get pendingBet() { return this.#pendingBet; }
  get animBusy() { return this.#animBusy; }

  #bindEvents() {
    // Chip buttons: accumulate pending bet
    this.#renderer.chipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
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
      this.#pendingBet = 0;
      this.#render();
    });

    // Deal button: place bet and deal
    this.#renderer.dealBtn.addEventListener('click', () => {
      if (this.#pendingBet >= 1000) {
        const betAmount = this.#pendingBet;
        this.#pendingBet = 0;
        this.#engine.placeBet(betAmount);
        this.#engine.deal();
        this.#render();

        // Check if round resolved immediately (blackjack scenarios)
        const state = this.#engine.getState();
        if (state.phase === 'ROUND_OVER') {
          this.#handleRoundOver();
        }
      }
    });

    // Hit button
    this.#renderer.hitBtn.addEventListener('click', () => {
      if (this.#animBusy) return;
      this.#engine.hit();
      this.#render();

      const state = this.#engine.getState();
      if (state.phase === 'ROUND_OVER') {
        this.#handleRoundOver();
      }
    });

    // Stand button
    this.#renderer.standBtn.addEventListener('click', () => {
      if (this.#animBusy) return;
      this.#engine.stand();
      this.#render();

      const state = this.#engine.getState();
      if (state.phase === 'ROUND_OVER') {
        this.#handleRoundOver();
      }
    });

    // Double button
    this.#renderer.doubleBtn.addEventListener('click', () => {
      if (this.#animBusy) return;
      this.#engine.doubleDown();
      this.#render();

      const state = this.#engine.getState();
      if (state.phase === 'ROUND_OVER') {
        this.#handleRoundOver();
      }
    });

    // Delegated click handler for bankrupt "New Session" button
    this.#renderer.controlsZoneEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('bj-btn-new-session')) {
        this.#engine.resetSession();
        this.#pendingBet = 0;
        this.#render();
      }
    });
  }

  async #handleRoundOver() {
    const state = this.#engine.getState();
    const result = state.result;
    const currentBet = state.currentBet;
    const isBust = state.playerHands[0] ? state.playerHands[0].isBust : false;

    // Disable all controls during result display
    this.#animBusy = true;
    this.#render();

    // Show result banner and wait for auto-clear
    await this.#renderer.showResult(result, currentBet, isBust);

    this.#animBusy = false;

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
      this.#animBusy,
      this.#pendingBet,
      state.chips
    );
  }
}

// Boot on page load
const controller = new UIController();
