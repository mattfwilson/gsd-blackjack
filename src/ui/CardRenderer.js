/**
 * CardRenderer — pure CSS card DOM creation and chip display utility.
 */

const SUIT_SYMBOLS = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

const RED_SUITS = new Set(['hearts', 'diamonds']);

/**
 * Create a card DOM element from a card data object.
 * @param {{ suit: string, rank: string, faceDown: boolean }} card
 * @returns {HTMLDivElement}
 */
export function createCardElement(card) {
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const colorClass = RED_SUITS.has(card.suit) ? 'bj-card--red' : 'bj-card--black';

  const outer = document.createElement('div');
  outer.className = 'bj-card';
  if (card.faceDown) {
    outer.classList.add('bj-card--flipped');
  }

  const inner = document.createElement('div');
  inner.className = 'bj-card-inner';

  const front = document.createElement('div');
  front.className = `bj-card-front ${colorClass}`;

  const cornerTop = document.createElement('span');
  cornerTop.className = 'bj-card-corner bj-card-corner--top';
  cornerTop.innerHTML = `${card.rank}<br>${suitSymbol}`;

  const centerSuit = document.createElement('span');
  centerSuit.className = 'bj-card-suit';
  centerSuit.textContent = suitSymbol;

  const cornerBottom = document.createElement('span');
  cornerBottom.className = 'bj-card-corner bj-card-corner--bottom';
  cornerBottom.innerHTML = `${card.rank}<br>${suitSymbol}`;

  front.appendChild(cornerTop);
  front.appendChild(centerSuit);
  front.appendChild(cornerBottom);

  const back = document.createElement('div');
  back.className = 'bj-card-back';

  inner.appendChild(front);
  inner.appendChild(back);
  outer.appendChild(inner);

  return outer;
}

/**
 * Format integer cents as a dollar display string.
 * @param {number} cents - Amount in integer cents
 * @returns {string} Formatted string like "$850" or "$1,000"
 */
export function formatChips(cents) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}
