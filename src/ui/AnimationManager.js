import { ANIM } from '../constants.js';

/**
 * AnimationManager -- Promise-based animation orchestration for deal, flip,
 * discard, and single card slide-in. All timings from ANIM constants.
 */
export class AnimationManager {
  #busy = false;

  get isBusy() { return this.#busy; }

  forceUnlock() { this.#busy = false; }

  /**
   * Animate cards from shoe to hand positions with staggered timing.
   * Cards should already be in the DOM at their final layout position with opacity 0.
   * Uses CSS transforms to slide from shoe offset to final position.
   * @param {HTMLElement[]} cardElements - Cards in deal order
   * @param {HTMLElement} shoeEl - Shoe element (animation source)
   */
  async dealCards(cardElements, shoeEl) {
    this.#busy = true;
    const shoeRect = shoeEl.getBoundingClientRect();

    for (let i = 0; i < cardElements.length; i++) {
      const el = cardElements[i];
      const cardRect = el.getBoundingClientRect();

      // Calculate offset from card's final position to shoe position
      const dx = shoeRect.left - cardRect.left;
      const dy = shoeRect.top - cardRect.top;

      // Start at shoe position, invisible
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.opacity = '0';

      // Force reflow so browser registers the start state
      el.offsetHeight;

      // Apply transition and animate to final position
      el.style.transition = `transform ${ANIM.DEAL_DURATION}ms ease-out, opacity ${ANIM.DEAL_DURATION}ms ease-out`;
      el.style.transform = 'translate(0, 0)';
      el.style.opacity = '1';

      await this.#waitForTransition(el, ANIM.DEAL_DURATION);

      // Clean up inline transition after animation completes
      el.style.transition = '';

      // Stagger delay before next card (except after last)
      if (i < cardElements.length - 1) {
        await this.#delay(ANIM.DEAL_STAGGER);
      }
    }

    this.#busy = false;
  }

  /**
   * 3D flip for dealer hole card reveal.
   * Removes bj-card--flipped class; CSS transition on .bj-card-inner handles rotation.
   * @param {HTMLElement} cardElement - The card element with bj-card--flipped class
   */
  async flipCard(cardElement) {
    this.#busy = true;

    cardElement.classList.remove('bj-card--flipped');

    const inner = cardElement.querySelector('.bj-card-inner');
    await this.#waitForTransition(inner, ANIM.FLIP_DURATION);

    this.#busy = false;
  }

  /**
   * Sweep cards to discard pile with staggered timing.
   * Cards start moving toward discard pile with overlapping timing for visual effect.
   * @param {HTMLElement[]} cardElements - All card elements to discard
   * @param {HTMLElement} discardEl - Discard pile element (animation target)
   */
  async discardAll(cardElements, discardEl) {
    this.#busy = true;
    const discardRect = discardEl.getBoundingClientRect();

    for (let i = 0; i < cardElements.length; i++) {
      const el = cardElements[i];
      const cardRect = el.getBoundingClientRect();

      // Calculate offset to discard pile
      const dx = discardRect.left - cardRect.left;
      const dy = discardRect.top - cardRect.top;

      el.style.transition = `transform ${ANIM.DISCARD_DURATION}ms ease-in, opacity ${ANIM.DISCARD_DURATION}ms ease-in`;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.opacity = '0.5';

      // Do NOT await each card -- let them overlap for visual effect
      // Stagger delay before starting next card
      if (i < cardElements.length - 1) {
        await this.#delay(ANIM.DISCARD_STAGGER);
      }
    }

    // Wait for the last card's transition to complete
    await this.#delay(ANIM.DISCARD_DURATION);

    this.#busy = false;
  }

  /**
   * Single card slide-in from shoe (for hit/double).
   * Card should already be in the DOM at its final position with opacity 0.
   * @param {HTMLElement} cardElement - The new card element
   * @param {HTMLElement} shoeEl - Shoe element (animation source)
   */
  async slideCardIn(cardElement, shoeEl) {
    this.#busy = true;

    const shoeRect = shoeEl.getBoundingClientRect();
    const cardRect = cardElement.getBoundingClientRect();

    const dx = shoeRect.left - cardRect.left;
    const dy = shoeRect.top - cardRect.top;

    cardElement.style.transform = `translate(${dx}px, ${dy}px)`;
    cardElement.style.opacity = '0';

    // Force reflow
    cardElement.offsetHeight;

    cardElement.style.transition = `transform ${ANIM.DEAL_DURATION}ms ease-out, opacity ${ANIM.DEAL_DURATION}ms ease-out`;
    cardElement.style.transform = 'translate(0, 0)';
    cardElement.style.opacity = '1';

    await this.#waitForTransition(cardElement, ANIM.DEAL_DURATION);

    // Clean up inline transition
    cardElement.style.transition = '';

    this.#busy = false;
  }

  /**
   * Wait for a CSS transition to end with safety timeout.
   * @param {HTMLElement} element
   * @param {number} duration - Expected transition duration in ms
   * @returns {Promise<void>}
   */
  #waitForTransition(element, duration) {
    return new Promise(resolve => {
      let settled = false;

      const onEnd = () => {
        if (settled) return;
        settled = true;
        clearTimeout(safetyTimer);
        resolve();
      };

      element.addEventListener('transitionend', onEnd, { once: true });

      // Safety timeout in case transitionend never fires
      const safetyTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        element.removeEventListener('transitionend', onEnd);
        resolve();
      }, duration + 50);
    });
  }

  /**
   * Simple delay helper.
   * @param {number} ms
   * @returns {Promise<void>}
   */
  #delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
