import type { Vector3D, GPSPosition } from '@/types'

export const EARTH_RADIUS = 6371000

export function vectorAdd(a: Vector3D, b: Vector3D): Vector3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function vectorSub(a: Vector3D, b: Vector3D): Vector3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function vectorScale(v: Vector3D, s: number): Vector3D {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

export function vectorDot(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function vectorCross(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  }
}

export function vectorMagnitude(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

export function vectorNormalize(v: Vector3D): Vector3D {
  const mag = vectorMagnitude(v)
  if (mag === 0) return { x: 0, y: 0, z: 0 }
  return vectorScale(v, 1 / mag)
}

export function vectorDistance(a: Vector3D, b: Vector3D): number {
  return vectorMagnitude(vectorSub(a, b))
}

export function vectorLerp(a: Vector3D, b: Vector3D, t: number): Vector3D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t
  }
}

export function gpsToVector(gps: GPSPosition, origin: GPSPosition): Vector3D {
  const dLat = (gps.latitude - origin.latitude) * Math.PI / 180
  const dLon = (gps.longitude - origin.longitude) * Math.PI / 180
  
  const lat1 = origin.latitude * Math.PI / 180
  const lat2 = gps.latitude * Math.PI / 180
  
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  const distance = EARTH_RADIUS * c
  const bearing = Math.atan2(
    Math.sin(dLon) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  )
  
  return {
    x: distance * Math.sin(bearing),
    y: gps.altitude - origin.altitude,
    z: distance * Math.cos(bearing)
  }
}

export function vectorToGPS(v: Vector3D, origin: GPSPosition): GPSPosition {
  const distance = Math.sqrt(v.x * v.x + v.z * v.z)
  const bearing = Math.atan2(v.x, v.z)
  
  const angularDistance = distance / EARTH_RADIUS
  const originLatRad = origin.latitude * Math.PI / 180
  const originLonRad = origin.longitude * Math.PI / 180
  
  const latRad = Math.asin(
    Math.sin(originLatRad) * Math.cos(angularDistance) +
    Math.cos(originLatRad) * Math.sin(angularDistance) * Math.cos(bearing)
  )
  
  const lonRad = originLonRad + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(originLatRad),
    Math.cos(angularDistance) - Math.sin(originLatRad) * Math.sin(latRad)
  )
  
  return {
    latitude: latRad * 180 / Math.PI,
    longitude: lonRad * 180 / Math.PI,
    altitude: origin.altitude + v.y
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function degToRad(deg: number): number {
  return deg * Math.PI / 180
}

export function radToDeg(rad: number): number {
  return rad * 180 / Math.PI
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
