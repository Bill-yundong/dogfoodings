import { createStore, produce } from 'solid-js/store'
import type { FocusSample, FocusSession, FocusLevel, DistractionEvent } from '~/types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function classifyFocus(value: number): FocusLevel {
  if (value >= 80) return "deep"
  if (value >= 50) return "moderate"
  if (value >= 25) return "distracted"
  return "idle"
}

interface FocusState {
  currentFocus: number
  currentLevel: FocusLevel
  isTracking: boolean
  currentSession: FocusSession | null
  todaySamples: FocusSample[]
  todayDeepFocusMinutes: number
  todayDistractions: DistractionEvent[]
  hourlyProfile: Array<{ hour: number; avgFocus: number; sampleCount: number }>
}

const [focusState, setFocusState] = createStore<FocusState>({
  currentFocus: 0,
  currentLevel: "idle",
  isTracking: false,
  currentSession: null,
  todaySamples: [],
  todayDeepFocusMinutes: 0,
  todayDistractions: [],
  hourlyProfile: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    avgFocus: 0,
    sampleCount: 0,
  })),
})

let trackingInterval: ReturnType<typeof setInterval> | null = null
let deepFocusStart: number | null = null

function simulateFocusValue(): number {
  const hour = new Date().getHours()
  const baseCurve = 30 + 40 * Math.sin((hour - 6) * Math.PI / 12)
  const noise = (Math.random() - 0.5) * 20
  const trend = focusState.currentFocus > 0 ? focusState.currentFocus * 0.3 : baseCurve * 0.5
  const value = Math.max(0, Math.min(100, baseCurve * 0.4 + trend * 0.6 + noise + 15))
  return Math.round(value)
}

export function startTracking() {
  if (focusState.isTracking) return

  const session: FocusSession = {
    id: generateId(),
    startTime: Date.now(),
    endTime: null,
    samples: [],
    deepFocusIntervals: [],
    distractions: [],
  }

  setFocusState({
    isTracking: true,
    currentSession: session,
    currentFocus: 50,
    currentLevel: "moderate",
  })

  trackingInterval = setInterval(() => {
    const value = simulateFocusValue()
    const level = classifyFocus(value)
    const sample: FocusSample = { timestamp: Date.now(), value, type: level }

    setFocusState(produce((s) => {
      s.currentFocus = value
      s.currentLevel = level
      s.todaySamples = [...s.todaySamples, sample]

      if (s.currentSession) {
        s.currentSession.samples = [...s.currentSession.samples, sample]
      }

      if (level === "deep" && deepFocusStart === null) {
        deepFocusStart = Date.now()
      } else if (level !== "deep" && deepFocusStart !== null) {
        const deepMinutes = (Date.now() - deepFocusStart) / 60000
        if (deepMinutes >= 5) {
          s.todayDeepFocusMinutes += deepMinutes
          if (s.currentSession) {
            s.currentSession.deepFocusIntervals = [
              ...s.currentSession.deepFocusIntervals,
              { start: deepFocusStart, end: Date.now() },
            ]
          }
        }
        deepFocusStart = null
      }

      const hour = new Date().getHours()
      const profileEntry = s.hourlyProfile[hour]
      if (profileEntry) {
        const total = profileEntry.avgFocus * profileEntry.sampleCount + value
        const count = profileEntry.sampleCount + 1
        s.hourlyProfile[hour] = { hour, avgFocus: total / count, sampleCount: count }
      }
    }))
  }, 1000)
}

export function stopTracking() {
  if (!focusState.isTracking) return

  if (trackingInterval) {
    clearInterval(trackingInterval)
    trackingInterval = null
  }

  if (deepFocusStart !== null) {
    const deepMinutes = (Date.now() - deepFocusStart) / 60000
    if (deepMinutes >= 5) {
      setFocusState("todayDeepFocusMinutes", (prev) => prev + deepMinutes)
    }
    deepFocusStart = null
  }

  setFocusState(produce((s) => {
    if (s.currentSession) {
      s.currentSession.endTime = Date.now()
    }
    s.isTracking = false
  }))
}

export function addDistraction(type: string, note?: string) {
  const event: DistractionEvent = {
    id: generateId(),
    timestamp: Date.now(),
    type,
    note,
  }

  setFocusState(produce((s) => {
    s.todayDistractions = [...s.todayDistractions, event]
    if (s.currentSession) {
      s.currentSession.distractions = [...s.currentSession.distractions, event]
    }
  }))
}

export { focusState }
