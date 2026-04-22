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
 * Schedules a band-passed white-noise burst.
 * The filter sweeps from 200 Hz to 4 kHz over the duration for a whoosh effect.
 *
 * @param {number} startTime - AudioContext time (seconds) when the noise begins.
 * @param {number} duration  - Length of the burst in seconds.
 * @param {number} gain      - Initial gain amplitude (0–1).
 * @param {AudioContext} audioCtx - The AudioContext to schedule on.
 */
function playNoise(startTime, duration, gain, audioCtx) {
  const bufferSize = audioCtx.sampleRate * duration
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const source = audioCtx.createBufferSource()
  source.buffer = buffer
  const bandpass = audioCtx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.setValueAtTime(200, startTime)
  bandpass.frequency.exponentialRampToValueAtTime(4000, startTime + duration)
  bandpass.Q.value = 1.5
  const gainNode = audioCtx.createGain()
  gainNode.gain.setValueAtTime(gain, startTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  source.connect(bandpass)
  bandpass.connect(gainNode)
  gainNode.connect(audioCtx.destination)
  source.start(startTime)
  source.stop(startTime + duration)
}

/**
 * Plays a four-note ascending reveal sting (C5 → E5 → G5 → C6) for a correct answer.
 * No-op when muted.
 */
export function playCorrect() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    playTone(523, now, 0.12, 0.3, c)         // C5
    playTone(659, now + 0.1, 0.12, 0.3, c)   // E5
    playTone(784, now + 0.2, 0.12, 0.3, c)   // G5
    playTone(1047, now + 0.3, 0.25, 0.35, c) // C6
  } catch {}
}

/**
 * Plays a two-note descending rumble to signal a wrong answer.
 * No-op when muted.
 */
export function playWrong() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    playTone(110, now, 0.2, 0.4, c)         // A2
    playTone(87, now + 0.15, 0.35, 0.35, c) // F2
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
 * Plays a cinematic impact boom with high-frequency transient stabs.
 * Intended for welcome-screen entry or dramatic reveals.
 * No-op when muted.
 */
export function playIntroImpact() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.connect(g)
    g.connect(c.destination)
    osc.frequency.value = 60
    g.gain.setValueAtTime(0.5, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc.start(now)
    osc.stop(now + 0.6)
    playTone(2500, now, 0.08, 0.2, c)
    playTone(3200, now + 0.02, 0.06, 0.15, c)
  } catch {}
}

/**
 * Plays a short three-note ascending chime to celebrate an achievement.
 * No-op when muted.
 */
export function playAchievement() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    playTone(880, now, 0.1, 0.2, c)
    playTone(1109, now + 0.08, 0.1, 0.2, c)
    playTone(1319, now + 0.16, 0.2, 0.25, c)
  } catch {}
}

/**
 * Plays an unlock flourish combining a high arpeggio with low bass tones.
 * Used when a new theme or cosmetic is unlocked.
 * No-op when muted.
 */
export function playThemeUnlock() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    playTone(880, now, 0.1, 0.2, c)
    playTone(1109, now + 0.08, 0.1, 0.2, c)
    playTone(1319, now + 0.16, 0.25, 0.25, c)
    playTone(220, now + 0.1, 0.5, 0.15, c)
    playTone(277, now + 0.1, 0.5, 0.12, c)
  } catch {}
}

/**
 * Plays a quick high-pitched ping to signal a new collection item.
 * No-op when muted.
 */
export function playCollectionNew() {
  if (_muted) return
  try {
    const c = getCtx()
    playTone(1200, c.currentTime, 0.1, 0.1, c)
  } catch {}
}

/**
 * Plays a short noise whoosh for round-transition wipes.
 * No-op when muted.
 */
export function playRoundWipe() {
  if (_muted) return
  try {
    const c = getCtx()
    playNoise(c.currentTime, 0.3, 0.12, c)
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
