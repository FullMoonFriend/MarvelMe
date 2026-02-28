let ctx = null
let _muted = localStorage.getItem('marvelme-muted') === 'true'

function getCtx() {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

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

export function playCorrect() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    playTone(523, now, 0.15, 0.3, c)        // C5
    playTone(659, now + 0.1, 0.2, 0.3, c)   // E5
  } catch {}
}

export function playWrong() {
  if (_muted) return
  try {
    const c = getCtx()
    const now = c.currentTime
    playTone(220, now, 0.1, 0.3, c)
    playTone(160, now + 0.1, 0.25, 0.3, c)
  } catch {}
}

export function playHint() {
  if (_muted) return
  try {
    const c = getCtx()
    playTone(440, c.currentTime, 0.08, 0.15, c)
  } catch {}
}

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

export function isMuted() {
  return _muted
}

export function setMuted(bool) {
  _muted = bool
  localStorage.setItem('marvelme-muted', bool)
}
