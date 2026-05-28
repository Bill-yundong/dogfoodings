export interface User {
  id: string
  name: string
  email: string
  preferences: UserPreferences
  createdAt: Date
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  notifications: boolean
  language: string
}

export interface SkinScan {
  id: string
  userId: string
  deviceId: string
  timestamp: Date
  overallScore: number
  features: SkinFeatures
  imageIds: string[]
}

export interface SkinFeatures {
  moisture: number
  oiliness: number
  elasticity: number
  roughness: number
  poreSize: number
  wrinkles: number
  activeIngredients: ActiveIngredientData
}

export interface ActiveIngredientData {
  [key: string]: {
    concentration: number
    penetration: number
    distribution: number[][]
  }
}

export interface SkinImage {
  id: string
  scanId: string
  imageData: Blob
  width: number
  height: number
  type: 'microscope' | 'thermal' | 'rgb'
}

export interface CarePlan {
  id: string
  userId: string
  recommendations: CareRecommendation[]
  startDate: Date
  endDate: Date
}

export interface CareRecommendation {
  id: string
  type: 'cleanser' | 'toner' | 'serum' | 'moisturizer' | 'sunscreen'
  product: string
  ingredients: string[]
  frequency: string
  matchScore: number
}

export interface Device {
  id: string
  name: string
  type: 'scanner' | 'thermometer' | 'analyzer'
  status: 'connected' | 'disconnected' | 'syncing'
  lastSync: Date
  battery: number
}

export interface TrendReport {
  period: string
  overallChange: number
  featureTrends: {
    [key: string]: {
      values: number[]
      change: number
    }
  }
  insights: string[]
}

export type PageRoute = 'dashboard' | 'skin-3d' | 'capture' | 'analysis' | 'care' | 'devices'
