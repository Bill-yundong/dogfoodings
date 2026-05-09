import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import semanticMapper, { SEMANTIC_TYPES, DATA_CATEGORIES } from '@/utils/semanticMapping'
import { generateDispatchData, generateSubstationReport } from '@/utils/mockData'

export const useMappingStore = defineStore('mapping', () => {
  const mappings = ref([])
  const lastMappingResult = ref(null)
  const mappingHistory = ref([])
  const isProcessing = ref(false)

  const sourceTypes = computed(() => Object.values(SEMANTIC_TYPES))
  const dataCategories = computed(() => Object.values(DATA_CATEGORIES))

  function loadMappings() {
    mappings.value = semanticMapper.listMappings()
  }

  function getMapping(source, target, category) {
    return semanticMapper.getMapping(source, target, category)
  }

  async function performMapping(sourceType, targetType, category, data, context = {}) {
    isProcessing.value = true
    try {
      const result = semanticMapper.map(
        sourceType,
        targetType,
        category,
        data,
        context
      )
      
      lastMappingResult.value = result
      mappingHistory.value.unshift({
        ...result,
        sourceData: data,
        mappedAt: Date.now()
      })

      if (mappingHistory.value.length > 50) {
        mappingHistory.value = mappingHistory.value.slice(0, 50)
      }

      return result
    } finally {
      isProcessing.value = false
    }
  }

  async function performReverseMapping(targetType, sourceType, category, data, context = {}) {
    isProcessing.value = true
    try {
      const result = semanticMapper.reverseMap(
        targetType,
        sourceType,
        category,
        data,
        context
      )
      
      lastMappingResult.value = result
      return result
    } finally {
      isProcessing.value = false
    }
  }

  function validateData(data, sourceType, category) {
    return semanticMapper.validate(data, sourceType, category)
  }

  function registerMapping(mapping) {
    semanticMapper.registerMapping(mapping)
    loadMappings()
  }

  async function simulateDispatchToSubstation(substationId) {
    const dispatchData = generateDispatchData()
    return performMapping(
      SEMANTIC_TYPES.DISPATCH_CENTER,
      SEMANTIC_TYPES.SUBSTATION,
      DATA_CATEGORIES.REAL_TIME,
      dispatchData,
      { substationId }
    )
  }

  async function simulateSubstationToDispatch(substationId) {
    const substationData = generateSubstationReport(substationId)
    return performMapping(
      SEMANTIC_TYPES.SUBSTATION,
      SEMANTIC_TYPES.DISPATCH_CENTER,
      DATA_CATEGORIES.REAL_TIME,
      substationData,
      { substationId }
    )
  }

  function clearHistory() {
    mappingHistory.value = []
  }

  return {
    mappings,
    lastMappingResult,
    mappingHistory,
    isProcessing,
    sourceTypes,
    dataCategories,
    SEMANTIC_TYPES,
    DATA_CATEGORIES,
    loadMappings,
    getMapping,
    performMapping,
    performReverseMapping,
    validateData,
    registerMapping,
    simulateDispatchToSubstation,
    simulateSubstationToDispatch,
    clearHistory
  }
})
