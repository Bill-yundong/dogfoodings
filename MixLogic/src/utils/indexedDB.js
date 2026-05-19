const DB_NAME = 'MixLogicDB'
const DB_VERSION = 1
const STORE_SNAPSHOTS = 'snapshots'
const STORE_FLUIDS = 'fluids'
const STORE_SIMULATIONS = 'simulations'

class IndexedDBManager {
  constructor() {
    this.db = null
    this.initPromise = null
  }

  init() {
    if (this.initPromise) return this.initPromise
    
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = (e) => reject(e.target.error)
      request.onsuccess = (e) => {
        this.db = e.target.result
        resolve(this.db)
      }

      request.onupgradeneeded = (e) => {
        const db = e.target.result

        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          const snapshotStore = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id', autoIncrement: true })
          snapshotStore.createIndex('fluidId', 'fluidId', { unique: false })
          snapshotStore.createIndex('timestamp', 'timestamp', { unique: false })
          snapshotStore.createIndex('mixingQuality', 'mixingQuality', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORE_FLUIDS)) {
          const fluidStore = db.createObjectStore(STORE_FLUIDS, { keyPath: 'id', autoIncrement: true })
          fluidStore.createIndex('name', 'name', { unique: true })
          fluidStore.createIndex('viscosity', 'viscosity', { unique: false })
          fluidStore.createIndex('density', 'density', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORE_SIMULATIONS)) {
          const simStore = db.createObjectStore(STORE_SIMULATIONS, { keyPath: 'id', autoIncrement: true })
          simStore.createIndex('fluidId', 'fluidId', { unique: false })
          simStore.createIndex('startTime', 'startTime', { unique: false })
          simStore.createIndex('status', 'status', { unique: false })
        }
      }
    })

    return this.initPromise
  }

  async addSnapshot(snapshot) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_SNAPSHOTS, 'readwrite')
      const store = transaction.objectStore(STORE_SNAPSHOTS)
      const request = store.add({
        ...snapshot,
        timestamp: snapshot.timestamp || Date.now()
      })
      request.onsuccess = () => resolve(request.result)
      request.onerror = (e) => reject(e.target.error)
    })
  }

  async getSnapshots(fluidId = null, limit = 100) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_SNAPSHOTS, 'readonly')
      const store = transaction.objectStore(STORE_SNAPSHOTS)
      const request = store.getAll()

      request.onsuccess = () => {
        let results = request.result || []
        
        if (fluidId !== null) {
          results = results.filter(s => s.fluidId === fluidId)
        }
        
        results = results.sort((a, b) => b.timestamp - a.timestamp)
        
        if (limit && limit < Infinity) {
          results = results.slice(0, limit)
        }
        
        resolve(results)
      }
      request.onerror = (e) => reject(e.target.error)
    })
  }

  async getSnapshot(id) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_SNAPSHOTS, 'readonly')
      const store = transaction.objectStore(STORE_SNAPSHOTS)
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = (e) => reject(e.target.error)
    })
  }

  async deleteSnapshot(id) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_SNAPSHOTS, 'readwrite')
      const store = transaction.objectStore(STORE_SNAPSHOTS)
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = (e) => reject(e.target.error)
    })
  }

  async clearSnapshots() {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_SNAPSHOTS, 'readwrite')
      const store = transaction.objectStore(STORE_SNAPSHOTS)
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = (e) => reject(e.target.error)
    })
  }

  async addFluid(fluid) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_FLUIDS, 'readwrite')
      const store = transaction.objectStore(STORE_FLUIDS)
      const request = store.add(fluid)
      request.onsuccess = () => resolve(request.result)
      request.onerror = (e) => reject(e.target.error)
    })
  }

  async getFluids() {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_FLUIDS, 'readonly')
      const store = transaction.objectStore(STORE_FLUIDS)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = (e) => reject(e.target.error)
    })
  }

  async updateFluid(id, updates) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_FLUIDS, 'readwrite')
      const store = transaction.objectStore(STORE_FLUIDS)
      const getRequest = store.get(id)
      
      getRequest.onsuccess = () => {
        const fluid = getRequest.result
        if (!fluid) {
          reject(new Error('Fluid not found'))
          return
        }
        const updatedFluid = { ...fluid, ...updates }
        const putRequest = store.put(updatedFluid)
        putRequest.onsuccess = () => resolve(updatedFluid)
        putRequest.onerror = (e) => reject(e.target.error)
      }
      
      getRequest.onerror = (e) => reject(e.target.error)
    })
  }

  async deleteFluid(id) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_FLUIDS, 'readwrite')
      const store = transaction.objectStore(STORE_FLUIDS)
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = (e) => reject(e.target.error)
    })
  }

  async addSimulation(simulation) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_SIMULATIONS, 'readwrite')
      const store = transaction.objectStore(STORE_SIMULATIONS)
      const request = store.add({
        ...simulation,
        startTime: simulation.startTime || Date.now(),
        status: simulation.status || 'running'
      })
      request.onsuccess = () => resolve(request.result)
      request.onerror = (e) => reject(e.target.error)
    })
  }

  async updateSimulation(id, updates) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_SIMULATIONS, 'readwrite')
      const store = transaction.objectStore(STORE_SIMULATIONS)
      const getRequest = store.get(id)
      
      getRequest.onsuccess = () => {
        const simulation = getRequest.result
        if (!simulation) {
          reject(new Error('Simulation not found'))
          return
        }
        const updatedSim = { ...simulation, ...updates }
        const putRequest = store.put(updatedSim)
        putRequest.onsuccess = () => resolve(updatedSim)
        putRequest.onerror = (e) => reject(e.target.error)
      }
      
      getRequest.onerror = (e) => reject(e.target.error)
    })
  }

  async getSimulations() {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_SIMULATIONS, 'readonly')
      const store = transaction.objectStore(STORE_SIMULATIONS)
      const request = store.getAll()
      request.onsuccess = () => {
        const results = request.result.sort((a, b) => b.startTime - a.startTime)
        resolve(results)
      }
      request.onerror = (e) => reject(e.target.error)
    })
  }

  async getStats() {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_SNAPSHOTS, STORE_FLUIDS, STORE_SIMULATIONS], 'readonly')
      const snapshotStore = transaction.objectStore(STORE_SNAPSHOTS)
      const fluidStore = transaction.objectStore(STORE_FLUIDS)
      const simulationStore = transaction.objectStore(STORE_SIMULATIONS)

      const snapshotCount = snapshotStore.count()
      const fluidCount = fluidStore.count()
      const simulationCount = simulationStore.count()

      let completed = 0
      const results = { snapshots: 0, fluids: 0, simulations: 0 }

      const checkDone = () => {
        completed++
        if (completed === 3) resolve(results)
      }

      snapshotCount.onsuccess = () => { results.snapshots = snapshotCount.result; checkDone() }
      fluidCount.onsuccess = () => { results.fluids = fluidCount.result; checkDone() }
      simulationCount.onsuccess = () => { results.simulations = simulationCount.result; checkDone() }

      transaction.onerror = (e) => reject(e.target.error)
    })
  }

  async exportData() {
    await this.init()
    const [snapshots, fluids, simulations] = await Promise.all([
      this.getSnapshots(null, Infinity),
      this.getFluids(),
      this.getSimulations()
    ])
    
    return {
      version: DB_VERSION,
      exportedAt: Date.now(),
      data: { snapshots, fluids, simulations }
    }
  }

  async importData(exportData) {
    await this.init()
    const { data } = exportData
    
    await Promise.all([
      this.clearSnapshots(),
      ...data.fluids.map(f => this.addFluid(f)),
      ...data.simulations.map(s => this.addSimulation(s)),
      ...data.snapshots.map(s => {
        delete s.id
        return this.addSnapshot(s)
      })
    ])
    
    return true
  }
}

export const db = new IndexedDBManager()
export default db
