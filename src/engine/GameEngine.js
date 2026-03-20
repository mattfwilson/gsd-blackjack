import { Deck } from './Deck.js';
import { computeHandValue, createHand, addCardToHand } from './Hand.js';
import { DEALER_DEVIATION_PROB } from '../constants.js';

export class GameEngine {
  #deck;
  #phase;
  #playerHands;
  #dealerHand;
  #chips;
  #currentBet;
  #result;
  #activeHandIndex;
  #hasSplit;
  #insuranceBet;
  #deviationCount;

  constructor() {
    this.#deck = new Deck(6);
    this.#chips = 500000;
    this.#phase = 'BETTING';
    this.#currentBet = 0;
    this.#playerHands = [];
    this.#dealerHand = createHand();
    this.#result = null;
    this.#activeHandIndex = 0;
    this.#hasSplit = false;
    this.#insuranceBet = 0;
    this.#deviationCount = 0;
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
    } else if (this.#dealerHand.cards[0].rank === 'A') {
      // Dealer shows ace, player doesn't have blackjack -- offer insurance
      this.#phase = 'INSURANCE_OFFER';
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
      const advanceResult = this.#advanceHand();
      if (advanceResult === 'DEALER_TURN') {
        // Check if ALL hands busted -- if so skip dealer turn
        const allBust = this.#playerHands.every(h => h.isBust);
        if (allBust) {
          this.#revealDealerHoleCard();
          this.#resolveRound();
        } else {
          this.#phase = 'DEALER_TURN';
          this.#playDealerTurn();
          this.#resolveRound();
        }
      }
      // else advanceResult === 'NEXT_HAND', stay in PLAYER_TURN
    }
    return this.#getState();
  }

  stand() {
    if (this.#phase !== 'PLAYER_TURN') {
      throw new Error('Can only stand during PLAYER_TURN phase');
    }
    const advanceResult = this.#advanceHand();
    if (advanceResult === 'DEALER_TURN') {
      this.#phase = 'DEALER_TURN';
      this.#playDealerTurn();
      this.#resolveRound();
    }
    // else NEXT_HAND, stay in PLAYER_TURN
    return this.#getState();
  }

  doubleDown() {
    if (this.#phase !== 'PLAYER_TURN') {
      throw new Error('Can only double down during PLAYER_TURN phase');
    }
    if (this.#hasSplit) {
      throw new Error('Cannot double down after splitting');
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
      this.#resolveRound();
    } else {
      this.#phase = 'DEALER_TURN';
      this.#playDealerTurn();
      this.#resolveRound();
    }
    return this.#getState();
  }

  split() {
    if (this.#phase !== 'PLAYER_TURN') {
      throw new Error('Can only split during PLAYER_TURN phase');
    }
    if (this.#hasSplit) {
      throw new Error('Cannot re-split');
    }
    const hand = this.#playerHands[0];
    if (hand.cards.length !== 2) {
      throw new Error('Can only split with exactly 2 cards');
    }
    const val0 = this.#getCardSplitValue(hand.cards[0]);
    const val1 = this.#getCardSplitValue(hand.cards[1]);
    if (val0 !== val1) {
      throw new Error('Can only split cards of equal value');
    }
    if (this.#chips < hand.bet) {
      throw new Error('Insufficient chips to split');
    }

    // Deduct second bet
    this.#chips -= hand.bet;

    const card1 = hand.cards[0];
    const card2 = hand.cards[1];
    const bet = hand.bet;

    // Create two new hands
    let hand0 = createHand(bet);
    hand0 = addCardToHand(hand0, card1);
    hand0 = addCardToHand(hand0, this.#deck.draw());

    let hand1 = createHand(bet);
    hand1 = addCardToHand(hand1, card2);
    hand1 = addCardToHand(hand1, this.#deck.draw());

    this.#playerHands = [hand0, hand1];
    this.#activeHandIndex = 0;
    this.#hasSplit = true;

    // Split aces: auto-stand both hands, go to dealer turn
    if (card1.rank === 'A') {
      this.#phase = 'DEALER_TURN';
      this.#playDealerTurn();
      this.#resolveRound();
      return this.#getState();
    }

    return this.#getState();
  }

  takeInsurance() {
    if (this.#phase !== 'INSURANCE_OFFER') {
      throw new Error('Can only take insurance during INSURANCE_OFFER phase');
    }
    const insuranceCost = Math.floor(this.#currentBet / 2);
    this.#chips -= insuranceCost;
    this.#insuranceBet = insuranceCost;

    // Check dealer blackjack
    const dealerTrueValue = computeHandValue(
      this.#dealerHand.cards.map(c => ({ ...c, faceDown: false }))
    );

    if (dealerTrueValue.isBlackjack) {
      // Insurance wins: pays 2:1
      const insurancePayout = this.#insuranceBet * 3; // original + 2x
      this.#chips += insurancePayout;
      this.#revealDealerHoleCard();
      this.#result = {
        outcome: 'LOSS',
        playerValue: this.#playerHands[0].value,
        dealerValue: dealerTrueValue.value,
        payout: 0,
        handResults: [{ outcome: 'LOSS', payout: 0 }],
        insuranceResult: 'WON',
        insurancePayout: insurancePayout
      };
      this.#phase = 'ROUND_OVER';
    } else {
      // Insurance lost
      this.#result = null;
      this.#phase = 'PLAYER_TURN';
    }
    return this.#getState();
  }

  declineInsurance() {
    if (this.#phase !== 'INSURANCE_OFFER') {
      throw new Error('Can only decline insurance during INSURANCE_OFFER phase');
    }

    // Check dealer blackjack anyway
    const dealerTrueValue = computeHandValue(
      this.#dealerHand.cards.map(c => ({ ...c, faceDown: false }))
    );

    if (dealerTrueValue.isBlackjack) {
      this.#revealDealerHoleCard();
      this.#result = {
        outcome: 'LOSS',
        playerValue: this.#playerHands[0].value,
        dealerValue: dealerTrueValue.value,
        payout: 0,
        handResults: [{ outcome: 'LOSS', payout: 0 }],
        insuranceResult: 'DECLINED',
        insurancePayout: 0
      };
      this.#phase = 'ROUND_OVER';
    } else {
      this.#phase = 'PLAYER_TURN';
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
    this.#hasSplit = false;
    this.#insuranceBet = 0;
    // Do NOT reset #deviationCount -- it accumulates across the session
    return this.#getState();
  }

  getAvailableActions() {
    switch (this.#phase) {
      case 'BETTING':
        return ['placeBet'];
      case 'DEALING':
        return ['deal'];
      case 'INSURANCE_OFFER':
        return ['takeInsurance', 'declineInsurance'];
      case 'PLAYER_TURN': {
        const actions = ['hit', 'stand'];
        const hand = this.#playerHands[this.#activeHandIndex];
        if (hand.cards.length === 2 && this.#chips >= hand.bet && !this.#hasSplit) {
          actions.push('doubleDown');
        }
        if (
          hand.cards.length === 2 &&
          !this.#hasSplit &&
          this.#getCardSplitValue(hand.cards[0]) === this.#getCardSplitValue(hand.cards[1]) &&
          this.#chips >= hand.bet
        ) {
          actions.push('split');
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

  resetRound() {
    this.#phase = 'BETTING';
    this.#currentBet = 0;
    this.#playerHands = [];
    this.#dealerHand = createHand();
    this.#result = null;
    this.#activeHandIndex = 0;
    this.#hasSplit = false;
    this.#insuranceBet = 0;
    return this.#getState();
  }

  resetSession() {
    this.#chips = 500000;
    this.#phase = 'BETTING';
    this.#currentBet = 0;
    this.#playerHands = [];
    this.#dealerHand = createHand();
    this.#result = null;
    this.#activeHandIndex = 0;
    this.#hasSplit = false;
    this.#insuranceBet = 0;
    this.#deviationCount = 0;
    return this.#getState();
  }

  getState() {
    return this.#getState();
  }

  #getCardSplitValue(card) {
    if (['J', 'Q', 'K'].includes(card.rank)) return 10;
    if (card.rank === 'A') return 11;
    return parseInt(card.rank, 10);
  }

  #advanceHand() {
    if (this.#activeHandIndex < this.#playerHands.length - 1) {
      this.#activeHandIndex++;
      return 'NEXT_HAND';
    }
    return 'DEALER_TURN';
  }

  #playDealerTurn() {
    this.#revealDealerHoleCard();

    // Recompute dealer hand value with all cards visible
    const visibleCards = this.#dealerHand.cards.map(c => ({ ...c, faceDown: false }));
    const dealerComputed = computeHandValue(visibleCards);
    this.#dealerHand = { ...this.#dealerHand, cards: visibleCards, ...dealerComputed };

    while (true) {
      const shouldHitStandard = this.#dealerHand.value < 17;
      let shouldHit = shouldHitStandard;

      if (Math.random() < DEALER_DEVIATION_PROB) {
        shouldHit = !shouldHitStandard;
        this.#deviationCount++;
      }

      if (!shouldHit) break;
      if (this.#dealerHand.isBust) break;

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
    }

    this.#chips += totalPayout;

    const totalBet = this.#playerHands.reduce((sum, h) => sum + h.bet, 0);
    const netOutcome = totalPayout > totalBet ? 'WIN'
                     : totalPayout < totalBet ? 'LOSS'
                     : 'PUSH';

    this.#result = {
      outcome: netOutcome,
      playerValue: this.#playerHands[0].value,
      dealerValue,
      payout: totalPayout,
      handResults
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
      activeHandIndex: this.#activeHandIndex,
      hasSplit: this.#hasSplit,
      insuranceBet: this.#insuranceBet,
      deviationCount: this.#deviationCount,
      result: this.#result ? {
        ...this.#result,
        handResults: this.#result.handResults.map(hr => ({ ...hr }))
      } : null
    };
  }
}
