export interface Tank {
  id: string
  name: string
  chemical: string
  capacity: number
  currentVolume: number
  position: {
    x: number
    y: number
  }
  diameter: number
  height: number
  pressure: number
  temperature: number
  toxicityLevel: 'low' | 'medium' | 'high' | 'extreme'
  material: string
  lastInspection: string
  status: 'normal' | 'warning' | 'leaking' | 'critical'
}

export interface Chemical {
  id: string
  name: string
  formula: string
  molecularWeight: number
  boilingPoint: number
  vaporPressure: number
  toxicity: 'low' | 'medium' | 'high' | 'extreme'
  flammability: 'non-flammable' | 'flammable' | 'highly-flammable'
  corrosivity: 'none' | 'low' | 'medium' | 'high'
  lc50?: number
  idlh?: number
}
