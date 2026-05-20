import * as satellite from 'satellite.js'
import type { TLEData, OrbitState, TrajectoryPoint, VisibilityWindow, GroundStation } from './types'
import { DEG2RAD, RAD2DEG, EARTH_RADIUS, SECONDS_PER_DAY } from './constants'

export function parseTLE(tle: TLEData): satellite.SatRec {
  return satellite.twoline2satrec(tle.line1, tle.line2)
}

export function getOrbitState(satrec: satellite.SatRec, date: Date): OrbitState | null {
  const positionAndVelocity = satellite.propagate(satrec, date)
  
  if (!positionAndVelocity.position || !positionAndVelocity.velocity) {
    return null
  }

  const positionEci = positionAndVelocity.position as satellite.EciVec3<number>
  const velocityEci = positionAndVelocity.velocity as satellite.EciVec3<number>

  const gmst = satellite.gstime(date)
  const positionGd = satellite.eciToGeodetic(positionEci, gmst)

  const velocity = Math.sqrt(
    velocityEci.x * velocityEci.x +
    velocityEci.y * velocityEci.y +
    velocityEci.z * velocityEci.z
  )

  return {
    latitude: positionGd.latitude * RAD2DEG,
    longitude: positionGd.longitude * RAD2DEG,
    altitude: positionGd.height,
    velocity,
    timestamp: date.getTime()
  }
}

export function generateTrajectory(
  satrec: satellite.SatRec,
  startTime: Date,
  durationMinutes: number,
  points: number
): TrajectoryPoint[] {
  const trajectory: TrajectoryPoint[] = []
  const stepMs = (durationMinutes * 60 * 1000) / points

  for (let i = 0; i < points; i++) {
    const time = new Date(startTime.getTime() + i * stepMs)
    const state = getOrbitState(satrec, time)
    
    if (state) {
      trajectory.push({
        latitude: state.latitude,
        longitude: state.longitude,
        timestamp: state.timestamp
      })
    }
  }

  return trajectory
}

export function calculateVisibility(
  satrec: satellite.SatRec,
  station: GroundStation,
  startTime: Date,
  endTime: Date,
  timeStepSeconds: number = 30
): VisibilityWindow[] {
  const windows: VisibilityWindow[] = []
  let currentWindow: VisibilityWindow | null = null
  let maxElevation = 0
  let startAzimuth = 0

  const stepMs = timeStepSeconds * 1000
  const observerGd = {
    latitude: station.latitude * DEG2RAD,
    longitude: station.longitude * DEG2RAD,
    height: station.elevation / 1000
  }

  for (let t = startTime.getTime(); t <= endTime.getTime(); t += stepMs) {
    const date = new Date(t)
    const positionAndVelocity = satellite.propagate(satrec, date)
    
    if (!positionAndVelocity.position) continue

    const positionEci = positionAndVelocity.position as satellite.EciVec3<number>
    const gmst = satellite.gstime(date)
    const lookAngles = satellite.ecfToLookAngles(
      observerGd,
      satellite.eciToEcf(positionEci, gmst)
    )

    const elevation = lookAngles.elevation * RAD2DEG

    if (elevation > station.minElevationAngle) {
      if (!currentWindow) {
        currentWindow = {
          id: `${station.id}-${satrec.satnum}-${t}`,
          satelliteId: String(satrec.satnum),
          satelliteName: '',
          stationId: station.id,
          stationName: station.name,
          startTime: t,
          endTime: t,
          maxElevation: elevation,
          azimuthStart: lookAngles.azimuth * RAD2DEG,
          azimuthEnd: lookAngles.azimuth * RAD2DEG
        }
        maxElevation = elevation
        startAzimuth = lookAngles.azimuth * RAD2DEG
      } else {
        currentWindow.endTime = t
        currentWindow.azimuthEnd = lookAngles.azimuth * RAD2DEG
        if (elevation > maxElevation) {
          maxElevation = elevation
          currentWindow.maxElevation = maxElevation
        }
      }
    } else if (currentWindow) {
      if (currentWindow.endTime - currentWindow.startTime > 60000) {
        currentWindow.azimuthStart = startAzimuth
        windows.push(currentWindow)
      }
      currentWindow = null
      maxElevation = 0
    }
  }

  if (currentWindow && currentWindow.endTime - currentWindow.startTime > 60000) {
    windows.push(currentWindow)
  }

  return windows
}

export function getNextPass(
  satrec: satellite.SatRec,
  station: GroundStation,
  fromTime: Date,
  maxSearchHours: number = 24
): VisibilityWindow | null {
  const endTime = new Date(fromTime.getTime() + maxSearchHours * 3600 * 1000)
  const windows = calculateVisibility(satrec, station, fromTime, endTime, 30)
  return windows.length > 0 ? windows[0] : null
}

export function getOrbitalPeriod(satrec: satellite.SatRec): number {
  const meanMotion = satrec.no
  return (2 * Math.PI / meanMotion) * 60
}

export function getGroundTrackVelocity(orbitState: OrbitState): number {
  const radius = EARTH_RADIUS + orbitState.altitude
  const angularVelocity = orbitState.velocity / radius
  return angularVelocity * EARTH_RADIUS
}

export function jdayToDate(jd: number): Date {
  const unixTime = (jd - 2440587.5) * SECONDS_PER_DAY * 1000
  return new Date(unixTime)
}

export function dateToJday(date: Date): number {
  return date.getTime() / (SECONDS_PER_DAY * 1000) + 2440587.5
}
