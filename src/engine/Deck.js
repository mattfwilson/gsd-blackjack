export class Deck {
  #cards = [];
  #cutPoint;
  #drawIndex = 0;

  constructor(deckCount = 6) {
    this.#cutPoint = Math.floor(deckCount * 52 * 0.75);
    this.#buildAndShuffle(deckCount);
  }

  #buildAndShuffle(deckCount) {
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
    if (this.#drawIndex >= this.#cards.length) {
      throw new Error('Shoe is empty — call reset() before drawing');
    }
    const card = this.#cards[this.#drawIndex];
    this.#drawIndex++;
    return { ...card, faceDown: false };
  }

  needsReshuffle() {
    return this.#drawIndex >= this.#cutPoint;
  }

  reset(deckCount = 6) {
    this.#buildAndShuffle(deckCount);
  }

  cardsRemaining() {
    return this.#cards.length - this.#drawIndex;
  }
}
