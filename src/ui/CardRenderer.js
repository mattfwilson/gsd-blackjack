/**
 * CardRenderer — pure CSS card DOM creation and chip display utility.
 */

let _cardBackCounter = 0;

function createCardBackSVG() {
  const id = `cbp${++_cardBackCounter}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 160 224" style="display:block">
  <defs>
    <pattern id="${id}" x="1" y="1" width="18" height="18" patternUnits="userSpaceOnUse">
      <path d="M9,0 C12.5,2 12.5,7 9,9 C5.5,7 5.5,2 9,0Z" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="0.85"/>
      <path d="M9,9 C12.5,11 12.5,16 9,18 C5.5,16 5.5,11 9,9Z" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="0.85"/>
      <path d="M0,9 C2,5.5 7,5.5 9,9 C7,12.5 2,12.5 0,9Z" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="0.85"/>
      <path d="M9,9 C11,5.5 16,5.5 18,9 C16,12.5 11,12.5 9,9Z" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="0.85"/>
      <path d="M9,1.8 C11.5,3 11.5,6.5 9,7.5 C6.5,6.5 6.5,3 9,1.8Z" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="0.5"/>
      <path d="M9,10.5 C11.5,11.5 11.5,15 9,16.2 C6.5,15 6.5,11.5 9,10.5Z" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="0.5"/>
      <path d="M1.8,9 C3,6.5 6.5,6.5 7.5,9 C6.5,11.5 3,11.5 1.8,9Z" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="0.5"/>
      <path d="M10.5,9 C11.5,6.5 15,6.5 16.2,9 C15,11.5 11.5,11.5 10.5,9Z" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="0.5"/>
      <path d="M9,7.5 L9.4,8.6 L10.5,9 L9.4,9.4 L9,10.5 L8.6,9.4 L7.5,9 L8.6,8.6Z" fill="rgba(255,255,255,0.5)"/>
      <circle cx="0" cy="0" r="1.4" fill="rgba(255,255,255,0.4)"/>
      <circle cx="18" cy="0" r="1.4" fill="rgba(255,255,255,0.4)"/>
      <circle cx="0" cy="18" r="1.4" fill="rgba(255,255,255,0.4)"/>
      <circle cx="18" cy="18" r="1.4" fill="rgba(255,255,255,0.4)"/>
    </pattern>
  </defs>
  <rect width="160" height="224" rx="10" fill="#C41E3A"/>
  <rect width="160" height="224" rx="10" fill="url(#${id})"/>
  <rect x="5" y="5" width="150" height="214" rx="5.5" fill="none" stroke="white" stroke-width="2"/>
  <rect x="8.5" y="8.5" width="143" height="207" rx="3.5" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="0.75"/>
</svg>`;
}

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
  back.innerHTML = createCardBackSVG();

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
