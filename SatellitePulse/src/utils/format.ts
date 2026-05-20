import { format } from 'date-fns'
import type { VisibilityWindow, OrbitState } from '../core/types'

export function formatDateTime(timestamp: number): string {
  return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss')
}

export function formatTime(timestamp: number): string {
  return format(new Date(timestamp), 'HH:mm:ss')
}

export function formatDate(timestamp: number): string {
  return format(new Date(timestamp), 'yyyy-MM-dd')
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

export function formatDurationShort(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

export function formatLatitude(lat: number): string {
  const direction = lat >= 0 ? 'N' : 'S'
  return `${Math.abs(lat).toFixed(4)}°${direction}`
}

export function formatLongitude(lng: number): string {
  const direction = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lng).toFixed(4)}°${direction}`
}

export function formatAltitude(alt: number): string {
  return `${alt.toFixed(1)} km`
}

export function formatVelocity(vel: number): string {
  return `${vel.toFixed(2)} km/s`
}

export function formatElevation(elev: number): string {
  return `${elev.toFixed(1)}°`
}

export function formatAzimuth(az: number): string {
  return `${az.toFixed(1)}°`
}

export function getVisibilityStatus(window: VisibilityWindow, now: number): 'upcoming' | 'active' | 'passed' {
  if (now < window.startTime) return 'upcoming'
  if (now > window.endTime) return 'passed'
  return 'active'
}

export function getTimeUntilStart(window: VisibilityWindow, now: number): number {
  return Math.max(0, window.startTime - now)
}

export function getTimeUntilEnd(window: VisibilityWindow, now: number): number {
  return Math.max(0, window.endTime - now)
}

export function getProgress(window: VisibilityWindow, now: number): number {
  if (now < window.startTime) return 0
  if (now > window.endTime) return 100
  
  const total = window.endTime - window.startTime
  const elapsed = now - window.startTime
  return (elapsed / total) * 100
}

export function formatOrbitState(state: OrbitState): string {
  return `Lat: ${formatLatitude(state.latitude)}, Lon: ${formatLongitude(state.longitude)}, Alt: ${formatAltitude(state.altitude)}`
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
