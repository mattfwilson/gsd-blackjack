import { Deck } from '../src/engine/Deck.js';

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    console.log(`PASS: ${label}`);
    passed++;
  } else {
    console.log(`FAIL: ${label} -- expected ${expected}, got ${actual}`);
    failed++;
  }
}

function assertDeepEqual(actual, expected, label) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    console.log(`PASS: ${label}`);
    passed++;
  } else {
    console.log(`FAIL: ${label}`);
    console.log(`  Expected: ${expectedStr}`);
    console.log(`  Actual:   ${actualStr}`);
    failed++;
  }
}

function assertTrue(condition, label) {
  assertEqual(condition, true, label);
}

function assertThrows(fn, label) {
  try {
    fn();
    console.log(`FAIL: ${label} -- expected error but none thrown`);
    failed++;
  } catch (err) {
    console.log(`PASS: ${label}`);
    passed++;
  }
}

// ============================================================
// Deck Tests
// ============================================================

console.log('\n--- Deck Tests ---\n');

// Test: new Deck(6) creates a shoe, draw() returns a card object with correct shape
{
  const deck = new Deck(6);
  const card = deck.draw();
  assertTrue(
    card !== null && typeof card === 'object' &&
    typeof card.suit === 'string' &&
    typeof card.rank === 'string' &&
    card.faceDown === false,
    'draw() returns card with { suit, rank, faceDown: false } shape'
  );
}

// Test: Drawing 312 cards exhausts a 6-deck shoe
{
  const deck = new Deck(6);
  let drawCount = 0;
  let errorOccurred = false;
  try {
    for (let i = 0; i < 312; i++) {
      deck.draw();
      drawCount++;
    }
  } catch (err) {
    errorOccurred = true;
  }
  assertEqual(drawCount, 312, 'Drawing 312 cards from 6-deck shoe succeeds');
  assertTrue(!errorOccurred, 'No error on 312 draws');
}

// Test: Drawing 313th card throws
{
  const deck = new Deck(6);
  for (let i = 0; i < 312; i++) {
    deck.draw();
  }
  assertThrows(() => deck.draw(), 'Drawing 313th card throws error');
}

// Test: Card suits are valid
{
  const validSuits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const deck = new Deck(6);
  let allValid = true;
  for (let i = 0; i < 20; i++) {
    const card = deck.draw();
    if (!validSuits.includes(card.suit)) {
      allValid = false;
      break;
    }
  }
  assertTrue(allValid, 'Card suits are one of hearts, diamonds, clubs, spades');
}

// Test: Card ranks are valid
{
  const validRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = new Deck(6);
  let allValid = true;
  for (let i = 0; i < 20; i++) {
    const card = deck.draw();
    if (!validRanks.includes(card.rank)) {
      allValid = false;
      break;
    }
  }
  assertTrue(allValid, "Card ranks are one of A, 2-10, J, Q, K");
}

// Test: needsReshuffle() returns false before cut point and true at/after cut point
{
  const deck = new Deck(6);
  // Cut point is Math.floor(312 * 0.75) = 234
  for (let i = 0; i < 233; i++) {
    deck.draw();
  }
  assertTrue(!deck.needsReshuffle(), 'needsReshuffle() is false before cut point (233 drawn)');
  deck.draw(); // 234th card drawn, drawIndex is now 234
  assertTrue(deck.needsReshuffle(), 'needsReshuffle() is true at cut point (234 drawn)');
}

// Test: reset() creates a fresh shuffled shoe
{
  const deck = new Deck(6);
  for (let i = 0; i < 100; i++) {
    deck.draw();
  }
  assertEqual(deck.cardsRemaining(), 212, 'cardsRemaining() is 212 after 100 draws');
  deck.reset();
  assertEqual(deck.cardsRemaining(), 312, 'After reset(), cardsRemaining() is 312');
}

// Test: Two consecutive shuffles produce different card orders
{
  const deck1 = new Deck(6);
  const firstOrder = [];
  for (let i = 0; i < 10; i++) {
    const card = deck1.draw();
    firstOrder.push(`${card.rank}${card.suit}`);
  }

  const deck2 = new Deck(6);
  const secondOrder = [];
  for (let i = 0; i < 10; i++) {
    const card = deck2.draw();
    secondOrder.push(`${card.rank}${card.suit}`);
  }

  const sameOrder = firstOrder.every((val, idx) => val === secondOrder[idx]);
  assertTrue(!sameOrder, 'Two shuffles produce different card orders (first 10 cards)');
}

// ============================================================
// Summary
// ============================================================

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (typeof process !== 'undefined') process.exit(failed > 0 ? 1 : 0);
