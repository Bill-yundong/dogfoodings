import type { PointCloudData, BoundingBox } from '@/types'
import { calculateBounds } from '@/utils/algorithm/statisticalFilter'

const LAS_SIGNATURE = 'LASF'

interface LASHeader {
  signature: string
  fileSourceId: number
  globalEncoding: number
  projectId1: number
  projectId2: number
  projectId3: number
  projectId4: number
  versionMajor: number
  versionMinor: number
  systemId: string
  generatingSoftware: string
  fileCreationDay: number
  fileCreationYear: number
  headerSize: number
  dataOffset: number
  variableRecordsCount: number
  pointDataFormat: number
  pointDataLength: number
  pointCount: number
  pointsByReturn: number[]
  xScale: number
  yScale: number
  zScale: number
  xOffset: number
  yOffset: number
  zOffset: number
  maxX: number
  minX: number
  maxY: number
  minY: number
  maxZ: number
  minZ: number
  waveDataOffset: number
  waveDataLength: number
  extendedVariableRecordsOffset: number
  extendedVariableRecordsCount: number
  extendedPointCount: number
  extendedPointsByReturn: number[]
}

const POINT_FORMAT_SIZES: Record<number, number> = {
  0: 20,
  1: 28,
  2: 26,
  3: 34,
  4: 57,
  5: 63,
  6: 30,
  7: 36,
  8: 38,
  9: 59,
  10: 67
}

function readString(view: DataView, offset: number, length: number): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    const char = view.getUint8(offset + i)
    if (char === 0) break
    result += String.fromCharCode(char)
  }
  return result
}

function parseLASHeader(buffer: ArrayBuffer): LASHeader {
  const view = new DataView(buffer)
  const header: Partial<LASHeader> = {}

  header.signature = readString(view, 0, 4)
  if (header.signature !== LAS_SIGNATURE) {
    throw new Error('Invalid LAS file signature')
  }

  header.fileSourceId = view.getUint16(4, true)
  header.globalEncoding = view.getUint16(6, true)
  header.projectId1 = view.getUint32(8, true)
  header.projectId2 = view.getUint16(12, true)
  header.projectId3 = view.getUint16(14, true)
  header.projectId4 = view.getUint16(16, true)
  header.versionMajor = view.getUint8(24)
  header.versionMinor = view.getUint8(25)
  header.systemId = readString(view, 26, 32)
  header.generatingSoftware = readString(view, 58, 32)
  header.fileCreationDay = view.getUint16(90, true)
  header.fileCreationYear = view.getUint16(92, true)
  header.headerSize = view.getUint16(94, true)
  header.dataOffset = view.getUint32(96, true)
  header.variableRecordsCount = view.getUint32(100, true)
  header.pointDataFormat = view.getUint8(104) & 0x3F
  header.pointDataLength = view.getUint16(105, true)
  header.pointCount = view.getUint32(107, true)

  header.pointsByReturn = []
  for (let i = 0; i < 5; i++) {
    header.pointsByReturn.push(view.getUint32(111 + i * 4, true))
  }

  header.xScale = view.getFloat64(131, true)
  header.yScale = view.getFloat64(139, true)
  header.zScale = view.getFloat64(147, true)
  header.xOffset = view.getFloat64(155, true)
  header.yOffset = view.getFloat64(163, true)
  header.zOffset = view.getFloat64(171, true)
  header.maxX = view.getFloat64(179, true)
  header.minX = view.getFloat64(187, true)
  header.maxY = view.getFloat64(195, true)
  header.minY = view.getFloat64(203, true)
  header.maxZ = view.getFloat64(211, true)
  header.minZ = view.getFloat64(219, true)

  if (header.versionMajor >= 1 && header.versionMinor >= 3) {
    header.waveDataOffset = view.getFloat64(227, true)
  }

  if (header.versionMajor >= 1 && header.versionMinor >= 4) {
    header.extendedVariableRecordsOffset = Number(view.getBigUint64(235, true))
    header.extendedVariableRecordsCount = view.getUint32(243, true)
    header.extendedPointCount = Number(view.getBigUint64(247, true))
    header.extendedPointsByReturn = []
    for (let i = 0; i < 15; i++) {
      header.extendedPointsByReturn.push(Number(view.getBigUint64(255 + i * 8, true)))
    }
  }

  return header as LASHeader
}

