export interface Point {
  x: number
  y: number
}

export interface BoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

export function angleBetween(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x)
}

export function rotatePoint(point: Point, center: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = point.x - center.x
  const dy = point.y - center.y

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  }
}

export function translatePoint(point: Point, dx: number, dy: number): Point {
  return {
    x: point.x + dx,
    y: point.y + dy
  }
}

export function scalePoint(point: Point, center: Point, scale: number): Point {
  return {
    x: center.x + (point.x - center.x) * scale,
    y: center.y + (point.y - center.y) * scale
  }
}

export function worldToScreen(
  worldPoint: Point,
  screenWidth: number,
  screenHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number
): Point {
  return {
    x: screenWidth / 2 + (worldPoint.x * scale) + offsetX,
    y: screenHeight / 2 + (worldPoint.y * scale) + offsetY
  }
}

export function screenToWorld(
  screenPoint: Point,
  screenWidth: number,
  screenHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number
): Point {
  return {
    x: (screenPoint.x - screenWidth / 2 - offsetX) / scale,
    y: (screenPoint.y - screenHeight / 2 - offsetY) / scale
  }
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false

  let inside = false
  const n = polygon.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y

    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }

  return inside
}

export function getBoundingBox(polygon: Point[]): BoundingBox {
  if (polygon.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  }

  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity

  for (const point of polygon) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }

  return { minX, maxX, minY, maxY }
}

export function calculatePolygonCenter(polygon: Point[]): Point {
  if (polygon.length === 0) return { x: 0, y: 0 }

  let sumX = 0, sumY = 0
  for (const point of polygon) {
    sumX += point.x
    sumY += point.y
  }

  return {
    x: sumX / polygon.length,
    y: sumY / polygon.length
  }
}

export function lerp(p1: Point, p2: Point, t: number): Point {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 360
  while (angle >= 360) angle -= 360
  return angle
}

export function getWindDirectionLabel(degrees: number): string {
  const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  const index = Math.round(normalizeAngle(degrees) / 45) % 8
  return directions[index]
}
