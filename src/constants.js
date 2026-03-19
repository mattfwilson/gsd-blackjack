/**
 * Dealer deviation probability — fraction of decisions where
 * the dealer inverts standard hit/stand logic.
 */
export const DEALER_DEVIATION_PROB = 0.06;

/**
 * Animation timing constants.
 * Single source of truth — synced to CSS custom properties via syncAnimToCSS().
 */
export const ANIM = Object.freeze({
  DEAL_DURATION: 150,
  DEAL_STAGGER: 100,
  FLIP_DURATION: 300,
  DISCARD_DURATION: 200,
  DISCARD_STAGGER: 80,
  RESULT_DISPLAY: 2000,
  RESULT_FADE: 300,
  HAND_ADVANCE_DELAY: 800,
  BANNER_SEQUENTIAL: 1500,
});

/**
 * Swappable asset path constants.
 * Phase 2 uses CSS-rendered cards (no images). These placeholders allow
 * future phases to swap in image or sound assets without code changes.
 */
export const ASSET_PATHS = Object.freeze({
  CARD_BACK: 'default',
  SOUNDS: Object.freeze({
    cardDealt: '',
    betPlaced: '',
    chipsWon: '',
    roundWon: '',
    bust: '',
    splitPlaced: '',
    insurancePlaced: '',
    insuranceWon: '',
  }),
});

/**
 * Push ANIM values to CSS custom properties on :root.
 * Call once on page load so CSS transitions consume JS-defined timings.
 */
export function syncAnimToCSS() {
  const root = document.documentElement.style;
  root.setProperty('--bj-deal-duration', `${ANIM.DEAL_DURATION}ms`);
  root.setProperty('--bj-deal-stagger', `${ANIM.DEAL_STAGGER}ms`);
  root.setProperty('--bj-flip-duration', `${ANIM.FLIP_DURATION}ms`);
  root.setProperty('--bj-discard-duration', `${ANIM.DISCARD_DURATION}ms`);
  root.setProperty('--bj-discard-stagger', `${ANIM.DISCARD_STAGGER}ms`);
  root.setProperty('--bj-result-display', `${ANIM.RESULT_DISPLAY}ms`);
  root.setProperty('--bj-result-fade', `${ANIM.RESULT_FADE}ms`);
  root.setProperty('--bj-hand-advance-delay', `${ANIM.HAND_ADVANCE_DELAY}ms`);
  root.setProperty('--bj-banner-sequential', `${ANIM.BANNER_SEQUENTIAL}ms`);
}