function parsePointFormat0(
  view: DataView,
  offset: number,
  header: LASHeader
): { x: number; y: number; z: number; intensity: number; classification: number } {
  const x = view.getInt32(offset, true) * header.xScale + header.xOffset
  const y = view.getInt32(offset + 4, true) * header.yScale + header.yOffset
  const z = view.getInt32(offset + 8, true) * header.zScale + header.zOffset
  const intensity = view.getUint16(offset + 12, true) / 65535
  const classification = view.getUint8(offset + 16)

  return { x, y, z, intensity, classification }
}

function parsePointFormat2(
  view: DataView,
  offset: number,
  header: LASHeader
): { x: number; y: number; z: number; intensity: number; classification: number; r: number; g: number; b: number } {
  const p0 = parsePointFormat0(view, offset, header)
  const r = view.getUint16(offset + 20, true)
  const g = view.getUint16(offset + 22, true)
  const b = view.getUint16(offset + 24, true)

  return {
    ...p0,
    r: Math.min(255, r >> 8),
    g: Math.min(255, g >> 8),
    b: Math.min(255, b >> 8)
  }
}

function parsePointFormat3(
  view: DataView,
  offset: number,
  header: LASHeader
): { x: number; y: number; z: number; intensity: number; classification: number; r: number; g: number; b: number } {
  return parsePointFormat2(view, offset, header)
}

function parsePointFormat6(
  view: DataView,
  offset: number,
  header: LASHeader
): { x: number; y: number; z: number; intensity: number; classification: number } {
  const x = view.getInt32(offset, true) * header.xScale + header.xOffset
  const y = view.getInt32(offset + 4, true) * header.yScale + header.yOffset
  const z = view.getInt32(offset + 8, true) * header.zScale + header.zOffset
  const intensity = view.getUint16(offset + 12, true) / 65535
  const classification = view.getUint8(offset + 16) & 0x1F

  return { x, y, z, intensity, classification }
}

function parsePointFormat7(
  view: DataView,
  offset: number,
  header: LASHeader
): { x: number; y: number; z: number; intensity: number; classification: number; r: number; g: number; b: number } {
  const p6 = parsePointFormat6(view, offset, header)
  const r = view.getUint16(offset + 26, true)
  const g = view.getUint16(offset + 28, true)
  const b = view.getUint16(offset + 30, true)

  return {
    ...p6,
    r: Math.min(255, r >> 8),
    g: Math.min(255, g >> 8),
    b: Math.min(255, b >> 8)
  }
}

function parsePointFormat8(
  view: DataView,
  offset: number,
  header: LASHeader
): { x: number; y: number; z: number; intensity: number; classification: number; r: number; g: number; b: number } {
  return parsePointFormat7(view, offset, header)
}

export async function parseLASFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<PointCloudData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer
        if (!buffer) {
          reject(new Error('Failed to read file'))
          return
        }

        const header = parseLASHeader(buffer)
        const totalPoints = header.extendedPointCount || header.pointCount
        const pointStep = header.pointDataLength || POINT_FORMAT_SIZES[header.pointDataFormat] || 20

        const points = new Float32Array(totalPoints * 3)
        const colors = new Uint8Array(totalPoints * 4)
        const intensities = new Float32Array(totalPoints)

        const view = new DataView(buffer, header.dataOffset)

        const hasColors = [2, 3, 5, 7, 8, 10].includes(header.pointDataFormat)

        for (let i = 0; i < totalPoints; i++) {
          const offset = i * pointStep
          let pointData

          switch (header.pointDataFormat) {
            case 0:
            case 1:
              pointData = parsePointFormat0(view, offset, header)
              break
            case 2:
            case 5:
              pointData = parsePointFormat2(view, offset, header)
              break
            case 3:
            case 4:
              pointData = parsePointFormat3(view, offset, header)
              break
            case 6:
            case 9:
              pointData = parsePointFormat6(view, offset, header)
              break
            case 7:
            case 10:
              pointData = parsePointFormat7(view, offset, header)
              break
            case 8:
              pointData = parsePointFormat8(view, offset, header)
              break
            default:
              pointData = parsePointFormat0(view, offset, header)
          }

          points[i * 3] = pointData.x
          points[i * 3 + 1] = pointData.y
          points[i * 3 + 2] = pointData.z

          intensities[i] = pointData.intensity

          if (hasColors && 'r' in pointData) {
            colors[i * 4] = pointData.r
            colors[i * 4 + 1] = pointData.g
            colors[i * 4 + 2] = pointData.b
          } else {
            const normalizedZ = (pointData.z - header.minZ) / (header.maxZ - header.minZ)
            colors[i * 4] = Math.floor(255 * Math.max(0, 1 - normalizedZ * 2))
            colors[i * 4 + 1] = Math.floor(255 * Math.min(1, normalizedZ * 2))
            colors[i * 4 + 2] = Math.floor(255 * Math.abs(0.5 - normalizedZ) * 2)
          }
          colors[i * 4 + 3] = 255

          if (onProgress && i % Math.floor(totalPoints / 100) === 0) {
            onProgress((i / totalPoints) * 100)
          }
        }

        const bounds: BoundingBox = {
          minX: header.minX,
          minY: header.minY,
          minZ: header.minZ,
          maxX: header.maxX,
          maxY: header.maxY,
          maxZ: header.maxZ
        }

        if (onProgress) {
          onProgress(100)
        }

        resolve({
          points,
          colors,
          intensities,
          pointCount: totalPoints,
          bounds
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('File read error'))
    }

    reader.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress((e.loaded / e.total) * 20)
      }
    }

    reader.readAsArrayBuffer(file)
  })
}

