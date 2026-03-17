export function computeHandValue(cards) {
  let value = 0;
  let aceCount = 0;

  for (const card of cards) {
    if (card.rank === 'A') {
      aceCount++;
      value += 11;
    } else if (card.rank === 'K' || card.rank === 'Q' || card.rank === 'J') {
      value += 10;
    } else {
      value += parseInt(card.rank, 10);
    }
  }

  while (value > 21 && aceCount > 0) {
    value -= 10;
    aceCount--;
  }

  const isSoft = aceCount > 0 && value <= 21;
  const isBust = value > 21;
  const isBlackjack = cards.length === 2 && value === 21;

  return { value, isSoft, isBust, isBlackjack };
}

export function createHand(betAmount = 0) {
  return {
    cards: [],
    value: 0,
    isSoft: false,
    isBust: false,
    isBlackjack: false,
    bet: betAmount
  };
}

export function addCardToHand(hand, card) {
  const cards = [...hand.cards, card];
  const computed = computeHandValue(cards);
  return { ...hand, cards, ...computed };
}
