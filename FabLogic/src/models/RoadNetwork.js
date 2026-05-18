import { NodeType, PathType } from '../types/amhs.js'

export class RoadNetwork {
  constructor(data = {}) {
    this.id = data.id || 'fab-main'
    this.name = data.name || 'Main Fab Network'
    this.version = data.version || 1
    this.nodes = new Map()
    this.edges = new Map()
    this.adjacencyList = new Map()
    this.tileSize = data.tileSize || 100
    this.tiles = new Map()

    if (data.nodes) {
      data.nodes.forEach(node => this.addNode(node))
    }
    if (data.edges) {
      data.edges.forEach(edge => this.addEdge(edge))
    }
  }

  addNode(node) {
    const n = {
      id: node.id,
      type: node.type || NodeType.INTERSECTION,
      x: node.x || 0,
      y: node.y || 0,
      z: node.z || 0,
      name: node.name || node.id,
      capacity: node.capacity || 1,
      equipmentId: node.equipmentId || null,
      ...node
    }
    this.nodes.set(n.id, n)
    this.adjacencyList.set(n.id, [])
    this._addToTile(n)
    return n
  }

  addEdge(edge) {
    const e = {
      id: edge.id || `${edge.from}-${edge.to}`,
      from: edge.from,
      to: edge.to,
      type: edge.type || PathType.NORMAL,
      length: edge.length || this._calculateDistance(edge.from, edge.to),
      speedLimit: edge.speedLimit || 5.0,
      bidirectional: edge.bidirectional !== false,
      capacity: edge.capacity || 1,
      status: edge.status || 'active'
    }

    if (!this.nodes.has(e.from) || !this.nodes.has(e.to)) {
      throw new Error(`Edge ${e.id} references non-existent nodes`)
    }

    this.edges.set(e.id, e)
    this.adjacencyList.get(e.from).push({ node: e.to, edge: e.id, length: e.length })
    if (e.bidirectional) {
      this.adjacencyList.get(e.to).push({ node: e.from, edge: e.id, length: e.length })
    }
    return e
  }

  getNode(id) {
    return this.nodes.get(id)
  }

  getEdge(id) {
    return this.edges.get(id)
  }

  getNeighbors(nodeId) {
    return this.adjacencyList.get(nodeId) || []
  }

  getNodesByType(type) {
    return Array.from(this.nodes.values()).filter(n => n.type === type)
  }

  getTile(tileX, tileY) {
    const key = `${tileX},${tileY}`
    return this.tiles.get(key) || { nodes: [], edges: [] }
  }

  getTilesInBounds(minX, minY, maxX, maxY) {
    const tiles = []
    const startTileX = Math.floor(minX / this.tileSize)
    const startTileY = Math.floor(minY / this.tileSize)
    const endTileX = Math.floor(maxX / this.tileSize)
    const endTileY = Math.floor(maxY / this.tileSize)

    for (let x = startTileX; x <= endTileX; x++) {
      for (let y = startTileY; y <= endTileY; y++) {
        const tile = this.getTile(x, y)
        if (tile.nodes.length > 0) {
          tiles.push({ x, y, ...tile })
        }
      }
    }
    return tiles
  }

  _calculateDistance(fromId, toId) {
    const from = this.nodes.get(fromId)
    const to = this.nodes.get(toId)
    if (!from || !to) return 0
    return Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
  }

  _addToTile(node) {
    const tileX = Math.floor(node.x / this.tileSize)
    const tileY = Math.floor(node.y / this.tileSize)
    const key = `${tileX},${tileY}`
    if (!this.tiles.has(key)) {
      this.tiles.set(key, { nodes: [], edges: [] })
    }
    this.tiles.get(key).nodes.push(node.id)
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      tileSize: this.tileSize,
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values())
    }
  }
}
