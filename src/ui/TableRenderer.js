import { createCardElement, formatChips } from './CardRenderer.js';
import { ANIM } from '../constants.js';

/**
 * TableRenderer -- DOM rendering functions for hands, scores, chips, bet,
 * controls enable/disable, and result banner display.
 */
export class TableRenderer {
  constructor() {
    // Cache DOM element references
    this.dealerHandEl = document.getElementById('bj-dealer-hand');
    this.playerHand0El = document.getElementById('bj-hand-0');
    this.playerHand1El = document.getElementById('bj-hand-1');
    this.dealerScoreEl = document.getElementById('bj-dealer-score');
    this.chipsEl = document.getElementById('bj-chips');
    this.betEl = document.getElementById('bj-bet');
    this.resultBannerEl = document.getElementById('bj-result-banner');
    this.controlsZoneEl = document.querySelector('.bj-zone-controls');
    this.shoeEl = document.getElementById('bj-shoe');
    this.discardEl = document.getElementById('bj-discard');

    // Cache button references
    this.chipBtns = document.querySelectorAll('.bj-chip-btn');
    this.clearBtn = document.querySelector('.bj-btn-clear');
    this.hitBtn = document.querySelector('.bj-btn-hit');
    this.standBtn = document.querySelector('.bj-btn-stand');
    this.doubleBtn = document.querySelector('.bj-btn-double');
    this.dealBtn = document.querySelector('.bj-btn-deal');
  }

  /**
   * Render a hand of cards into a container element.
   * Clears existing content, creates card elements with fan overlap.
   * Cards start with opacity 0 for AnimationManager to animate in.
   */
  renderHand(containerEl, cards) {
    containerEl.innerHTML = '';
    cards.forEach((card, i) => {
      const el = createCardElement(card);
      el.style.position = 'absolute';
      el.style.left = `${i * 24}px`;
      el.style.opacity = '0';
      containerEl.appendChild(el);
    });
    const fanWidth = cards.length > 0 ? (cards.length - 1) * 24 + 160 : 160;
    containerEl.style.width = `${fanWidth}px`;
  }

  /**
   * Get all .bj-card elements in a container.
   * @param {HTMLElement} containerEl
   * @returns {HTMLElement[]}
   */
  getCardElements(containerEl) {
    return Array.from(containerEl.querySelectorAll('.bj-card'));
  }

  /**
   * Add a single card element to a hand container at the next fan position.
   * Card starts with opacity 0 for animation.
   * @param {HTMLElement} containerEl
   * @param {{ suit: string, rank: string, faceDown: boolean }} card
   * @returns {HTMLElement} The newly created card element
   */
  addCardToHand(containerEl, card) {
    const existingCount = containerEl.querySelectorAll('.bj-card').length;
    const el = createCardElement(card);
    el.style.position = 'absolute';
    el.style.left = `${existingCount * 24}px`;
    el.style.opacity = '0';
    containerEl.appendChild(el);
    const fanWidth = existingCount * 24 + 160;
    containerEl.style.width = `${fanWidth}px`;
    return el;
  }

  /**
   * Render the dealer score label.
   * Shows only visible card value when hole card is face down.
   */
  renderDealerScore(dealerHand) {
    if (!dealerHand || !dealerHand.cards || dealerHand.cards.length === 0) {
      this.dealerScoreEl.textContent = '';
      return;
    }

    const hasFaceDown = dealerHand.cards.some(c => c.faceDown);

    if (hasFaceDown) {
      // Compute visible-only value
      let visibleValue = 0;
      for (const card of dealerHand.cards) {
        if (card.faceDown) continue;
        const rank = card.rank;
        if (rank === 'A') {
          visibleValue += 11;
        } else if (rank === 'J' || rank === 'Q' || rank === 'K') {
          visibleValue += 10;
        } else {
          visibleValue += parseInt(rank, 10);
        }
      }
      this.dealerScoreEl.textContent = String(visibleValue);
    } else {
      this.dealerScoreEl.textContent = String(dealerHand.value);
    }
  }

  /**
   * Render a player hand score adjacent to its hand area.
   * Creates or updates a score element as a sibling.
   */
  renderPlayerScore(hand, containerEl) {
    if (!hand || !hand.cards || hand.cards.length === 0) {
      // Remove existing score element if present
      const existing = containerEl.parentElement.querySelector(
        `.bj-player-score[data-for="${containerEl.id}"]`
      );
      if (existing) existing.remove();
      return;
    }

    let scoreEl = containerEl.parentElement.querySelector(
      `.bj-player-score[data-for="${containerEl.id}"]`
    );
    if (!scoreEl) {
      scoreEl = document.createElement('div');
      scoreEl.className = 'bj-score bj-player-score';
      scoreEl.dataset.for = containerEl.id;
      containerEl.parentElement.insertBefore(scoreEl, containerEl);
    }
    scoreEl.textContent = String(hand.value);
  }

  showScores() {
    this.dealerScoreEl.style.visibility = 'visible';
    document.querySelectorAll('.bj-player-score').forEach(el => {
      el.style.visibility = 'visible';
    });
  }

  hideScores() {
    this.dealerScoreEl.style.visibility = 'hidden';
    document.querySelectorAll('.bj-player-score').forEach(el => {
      el.style.visibility = 'hidden';
    });
  }

  /**
   * Render the chip balance display.
   */
  renderChips(chips) {
    this.chipsEl.textContent = 'Chips: ' + formatChips(chips);
  }

  /**
   * Render the current bet display.
   */
  renderBet(bet) {
    this.betEl.textContent = 'Bet: ' + formatChips(bet);
  }

