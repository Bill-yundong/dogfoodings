export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface BoundingBox {
  min: Vector3
  max: Vector3
  minX?: number
  minY?: number
  minZ?: number
  maxX?: number
  maxY?: number
  maxZ?: number
}

export interface GeoLocation {
  latitude: number
  longitude: number
  altitude: number
  lat?: number
  lng?: number
}

export interface PointCloudMetadata {
  filename: string
  originalSize: number
  compressedSize: number
  originalPointCount: number
  downsampledPointCount: number
  voxelSize: number
  compressionRatio: number
  acquisitionTime: number
  droneId: string
  droneModel?: string
  sensorModel?: string
  flightId?: string
  location: GeoLocation
  weather?: string
  temperature?: number
  humidity?: number
  [key: string]: any
}

export interface PointCloud {
  id: string
  taskId?: string
  name: string
  description?: string
  format: string
  fileSize: number
  compressedSize: number
  originalPoints: number
  processedPoints?: number
  downsampledPoints?: number
  compressionRatio: number
  metadata: PointCloudMetadata
  points?: Float32Array
  positions?: Float32Array
  colors?: Uint8Array
  intensities?: Float32Array
  data?: any
  pointCount?: number
  bounds?: BoundingBox
  boundingBox?: BoundingBox
  lodLevels?: LODLevel[]
  createdAt: number
  updatedAt: number
  originalSize?: number
  processedSize?: number
  status?: 'uploading' | 'processing' | 'completed' | 'failed' | 'pending' | 'processed'
  [key: string]: any
}

export interface PointCloudData {
  points: Float32Array
  positions?: Float32Array
  colors?: Uint8Array
  intensities?: Float32Array
  pointCount: number
  bounds: BoundingBox
  [key: string]: any
}

export interface DownsamplingConfig {
  voxelSize: number
  distanceThreshold?: number
  intensityFilter: { min: number; max: number }
  removeOutliers: boolean
  outlierThreshold?: number
  compressionLevel?: number
  adaptive?: boolean
  kNeighbors?: number
  maxDepth?: number
  draco?: boolean
  [key: string]: any
}

export interface VoxelGrid {
  [key: string]: {
    points: number[][]
    center: number[]
    count: number
  }
}

export interface OctreeNode {
  bounds: BoundingBox
  children: OctreeNode[] | null
  points: number[]
  level: number
}

export interface LODLevel {
  level: number
  pointCount: number
  points: Float32Array
  colors: Uint8Array
  distanceRange: [number, number]
}

export interface ColorMapMode {
  mode: 'elevation' | 'intensity' | 'classification' | 'solid'
  colorScale: string[]
  solidColor?: string
}

export interface RenderSettings {
  pointSize: number
  opacity: number
  colorMap: ColorMapMode
  showAxes: boolean
  showGrid: boolean
  backgroundColor: string
}
