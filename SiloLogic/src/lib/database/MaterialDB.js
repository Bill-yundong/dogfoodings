export class MaterialDB {
  constructor() {
    this.dbName = 'SiloLogicDB'
    this.storeName = 'materials'
    this.version = 1
    this.db = null
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'batchId' })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('supplier', 'supplier', { unique: false })
        }
      }
    })
  }

  async addMaterial(material) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const record = {
        ...material,
        timestamp: material.timestamp || Date.now()
      }
      const request = store.add(record)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getMaterial(batchId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(batchId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllMaterials() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getMaterialsByType(type) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('type')
      const request = index.getAll(type)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async updateMaterial(batchId, updates) {
    const material = await this.getMaterial(batchId)
    if (!material) throw new Error('Material not found')
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put({ ...material, ...updates })
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteMaterial(batchId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(batchId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getTraceabilityChain(batchId) {
    const material = await this.getMaterial(batchId)
    if (!material) return []

    const chain = [material]
    if (material.parentBatchId) {
      const parentChain = await this.getTraceabilityChain(material.parentBatchId)
      chain.unshift(...parentChain)
    }

    return chain
  }

  generateQualityReport(materials) {
    const report = {
      totalBatches: materials.length,
      qualityDistribution: {},
      averageMoisture: 0,
      averagePurity: 0,
      riskAssessment: 'low'
    }

    materials.forEach(m => {
      report.qualityDistribution[m.quality] = (report.qualityDistribution[m.quality] || 0) + 1
      report.averageMoisture += m.moisture || 0
      report.averagePurity += m.purity || 0
    })

    report.averageMoisture /= materials.length
    report.averagePurity /= materials.length

    const highQuality = report.qualityDistribution['excellent'] || 0
    if (highQuality / materials.length < 0.3) {
      report.riskAssessment = 'high'
    } else if (highQuality / materials.length < 0.6) {
      report.riskAssessment = 'medium'
    }

    return report
  }
}