  /**
   * Enable/disable controls based on game phase, available actions,
   * animation state, pending bet, and chip balance.
   */
  renderControls(phase, availableActions, animBusy, pendingBet, chips) {
    // If animation is running, disable everything
    if (animBusy) {
      this.chipBtns.forEach(btn => { btn.disabled = true; });
      this.clearBtn.disabled = true;
      this.dealBtn.disabled = true;
      this.hitBtn.disabled = true;
      this.standBtn.disabled = true;
      this.doubleBtn.disabled = true;
      return;
    }

    // Handle bankrupt state
    if (phase === 'ROUND_OVER' && chips === 0) {
      this._renderBankruptControls();
      return;
    }

    // Restore normal controls if bankrupt state was previously shown
    this._restoreNormalControls();

    // Chip buttons: enabled only during BETTING
    const isBetting = phase === 'BETTING';
    this.chipBtns.forEach(btn => {
      const amount = parseInt(btn.dataset.amount, 10);
      btn.disabled = !isBetting || (pendingBet + amount > chips) || (pendingBet + amount > 50000);
    });

    // Clear button: enabled only during BETTING with a pending bet
    this.clearBtn.disabled = !isBetting || pendingBet <= 0;

    // Deal button: enabled only during BETTING with minimum bet met
    this.dealBtn.disabled = !isBetting || pendingBet < 1000;

    // Action buttons: based on available actions
    this.hitBtn.disabled = !availableActions.includes('hit');
    this.standBtn.disabled = !availableActions.includes('stand');
    this.doubleBtn.disabled = !availableActions.includes('doubleDown');
  }

  /**
   * Show the bankrupt state: replace controls with message and new session button.
   */
  _renderBankruptControls() {
    const chipRow = this.controlsZoneEl.querySelector('.bj-chip-row');
    const actionRow = this.controlsZoneEl.querySelector('.bj-action-row');
    if (chipRow) chipRow.style.display = 'none';
    if (actionRow) actionRow.style.display = 'none';

    // Create bankrupt message if not already present
    if (!this.controlsZoneEl.querySelector('.bj-bankrupt')) {
      const bankruptEl = document.createElement('div');
      bankruptEl.className = 'bj-bankrupt';
      bankruptEl.style.textAlign = 'center';

      const msgEl = document.createElement('p');
      msgEl.textContent = 'Out of chips!';
      msgEl.style.fontSize = '24px';
      msgEl.style.fontWeight = '600';
      msgEl.style.marginBottom = '16px';

      const btnEl = document.createElement('button');
      btnEl.className = 'bj-btn-deal bj-btn-new-session';
      btnEl.textContent = 'New Session';

      bankruptEl.appendChild(msgEl);
      bankruptEl.appendChild(btnEl);
      this.controlsZoneEl.appendChild(bankruptEl);
    }
  }

  /**
   * Restore normal controls layout (remove bankrupt message if present).
   */
  _restoreNormalControls() {
    const bankruptEl = this.controlsZoneEl.querySelector('.bj-bankrupt');
    if (bankruptEl) bankruptEl.remove();

    const chipRow = this.controlsZoneEl.querySelector('.bj-chip-row');
    const actionRow = this.controlsZoneEl.querySelector('.bj-action-row');
    if (chipRow) chipRow.style.display = '';
    if (actionRow) actionRow.style.display = '';
  }

  /**
   * Show result banner with outcome text.
   * Returns a promise that resolves after RESULT_DISPLAY ms (banner auto-clears).
   */
  showResult(result, currentBet, isBust) {
    // Clear any existing outcome classes
    this.resultBannerEl.classList.remove(
      'bj-result-banner--win',
      'bj-result-banner--loss',
      'bj-result-banner--push',
      'bj-result-banner--blackjack'
    );

    let text = '';
    let outcomeClass = '';

    switch (result.outcome) {
      case 'WIN':
        text = `You win +${formatChips(result.payout - currentBet)}!`;
        outcomeClass = 'bj-result-banner--win';
        break;
      case 'BLACKJACK':
        text = `Blackjack! +${formatChips(result.payout - currentBet)}`;
        outcomeClass = 'bj-result-banner--blackjack';
        break;
      case 'LOSS':
        if (isBust) {
          text = 'Bust!';
        } else {
          text = `You lose -${formatChips(currentBet)}`;
        }
        outcomeClass = 'bj-result-banner--loss';
        break;
      case 'PUSH':
        text = 'Push';
        outcomeClass = 'bj-result-banner--push';
        break;
    }

    this.resultBannerEl.textContent = text;
    this.resultBannerEl.classList.add(outcomeClass);
    this.resultBannerEl.classList.remove('bj-result-banner--hidden');

    return new Promise(resolve => {
      setTimeout(() => {
        this.resultBannerEl.classList.add('bj-result-banner--hidden');
        // Wait for fade transition to complete before resolving
        setTimeout(resolve, ANIM.RESULT_FADE);
      }, ANIM.RESULT_DISPLAY);
    });
  }

  /**
   * Clear all cards from the table and reset score displays.
   */
  clearTable() {
    this.dealerHandEl.innerHTML = '';
    this.playerHand0El.innerHTML = '';
    this.playerHand1El.innerHTML = '';
    this.dealerScoreEl.textContent = '';

    // Remove player score elements
    const playerScores = document.querySelectorAll('.bj-player-score');
    playerScores.forEach(el => el.remove());

    // Reset result banner
    this.resultBannerEl.textContent = '';
    this.resultBannerEl.classList.remove(
      'bj-result-banner--win',
      'bj-result-banner--loss',
      'bj-result-banner--push',
      'bj-result-banner--blackjack'
    );
    this.resultBannerEl.classList.add('bj-result-banner--hidden');
  }
}
