/**
 * @fileoverview Web Audio API sound effects for MarvelMe.
 * All sounds are synthesised tones — no audio files required.
 * The muted state is persisted to localStorage so it survives page reloads.
 */

/** Shared AudioContext, lazily created on first use. */
let ctx = null
let _muted = localStorage.getItem('marvelme-muted') === 'true'

/**
 * Returns the shared AudioContext, creating it on first call.
 * Lazy initialisation avoids browser autoplay restrictions.
 *
 * @returns {AudioContext}
 */
function getCtx() {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

/**
 * Schedules a single synthesised tone using an OscillatorNode.
 * Gain fades to near-silence at the end of the duration for a clean tail.
 *
 * @param {number} frequency - Tone frequency in Hz.
 * @param {number} startTime - AudioContext time (seconds) when the tone begins.
 * @param {number} duration  - Length of the tone in seconds.
 * @param {number} gain      - Initial gain amplitude (0–1).
 * @param {AudioContext} audioCtx - The AudioContext to schedule on.
 */
function playTone(frequency, startTime, duration, gain, audioCtx) {
  const osc = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()
  osc.connect(gainNode)
  gainNode.connect(audioCtx.destination)
  osc.frequency.value = frequency
  gainNode.gain.setValueAtTime(gain, startTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

/**
 * Plays a two-note ascending chime (C5 → E5) to signal a correct answer.
 * No-op when muted.
 */
export function playCorrect() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    playTone(523, now, 0.15, 0.3, c)        // C5
    playTone(659, now + 0.1, 0.2, 0.3, c)   // E5
  } catch {}
}

/**
 * Plays a two-note descending thud to signal a wrong answer.
 * No-op when muted.
 */
export function playWrong() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    playTone(220, now, 0.1, 0.3, c)
    playTone(160, now + 0.1, 0.25, 0.3, c)
  } catch {}
}

/**
 * Plays a short single beep to acknowledge a hint being used.
 * No-op when muted.
 */
export function playHint() {
  if (_muted) return
  try {
    const c = getCtx()
    playTone(440, c.currentTime, 0.08, 0.15, c)
  } catch {}
}

/**
 * Plays a three-note ascending fanfare (G4 → C5 → E5) at game over.
 * No-op when muted.
 */
export function playGameOver() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    playTone(392, now, 0.15, 0.3, c)         // G4
    playTone(523, now + 0.12, 0.15, 0.3, c)  // C5
    playTone(659, now + 0.24, 0.3, 0.3, c)   // E5
  } catch {}
}

/**
 * Returns whether sound effects are currently muted.
 *
 * @returns {boolean}
 */
export function isMuted() {
  return _muted
}

/**
 * Sets the global mute state and persists it to localStorage.
 *
 * @param {boolean} bool - Pass true to mute, false to unmute.
 */
export function setMuted(bool) {
  _muted = bool
  localStorage.setItem('marvelme-muted', bool)
}
