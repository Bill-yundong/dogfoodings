import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Shoes, WearData } from '@/types'
import { generateMockShoes, generateWearData } from '@/utils/mockDataGenerator'
import { shoesRepository, wearDataRepository } from '@/database/repository'
import { syncService } from '@/services/syncService'

export const useShoesStore = defineStore('shoes', () => {
  const shoesList = ref<Shoes[]>([])
  const selectedShoes = ref<Shoes | null>(null)
  const wearDataMap = ref<Map<string, WearData>>(new Map())
  const isLoading = ref(false)

  const totalShoesCount = computed(() => shoesList.value.length)

  const shoesNeedReplacement = computed(() => {
    return shoesList.value.filter(shoes => {
      const wearData = wearDataMap.value.get(shoes.id)
      return wearData && wearData.remainingLife < 20
    })
  })

  async function loadShoes(userId: string = 'demo-user') {
    isLoading.value = true
    try {
      const shoes = await shoesRepository.getByUserId(userId)
      
      if (shoes.length === 0) {
        const mockShoesList = [
          generateMockShoes(userId),
          generateMockShoes(userId),
          generateMockShoes(userId)
        ]
        
        for (const mockShoes of mockShoesList) {
          await shoesRepository.create(mockShoes)
          const wearData = generateWearData(mockShoes.id, mockShoes.totalKilometers)
          await wearDataRepository.create(wearData)
          wearDataMap.value.set(mockShoes.id, wearData)
        }
        
        shoesList.value = mockShoesList
      } else {
        shoesList.value = shoes
        for (const s of shoes) {
          const wearData = await wearDataRepository.getLatest(s.id)
          if (wearData) {
            wearDataMap.value.set(s.id, wearData)
          }
        }
      }
    } catch (e) {
      console.error('Failed to load shoes:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function addShoes(shoesData: Omit<Shoes, 'id' | 'userId'>, userId: string = 'demo-user') {
    try {
      const newShoes = await shoesRepository.create({
        ...shoesData,
        userId
      })
      const wearData = generateWearData(newShoes.id, newShoes.totalKilometers)
      await wearDataRepository.create(wearData)
      
      shoesList.value.push(newShoes)
      wearDataMap.value.set(newShoes.id, wearData)
      
      return newShoes
    } catch (e) {
      console.error('Failed to add shoes:', e)
      throw e
    }
  }

  async function updateShoes(id: string, updates: Partial<Shoes>) {
    try {
      await shoesRepository.update(id, updates)
      const index = shoesList.value.findIndex(s => s.id === id)
      if (index !== -1) {
        shoesList.value[index] = { ...shoesList.value[index], ...updates }
      }
    } catch (e) {
      console.error('Failed to update shoes:', e)
      throw e
    }
  }

  function selectShoes(shoes: Shoes | null) {
    selectedShoes.value = shoes
  }

  function getWearData(shoesId: string): WearData | undefined {
    return wearDataMap.value.get(shoesId)
  }

  async function updateWearData(shoesId: string, additionalKm: number) {
    const shoes = shoesList.value.find(s => s.id === shoesId)
    if (!shoes) return

    const newTotalKm = shoes.totalKilometers + additionalKm
    await updateShoes(shoesId, { totalKilometers: newTotalKm })

    const wearData = generateWearData(shoesId, newTotalKm)
    await wearDataRepository.create(wearData)
    wearDataMap.value.set(shoesId, wearData)
  }

  async function syncWearData() {
    await syncService.performSync()
  }

  function getSyncStatus() {
    return syncService.syncState
  }

  return {
    shoesList,
    selectedShoes,
    wearDataMap,
    isLoading,
    totalShoesCount,
    shoesNeedReplacement,
    loadShoes,
    addShoes,
    updateShoes,
    selectShoes,
    getWearData,
    updateWearData,
    syncWearData,
    getSyncStatus
  }
})
