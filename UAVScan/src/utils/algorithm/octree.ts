import type { BoundingBox, OctreeNode, LODLevel, PointCloudData } from '@/types'
import { calculateBounds } from './statisticalFilter'

const MAX_POINTS_PER_NODE = 200
const MAX_DEPTH = 8

export function createOctreeNode(
  bounds: BoundingBox,
  level: number
): OctreeNode {
  return {
    bounds,
    children: null,
    points: [],
    level
  }
}

export function pointInBounds(
  x: number, y: number, z: number,
  bounds: BoundingBox
): boolean {
  return x >= bounds.minX && x <= bounds.maxX &&
         y >= bounds.minY && y <= bounds.maxY &&
         z >= bounds.minZ && z <= bounds.maxZ
}

export function getChildBounds(
  parentBounds: BoundingBox,
  childIndex: number
): BoundingBox {
  const midX = (parentBounds.minX + parentBounds.maxX) / 2
  const midY = (parentBounds.minY + parentBounds.maxY) / 2
  const midZ = (parentBounds.minZ + parentBounds.maxZ) / 2

  const xMin = (childIndex & 1) ? midX : parentBounds.minX
  const xMax = (childIndex & 1) ? parentBounds.maxX : midX
  const yMin = (childIndex & 2) ? midY : parentBounds.minY
  const yMax = (childIndex & 2) ? parentBounds.maxY : midY
  const zMin = (childIndex & 4) ? midZ : parentBounds.minZ
  const zMax = (childIndex & 4) ? parentBounds.maxZ : midZ

  return { minX: xMin, maxX: xMax, minY: yMin, maxY: yMax, minZ: zMin, maxZ: zMax }
}

export function insertPoint(
  node: OctreeNode,
  pointIndex: number,
  x: number, y: number, z: number,
  points: Float32Array
): boolean {
  if (!pointInBounds(x, y, z, node.bounds)) {
    return false
  }

  if (node.children === null) {
    node.points.push(pointIndex)

    if (node.points.length > MAX_POINTS_PER_NODE && node.level < MAX_DEPTH) {
      splitNode(node, points)
    }

    return true
  }

  for (let i = 0; i < 8; i++) {
    if (insertPoint(node.children![i], pointIndex, x, y, z, points)) {
      return true
    }
  }

  return false
}

export function splitNode(node: OctreeNode, points: Float32Array): void {
  node.children = []

  for (let i = 0; i < 8; i++) {
    const childBounds = getChildBounds(node.bounds, i)
    node.children.push(createOctreeNode(childBounds, node.level + 1))
  }

  for (const pointIndex of node.points) {
    const x = points[pointIndex * 3]
    const y = points[pointIndex * 3 + 1]
    const z = points[pointIndex * 3 + 2]

    for (let i = 0; i < 8; i++) {
      if (insertPoint(node.children[i], pointIndex, x, y, z, points)) {
        break
      }
    }
  }

  node.points = []
}

export function buildOctree(
  points: Float32Array,
  bounds?: BoundingBox,
  onProgress?: (progress: number) => void
): OctreeNode {
  const treeBounds = bounds || calculateBounds(points)
  const root = createOctreeNode(treeBounds, 0)
  const pointCount = Math.floor(points.length / 3)

  for (let i = 0; i < pointCount; i++) {
    const x = points[i * 3]
    const y = points[i * 3 + 1]
    const z = points[i * 3 + 2]

    insertPoint(root, i, x, y, z, points)

    if (onProgress && i % Math.floor(pointCount / 100) === 0) {
      onProgress((i / pointCount) * 100)
    }
  }

  if (onProgress) {
    onProgress(100)
  }

  return root
}

export function collectPointsAtLevel(
  node: OctreeNode,
  targetLevel: number,
  points: Float32Array,
  resultIndices: number[],
  samplingRate: number = 1.0
): void {
  if (node.level === targetLevel || node.children === null) {
    const step = Math.max(1, Math.floor(1 / samplingRate))
    for (let i = 0; i < node.points.length; i += step) {
      resultIndices.push(node.points[i])
    }
    return
  }

  for (const child of node.children) {
    collectPointsAtLevel(child, targetLevel, points, resultIndices, samplingRate)
  }
}

