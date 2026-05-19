import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Tank, Chemical } from '@/types/tank'
import { nanoid } from 'nanoid'

export const useTankStore = defineStore('tank', () => {
  const tanks = ref<Tank[]>([
    {
      id: 'tank-001',
      name: 'T-101',
      chemical: '氯气',
      capacity: 5000,
      currentVolume: 4200,
      position: { x: -100, y: -50 },
      diameter: 15,
      height: 30,
      pressure: 0.8,
      temperature: 25,
      toxicityLevel: 'extreme',
      material: '不锈钢',
      lastInspection: '2024-01-15',
      status: 'normal'
    },
    {
      id: 'tank-002',
      name: 'T-102',
      chemical: '液氨',
      capacity: 3000,
      currentVolume: 2800,
      position: { x: 100, y: -50 },
      diameter: 12,
      height: 25,
      pressure: 1.2,
      temperature: 22,
      toxicityLevel: 'high',
      material: '碳钢',
      lastInspection: '2024-02-20',
      status: 'normal'
    },
    {
      id: 'tank-003',
      name: 'T-103',
      chemical: '甲醇',
      capacity: 8000,
      currentVolume: 6500,
      position: { x: 0, y: 100 },
      diameter: 20,
      height: 35,
      pressure: 0.5,
      temperature: 28,
      toxicityLevel: 'medium',
      material: '碳钢',
      lastInspection: '2024-01-10',
      status: 'normal'
    },
    {
      id: 'tank-004',
      name: 'T-104',
      chemical: '苯',
      capacity: 4000,
      currentVolume: 3800,
      position: { x: -150, y: 150 },
      diameter: 14,
      height: 28,
      pressure: 0.6,
      temperature: 24,
      toxicityLevel: 'high',
      material: '不锈钢',
      lastInspection: '2024-03-01',
      status: 'normal'
    }
  ])

  const chemicals = ref<Chemical[]>([
    {
      id: 'chem-001',
      name: '氯气',
      formula: 'Cl₂',
      molecularWeight: 70.9,
      boilingPoint: -34.04,
      vaporPressure: 760,
      toxicity: 'extreme',
      flammability: 'non-flammable',
      corrosivity: 'high',
      lc50: 293,
      idlh: 10
    },
    {
      id: 'chem-002',
      name: '液氨',
      formula: 'NH₃',
      molecularWeight: 17.03,
      boilingPoint: -33.34,
      vaporPressure: 8875,
      toxicity: 'high',
      flammability: 'flammable',
      corrosivity: 'medium',
      lc50: 2000,
      idlh: 300
    },
    {
      id: 'chem-003',
      name: '甲醇',
      formula: 'CH₃OH',
      molecularWeight: 32.04,
      boilingPoint: 64.7,
      vaporPressure: 127,
      toxicity: 'medium',
      flammability: 'highly-flammable',
      corrosivity: 'low',
      lc50: 64000,
      idlh: 6000
    },
    {
      id: 'chem-004',
      name: '苯',
      formula: 'C₆H₆',
      molecularWeight: 78.11,
      boilingPoint: 80.1,
      vaporPressure: 12.7,
      toxicity: 'high',
      flammability: 'highly-flammable',
      corrosivity: 'none',
      lc50: 44700,
      idlh: 1000
    }
  ])

  const selectedTankId = ref<string | null>(null)

  const selectedTank = computed(() => {
    return tanks.value.find(t => t.id === selectedTankId.value) || null
  })

  const leakingTanks = computed(() => {
    return tanks.value.filter(t => t.status === 'leaking' || t.status === 'critical')
  })

  function addTank(tankData: Omit<Tank, 'id'>) {
    const newTank: Tank = {
      ...tankData,
      id: `tank-${nanoid(6)}`
    }
    tanks.value.push(newTank)
    return newTank
  }

  function updateTank(id: string, updates: Partial<Tank>) {
    const index = tanks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tanks.value[index] = { ...tanks.value[index], ...updates }
    }
  }

  function removeTank(id: string) {
    tanks.value = tanks.value.filter(t => t.id !== id)
  }

  function setTankStatus(id: string, status: Tank['status']) {
    updateTank(id, { status })
  }

  function triggerLeak(id: string) {
    setTankStatus(id, 'leaking')
  }

  function stopLeak(id: string) {
    setTankStatus(id, 'normal')
  }

  function selectTank(id: string | null) {
    selectedTankId.value = id
  }

  return {
    tanks,
    chemicals,
    selectedTankId,
    selectedTank,
    leakingTanks,
    addTank,
    updateTank,
    removeTank,
    setTankStatus,
    triggerLeak,
    stopLeak,
    selectTank
  }
})
