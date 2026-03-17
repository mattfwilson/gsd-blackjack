import { Deck } from './Deck.js';
import { computeHandValue, createHand, addCardToHand } from './Hand.js';

export class GameEngine {
  #deck;
  #phase;
  #playerHands;
  #dealerHand;
  #chips;
  #currentBet;
  #result;
  #activeHandIndex;

  constructor() {
    this.#deck = new Deck(6);
    this.#chips = 100000;
    this.#phase = 'BETTING';
    this.#currentBet = 0;
    this.#playerHands = [];
    this.#dealerHand = createHand();
    this.#result = null;
    this.#activeHandIndex = 0;
  }

  placeBet(amountCents) {
    if (this.#phase !== 'BETTING') {
      throw new Error('Can only place bet during BETTING phase');
    }
    if (amountCents < 1000) {
      throw new Error('Minimum bet is $10 (1000 cents)');
    }
    if (amountCents > 50000) {
      throw new Error('Maximum bet is $500 (50000 cents)');
    }
    if (amountCents > this.#chips) {
      throw new Error('Insufficient chips');
    }

    this.#chips -= amountCents;
    this.#currentBet = amountCents;
    this.#phase = 'DEALING';
    return this.#getState();
  }

  deal() {
    if (this.#phase !== 'DEALING') {
      throw new Error('Can only deal during DEALING phase');
    }

    if (this.#deck.needsReshuffle()) {
      this.#deck.reset();
    }

    // Deal player hand: 2 cards
    let playerHand = createHand(this.#currentBet);
    playerHand = addCardToHand(playerHand, this.#deck.draw());
    playerHand = addCardToHand(playerHand, this.#deck.draw());
    this.#playerHands = [playerHand];

    // Deal dealer hand: 2 cards, second face down
    let dealerHand = createHand();
    dealerHand = addCardToHand(dealerHand, this.#deck.draw());
    const holeCard = this.#deck.draw();
    holeCard.faceDown = true;
    dealerHand = addCardToHand(dealerHand, holeCard);
    this.#dealerHand = dealerHand;

    // Check dealer's true value (peek at hole card for blackjack check)
    const dealerTrueValue = computeHandValue(
      this.#dealerHand.cards.map(c => ({ ...c, faceDown: false }))
    );

    const playerBJ = playerHand.isBlackjack;
    const dealerBJ = dealerTrueValue.isBlackjack;

    if (playerBJ && dealerBJ) {
      // Both blackjack: push
      this.#chips += this.#currentBet;
      this.#revealDealerHoleCard();
      this.#result = {
        outcome: 'PUSH',
        playerValue: playerHand.value,
        dealerValue: dealerTrueValue.value,
        payout: this.#currentBet,
        handResults: [{ outcome: 'PUSH', payout: this.#currentBet }]
      };
      this.#phase = 'ROUND_OVER';
    } else if (playerBJ) {
      // Player blackjack only: 3:2 payout
      const bjPayout = this.#currentBet + Math.floor(this.#currentBet * 3 / 2);
      this.#chips += bjPayout;
      this.#revealDealerHoleCard();
      this.#result = {
        outcome: 'BLACKJACK',
        playerValue: playerHand.value,
        dealerValue: dealerTrueValue.value,
        payout: bjPayout,
        handResults: [{ outcome: 'BLACKJACK', payout: bjPayout }]
      };
      this.#phase = 'ROUND_OVER';
    } else if (dealerBJ) {
      // Dealer blackjack only: player loses
      this.#revealDealerHoleCard();
      this.#result = {
        outcome: 'LOSS',
        playerValue: playerHand.value,
        dealerValue: dealerTrueValue.value,
        payout: 0,
        handResults: [{ outcome: 'LOSS', payout: 0 }]
      };
      this.#phase = 'ROUND_OVER';
    } else {
      this.#phase = 'PLAYER_TURN';
    }

    return this.#getState();
  }

  hit() {
    if (this.#phase !== 'PLAYER_TURN') {
      throw new Error('Can only hit during PLAYER_TURN phase');
    }

    const card = this.#deck.draw();
    this.#playerHands[this.#activeHandIndex] = addCardToHand(
      this.#playerHands[this.#activeHandIndex], card
    );

    if (this.#playerHands[this.#activeHandIndex].isBust) {
      this.#revealDealerHoleCard();
      this.#result = {
        outcome: 'LOSS',
        playerValue: this.#playerHands[this.#activeHandIndex].value,
        dealerValue: this.#dealerHand.value,
        payout: 0,
        handResults: [{ outcome: 'LOSS', payout: 0 }]
      };
      this.#phase = 'ROUND_OVER';
    }
    return this.#getState();
  }

  stand() {
    if (this.#phase !== 'PLAYER_TURN') {
      throw new Error('Can only stand during PLAYER_TURN phase');
    }
    this.#phase = 'DEALER_TURN';
    this.#playDealerTurn();
    this.#resolveRound();
    return this.#getState();
  }

  doubleDown() {
    if (this.#phase !== 'PLAYER_TURN') {
      throw new Error('Can only double down during PLAYER_TURN phase');
    }
    const hand = this.#playerHands[this.#activeHandIndex];
    if (hand.cards.length !== 2) {
      throw new Error('Can only double down on first two cards');
    }
    if (this.#chips < this.#currentBet) {
      throw new Error('Insufficient chips to double down');
    }

    // Double the bet
    this.#chips -= this.#currentBet;
    this.#currentBet *= 2;
    this.#playerHands[this.#activeHandIndex] = { ...hand, bet: this.#currentBet };

    // Draw exactly one card
    const card = this.#deck.draw();
    this.#playerHands[this.#activeHandIndex] = addCardToHand(
      this.#playerHands[this.#activeHandIndex], card
    );

    if (this.#playerHands[this.#activeHandIndex].isBust) {
      this.#revealDealerHoleCard();
      this.#result = {
        outcome: 'LOSS',
        playerValue: this.#playerHands[this.#activeHandIndex].value,
        dealerValue: this.#dealerHand.value,
        payout: 0,
        handResults: [{ outcome: 'LOSS', payout: 0 }]
      };
      this.#phase = 'ROUND_OVER';
    } else {
      this.#phase = 'DEALER_TURN';
      this.#playDealerTurn();
      this.#resolveRound();
    }
    return this.#getState();
  }

  startNewRound() {
    if (this.#phase !== 'ROUND_OVER') {
      throw new Error('Can only start new round after ROUND_OVER');
    }
    if (this.#chips === 0) {
      throw new Error('No chips remaining — session over. Call resetSession()');
    }
    this.#phase = 'BETTING';
    this.#currentBet = 0;
    this.#playerHands = [];
    this.#dealerHand = createHand();
    this.#result = null;
    this.#activeHandIndex = 0;
    return this.#getState();
  }

  getAvailableActions() {
    switch (this.#phase) {
      case 'BETTING':
        return ['placeBet'];
      case 'DEALING':
        return ['deal'];
      case 'PLAYER_TURN': {
        const actions = ['hit', 'stand'];
        const hand = this.#playerHands[this.#activeHandIndex];
        if (hand.cards.length === 2 && this.#chips >= this.#currentBet) {
          actions.push('doubleDown');
        }
        return actions;
      }
      case 'DEALER_TURN':
        return [];
      case 'ROUND_OVER':
        if (this.#chips === 0) {
          return ['resetSession'];
        }
        return ['startNewRound'];
      default:
        return [];
    }
  }

  resetSession() {
    this.#chips = 100000;
    this.#phase = 'BETTING';
    this.#currentBet = 0;
    this.#playerHands = [];
    this.#dealerHand = createHand();
    this.#result = null;
    this.#activeHandIndex = 0;
    return this.#getState();
  }

  getState() {
    return this.#getState();
  }

  #playDealerTurn() {
    this.#revealDealerHoleCard();

    // Recompute dealer hand value with all cards visible
    const visibleCards = this.#dealerHand.cards.map(c => ({ ...c, faceDown: false }));
    const dealerComputed = computeHandValue(visibleCards);
    this.#dealerHand = { ...this.#dealerHand, cards: visibleCards, ...dealerComputed };

    // Dealer hits while value < 17, stands on all 17s (hard and soft)
    while (this.#dealerHand.value < 17) {
      const card = this.#deck.draw();
      this.#dealerHand = addCardToHand(this.#dealerHand, card);
    }
  }

  #revealDealerHoleCard() {
    const revealedCards = this.#dealerHand.cards.map(c => ({ ...c, faceDown: false }));
    const dealerComputed = computeHandValue(revealedCards);
    this.#dealerHand = { ...this.#dealerHand, cards: revealedCards, ...dealerComputed };
  }

  #resolveRound() {
    const playerHand = this.#playerHands[this.#activeHandIndex];
    const dealerValue = this.#dealerHand.value;
    const playerValue = playerHand.value;
    let roundOutcome, roundPayout;

    if (this.#dealerHand.isBust) {
      roundOutcome = 'WIN';
      roundPayout = this.#currentBet * 2;
    } else if (playerValue > dealerValue) {
      roundOutcome = 'WIN';
      roundPayout = this.#currentBet * 2;
    } else if (playerValue < dealerValue) {
      roundOutcome = 'LOSS';
      roundPayout = 0;
    } else {
      roundOutcome = 'PUSH';
      roundPayout = this.#currentBet;
    }

    this.#chips += roundPayout;
    this.#result = {
      outcome: roundOutcome,
      playerValue,
      dealerValue,
      payout: roundPayout,
      handResults: [{ outcome: roundOutcome, payout: roundPayout }]
    };
    this.#phase = 'ROUND_OVER';
  }

  #getState() {
    return {
      phase: this.#phase,
      playerHands: this.#playerHands.map(h => ({
        cards: h.cards.map(c => ({ ...c })),
        value: h.value,
        isSoft: h.isSoft,
        isBust: h.isBust,
        isBlackjack: h.isBlackjack,
        bet: h.bet
      })),
      dealerHand: {
        cards: this.#dealerHand.cards.map(c => ({ ...c })),
        value: this.#dealerHand.value,
        isSoft: this.#dealerHand.isSoft,
        isBust: this.#dealerHand.isBust,
        isBlackjack: this.#dealerHand.isBlackjack,
        bet: this.#dealerHand.bet
      },
      chips: this.#chips,
      currentBet: this.#currentBet,
      result: this.#result ? {
        ...this.#result,
        handResults: this.#result.handResults.map(hr => ({ ...hr }))
      } : null
    };
  }
}
