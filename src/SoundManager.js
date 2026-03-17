/**
 * SoundManager — no-op stub for sound events.
 * Phase 3 will wire these to AnimationManager lifecycle events.
 * To activate a sound: provide an audio file path and replace the no-op body.
 */
export class SoundManager {
  /** Called when a card is dealt to any hand */
  cardDealt() {}

  /** Called when player places a bet */
  betPlaced() {}

  /** Called when player wins chips */
  chipsWon() {}

  /** Called when player wins a round */
  roundWon() {}

  /** Called when a hand busts */
  bust() {}
}
