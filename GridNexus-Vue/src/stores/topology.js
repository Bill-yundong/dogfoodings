import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import topologyModel, { PowerNode, PowerConnection } from '@/utils/topologyModel'
import { generateMockTopology } from '@/utils/mockData'
import snapshotBus from '@/utils/snapshotBus'

export const useTopologyStore = defineStore('topology', () => {
  const isInitialized = ref(false)
  const nodes = ref([])
  const connections = ref([])
  const selectedNodeId = ref(null)
  const expansionPlan = ref(null)
  const powerFlows = ref([])
  const isCalculating = ref(false)

  const selectedNode = computed(() => {
    if (!selectedNodeId.value) return null
    return nodes.value.find(n => n.id === selectedNodeId.value)
  })

  const overloadedNodes = computed(() => {
    return nodes.value.filter(n => n.loadRatio > 0.9)
  })

  const totalCapacity = computed(() => {
    return nodes.value.reduce((sum, n) => sum + n.capacity, 0)
  })

  const totalLoad = computed(() => {
    return nodes.value
      .filter(n => n.type === 'dispatch_center')
      .reduce((sum, n) => sum + n.currentLoad, 0)
  })

  const loadRatio = computed(() => {
    if (totalCapacity.value <= 0) return 0
    return (totalLoad.value / totalCapacity.value) * 100
  })

  async function init() {
    if (isInitialized.value) return

    const savedTopology = await snapshotBus.getTopology()
    
    if (savedTopology && savedTopology.nodes && savedTopology.nodes.length > 0) {
      savedTopology.nodes.forEach(nodeData => {
        const node = new PowerNode(
          nodeData.id,
          nodeData.type,
          nodeData.name,
          nodeData.capacity
        )
        node.currentLoad = nodeData.currentLoad || 0
        topologyModel.addNode(node)
      })

      savedTopology.connections.forEach(connData => {
        const conn = new PowerConnection(
          connData.id,
          connData.from,
          connData.to,
          connData.capacity,
          connData.impedance
        )
        conn.currentFlow = connData.currentFlow || 0
        topologyModel.addConnection(conn)
      })
    } else {
      const mockData = generateMockTopology()
      mockData.nodes.forEach(node => topologyModel.addNode(node))
      mockData.connections.forEach(conn => topologyModel.addConnection(conn))
      
      await snapshotBus.saveTopology(topologyModel.getTopologySnapshot())
    }

    updateSnapshot()
    isInitialized.value = true
  }

  function updateSnapshot() {
    const snapshot = topologyModel.getTopologySnapshot()
    nodes.value = snapshot.nodes
    connections.value = snapshot.connections
  }

  function selectNode(nodeId) {
    selectedNodeId.value = nodeId
  }

  async function updateLoads(updates) {
    await topologyModel.updateLoadsAsync(updates)
    updateSnapshot()
    await snapshotBus.saveTopology(topologyModel.getTopologySnapshot())
  }

  async function simulateLoadChange() {
    const updates = nodes.value.map(node => ({
      nodeId: node.id,
      load: node.capacity * (0.6 + Math.random() * 0.35)
    }))
    await updateLoads(updates)
  }

  async function calculatePowerFlow(nodeId = null) {
    isCalculating.value = true
    try {
      powerFlows.value = await topologyModel.queueCalculateFlow(nodeId)
    } finally {
      isCalculating.value = false
    }
  }

  async function generateExpansionPlan(options = {}) {
    isCalculating.value = true
    try {
      expansionPlan.value = await topologyModel.queueExpansionPlan(options)
      return expansionPlan.value
    } finally {
      isCalculating.value = false
    }
  }

  function getNodeById(nodeId) {
    return nodes.value.find(n => n.id === nodeId)
  }

  function getConnectionsForNode(nodeId) {
    return connections.value.filter(
      c => c.from === nodeId || c.to === nodeId
    )
  }

  function findPath(fromId, toId) {
    return topologyModel.findShortestPath(fromId, toId)
  }

  return {
    isInitialized,
    nodes,
    connections,
    selectedNodeId,
    selectedNode,
    overloadedNodes,
    totalCapacity,
    totalLoad,
    loadRatio,
    expansionPlan,
    powerFlows,
    isCalculating,
    init,
    selectNode,
    updateLoads,
    simulateLoadChange,
    calculatePowerFlow,
    generateExpansionPlan,
    getNodeById,
    getConnectionsForNode,
    findPath
  }
})