export function generateLODLevels(
  data: PointCloudData,
  octree: OctreeNode,
  levels: number = 4,
  onProgress?: (progress: number) => void
): LODLevel[] {
  const lodLevels: LODLevel[] = []
  const totalDepth = getTreeDepth(octree)

  for (let i = 0; i < levels; i++) {
    const level = Math.min(i, totalDepth)
    const samplingRate = Math.pow(0.5, levels - 1 - i)

    const indices: number[] = []
    collectPointsAtLevel(octree, level, data.points, indices, samplingRate)

    const pointCount = indices.length
    const outPoints = new Float32Array(pointCount * 3)
    const outColors = data.colors ? new Uint8Array(pointCount * 4) : new Uint8Array(pointCount * 4)

    for (let j = 0; j < pointCount; j++) {
      const idx = indices[j]
      outPoints[j * 3] = data.points[idx * 3]
      outPoints[j * 3 + 1] = data.points[idx * 3 + 1]
      outPoints[j * 3 + 2] = data.points[idx * 3 + 2]

      if (data.colors) {
        outColors[j * 4] = data.colors[idx * 4]
        outColors[j * 4 + 1] = data.colors[idx * 4 + 1]
        outColors[j * 4 + 2] = data.colors[idx * 4 + 2]
        outColors[j * 4 + 3] = data.colors[idx * 4 + 3]
      } else {
        const height = data.points[idx * 3 + 2]
        const bounds = data.bounds
        const normalizedZ = bounds
          ? (height - bounds.minZ) / (bounds.maxZ - bounds.minZ)
          : 0.5

        outColors[j * 4] = Math.floor(255 * Math.max(0, 1 - normalizedZ * 2))
        outColors[j * 4 + 1] = Math.floor(255 * Math.min(1, normalizedZ * 2))
        outColors[j * 4 + 2] = Math.floor(255 * Math.abs(0.5 - normalizedZ) * 2)
        outColors[j * 3] = 255
      }
    }

    lodLevels.push({
      level: i,
      pointCount,
      points: outPoints,
      colors: outColors,
      distanceRange: [i * 50, (i + 1) * 50]
    })

    if (onProgress) {
      onProgress(((i + 1) / levels) * 100)
    }
  }

  return lodLevels
}

export function getTreeDepth(node: OctreeNode): number {
  if (node.children === null) {
    return node.level
  }

  let maxDepth = node.level
  for (const child of node.children) {
    maxDepth = Math.max(maxDepth, getTreeDepth(child))
  }

  return maxDepth
}

export function estimateNormals(
  data: PointCloudData,
  k: number = 6,
  onProgress?: (progress: number) => void
): Float32Array {
  const { points, pointCount } = data
  const normals = new Float32Array(pointCount * 3)
  const bounds = calculateBounds(points)

  const gridSize = Math.max(
    (bounds.maxX - bounds.minX) / 100,
    (bounds.maxY - bounds.minY) / 100,
    (bounds.maxZ - bounds.minZ) / 100
  )

  const spatialIndex = new Map<string, number[]>()
  for (let i = 0; i < pointCount; i++) {
    const gx = Math.floor(points[i * 3] / gridSize)
    const gy = Math.floor(points[i * 3 + 1] / gridSize)
    const gz = Math.floor(points[i * 3 + 2] / gridSize)
    const key = `${gx},${gy},${gz}`

    if (!spatialIndex.has(key)) {
      spatialIndex.set(key, [])
    }
    spatialIndex.get(key)!.push(i)
  }

  for (let i = 0; i < pointCount; i++) {
    const px = points[i * 3]
    const py = points[i * 3 + 1]
    const pz = points[i * 3 + 2]

    const neighbors: number[] = []
    const gx = Math.floor(px / gridSize)
    const gy = Math.floor(py / gridSize)
    const gz = Math.floor(pz / gridSize)

    for (let dx = -1; dx <= 1 && neighbors.length < k; dx++) {
      for (let dy = -1; dy <= 1 && neighbors.length < k; dy++) {
        for (let dz = -1; dz <= 1 && neighbors.length < k; dz++) {
          const key = `${gx + dx},${gy + dy},${gz + dz}`
          const cell = spatialIndex.get(key)
          if (cell) {
            for (const idx of cell) {
              if (idx !== i && neighbors.length < k) {
                neighbors.push(idx)
              }
            }
          }
        }
      }
    }

    if (neighbors.length >= 3) {
      let sumX = 0, sumY = 0, sumZ = 0
      for (const n of neighbors) {
        sumX += points[n * 3]
        sumY += points[n * 3 + 1]
        sumZ += points[n * 3 + 2]
      }
      const cx = sumX / neighbors.length
      const cy = sumY / neighbors.length
      const cz = sumZ / neighbors.length

      let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0
      for (const n of neighbors) {
        const dx = points[n * 3] - cx
        const dy = points[n * 3 + 1] - cy
        const dz = points[n * 3 + 2] - cz
        xx += dx * dx
        xy += dx * dy
        xz += dx * dz
        yy += dy * dy
        yz += dy * dz
        zz += dz * dz
      }

      const det = xx * (yy * zz - yz * yz) - xy * (xy * zz - xz * yz) + xz * (xy * yz - xz * yy)
      if (Math.abs(det) > 1e-10) {
        const trace = xx + yy + zz
        const eigenValue = trace / 3

        let nx = xy * yz - xz * yy
        let ny = xz * xy - xx * yz
        let nz = xx * yy - xy * xy

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
        if (len > 0) {
          nx /= len
          ny /= len
          nz /= len
        } else {
          nx = 0
          ny = 0
          nz = 1
        }

        normals[i * 3] = nx
        normals[i * 3 + 1] = ny
        normals[i * 3 + 2] = nz
      } else {
        normals[i * 3] = 0
        normals[i * 3 + 1] = 0
        normals[i * 3 + 2] = 1
      }
    } else {
      normals[i * 3] = 0
      normals[i * 3 + 1] = 0
      normals[i * 3 + 2] = 1
    }

    if (onProgress && i % Math.floor(pointCount / 100) === 0) {
      onProgress((i / pointCount) * 100)
    }
  }

  return normals
}