export function generateMockPointCloud(
  pointCount: number = 100000,
  type: 'powerline' | 'terrain' | 'building' = 'powerline'
): PointCloudData {
  const points = new Float32Array(pointCount * 3)
  const colors = new Uint8Array(pointCount * 4)
  const intensities = new Float32Array(pointCount)

  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

  for (let i = 0; i < pointCount; i++) {
    let x, y, z

    if (type === 'powerline') {
      const towerIndex = Math.floor(Math.random() * 10)
      const alongLine = Math.random() * 500
      const heightNoise = (Math.random() - 0.5) * 5

      if (Math.random() < 0.1) {
        x = towerIndex * 50 + (Math.random() - 0.5) * 3
        y = (Math.random() - 0.5) * 3
        z = 20 + Math.random() * 15 + heightNoise
      } else if (Math.random() < 0.4) {
        x = Math.random() * 500
        y = (Math.random() - 0.5) * 8
        z = 25 + Math.sin(x * 0.05) * 3 + heightNoise
      } else {
        x = Math.random() * 500
        y = (Math.random() - 0.5) * 50
        z = 5 + Math.random() * 10 + (Math.random() - 0.5) * 2
      }
    } else if (type === 'terrain') {
      x = (Math.random() - 0.5) * 1000
      y = (Math.random() - 0.5) * 1000
      z = Math.sin(x * 0.01) * 10 + Math.cos(y * 0.01) * 10 + Math.random() * 2
    } else {
      x = (Math.random() - 0.5) * 100
      y = (Math.random() - 0.5) * 100
      z = Math.random() * 50
    }

    points[i * 3] = x
    points[i * 3 + 1] = y
    points[i * 3 + 2] = z

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    minZ = Math.min(minZ, z)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    maxZ = Math.max(maxZ, z)

    const normalizedZ = (z - minZ) / (maxZ - minZ || 1)
    if (type === 'powerline') {
      if (z > 20) {
        colors[i * 4] = 255
        colors[i * 4 + 1] = 100
        colors[i * 4 + 2] = 0
        intensities[i] = 0.9
      } else if (z > 10) {
        colors[i * 4] = 0
        colors[i * 4 + 1] = 200
        colors[i * 4 + 2] = 100
        intensities[i] = 0.6
      } else {
        colors[i * 4] = 100
        colors[i * 4 + 1] = 80
        colors[i * 4 + 2] = 60
        intensities[i] = 0.3
      }
    } else {
      colors[i * 4] = Math.floor(255 * Math.max(0, 1 - normalizedZ * 2))
      colors[i * 4 + 1] = Math.floor(255 * Math.min(1, normalizedZ * 2))
      colors[i * 4 + 2] = Math.floor(255 * 0.3)
      intensities[i] = normalizedZ
    }
    colors[i * 4 + 3] = 255
  }

  return {
    points,
    colors,
    intensities,
    pointCount,
    bounds: { minX, minY, minZ, maxX, maxY, maxZ }
  }
}

export function validateLASFile(file: File): boolean {
  const ext = file.name.toLowerCase().split('.').pop()
  return ['las', 'laz', 'pcd', 'ply', 'xyz'].includes(ext || '')
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}
