import { useState } from 'react'

const STORAGE_KEY = 'marvelme-daily'

/**
 * Returns today's date as a numeric key (YYYYMMDD), matching the seed format
 * used by getDailySeed() in useGame.js so they stay in sync.
 * @returns {number}
 */
function getTodayKey() {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

/**
 * Reads today's completion record from localStorage.
 * Returns null if nothing is stored or the stored record is from a previous day.
 * @returns {{ date: number, score: number, grade: string } | null}
 */
function readRecord() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.date === getTodayKey() ? parsed : null
  } catch {
    return null
  }
}

/**
 * Tracks daily challenge participation in localStorage.
 *
 * `todayRecord` is non-null if the player has already completed today's
 * daily challenge in this browser. It resets automatically the next calendar
 * day because the stored date is checked on every mount.
 *
 * @returns {{
 *   todayRecord: { date: number, score: number, grade: string } | null,
 *   markCompleted: (score: number, grade: string) => void
 * }}
 */
export function useDailyChallenge() {
  const [todayRecord, setTodayRecord] = useState(readRecord)

  function markCompleted(score, grade) {
    const record = { date: getTodayKey(), score, grade }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
    } catch {
      // Ignore storage errors (e.g. private browsing quota exceeded)
    }
    setTodayRecord(record)
  }

  return { todayRecord, markCompleted }
}
