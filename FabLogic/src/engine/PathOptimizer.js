export class PathOptimizer {
  constructor(roadNetwork) {
    this.roadNetwork = roadNetwork
    this.reservations = new Map()
    this.timeWindow = 30000
  }

  async findPath(startNodeId, endNodeId, options = {}) {
    const {
      avoidNodes = [],
      avoidEdges = [],
      preferredSpeed = null,
      startTime = Date.now(),
      ohtId = null
    } = options

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const path = this._aStar(startNodeId, endNodeId, avoidNodes, avoidEdges, startTime, ohtId)
          if (path) {
            resolve({
              path: path.nodes,
              edges: path.edges,
              distance: path.distance,
              estimatedTime: path.estimatedTime,
              conflicts: path.conflicts
            })
          } else {
            reject(new Error(`No path found from ${startNodeId} to ${endNodeId}`))
          }
        } catch (err) {
          reject(err)
        }
      }, 0)
    })
  }

  async findPathsBatch(requests) {
    return Promise.all(
      requests.map(req => this.findPath(req.start, req.end, req.options))
    )
  }

  _aStar(startId, endId, avoidNodes, avoidEdges, startTime, ohtId) {
    const startNode = this.roadNetwork.getNode(startId)
    const endNode = this.roadNetwork.getNode(endId)

    if (!startNode || !endNode) return null

    const openSet = new Map()
    const closedSet = new Set()
    const cameFrom = new Map()
    const gScore = new Map()
    const fScore = new Map()

    gScore.set(startId, 0)
    fScore.set(startId, this._heuristic(startNode, endNode))
    openSet.set(startId, { node: startNode, f: fScore.get(startId) })

    const reservationKey = ohtId || 'default'

    while (openSet.size > 0) {
      let currentId = null
      let lowestF = Infinity

      for (const [id, data] of openSet) {
        if (data.f < lowestF) {
          lowestF = data.f
          currentId = id
        }
      }

      if (currentId === endId) {
        return this._reconstructPath(cameFrom, currentId, startTime)
      }

      openSet.delete(currentId)
      closedSet.add(currentId)

      const neighbors = this.roadNetwork.getNeighbors(currentId)

      for (const neighbor of neighbors) {
        if (closedSet.has(neighbor.node)) continue
        if (avoidNodes.includes(neighbor.node)) continue
        if (avoidEdges.includes(neighbor.edge)) continue

        const edge = this.roadNetwork.getEdge(neighbor.edge)
        if (!edge || edge.status !== 'active') continue

        const tentativeG = gScore.get(currentId) + neighbor.length
        const conflict = this._checkConflict(neighbor.edge, startTime + tentativeG * 200, reservationKey)

        if (conflict) {
          continue
        }

        if (!gScore.has(neighbor.node) || tentativeG < gScore.get(neighbor.node)) {
          cameFrom.set(neighbor.node, { from: currentId, edge: neighbor.edge })
          gScore.set(neighbor.node, tentativeG)
          const h = this._heuristic(this.roadNetwork.getNode(neighbor.node), endNode)
          fScore.set(neighbor.node, tentativeG + h)
          openSet.set(neighbor.node, {
            node: this.roadNetwork.getNode(neighbor.node),
            f: fScore.get(neighbor.node)
          })
        }
      }
    }

    return null
  }

  _heuristic(nodeA, nodeB) {
    return Math.sqrt(
      Math.pow(nodeB.x - nodeA.x, 2) +
      Math.pow(nodeB.y - nodeA.y, 2) +
      Math.pow((nodeB.z || 0) - (nodeA.z || 0), 2)
    )
  }

  _reconstructPath(cameFrom, currentId, startTime) {
    const nodes = [currentId]
    const edges = []
    let totalDistance = 0
    let current = currentId

    while (cameFrom.has(current)) {
      const prev = cameFrom.get(current)
      nodes.unshift(prev.from)
      edges.unshift(prev.edge)

      const edge = this.roadNetwork.getEdge(prev.edge)
      if (edge) {
        totalDistance += edge.length
      }

      current = prev.from
    }

    const avgSpeed = 2.5
    const estimatedTime = (totalDistance / avgSpeed) * 1000

    return {
      nodes,
      edges,
      distance: totalDistance,
      estimatedTime,
      conflicts: []
    }
  }

  _checkConflict(edgeId, time, ohtId) {
    const edgeReservations = this.reservations.get(edgeId) || []
    const conflict = edgeReservations.find(r => {
      if (r.ohtId === ohtId) return false
      return Math.abs(r.time - time) < 2000
    })
    return conflict !== undefined
  }

  reservePath(edges, startTime, ohtId) {
    let currentTime = startTime
    edges.forEach(edgeId => {
      if (!this.reservations.has(edgeId)) {
        this.reservations.set(edgeId, [])
      }
      this.reservations.get(edgeId).push({ ohtId, time: currentTime })
      const edge = this.roadNetwork.getEdge(edgeId)
      if (edge) {
        currentTime += (edge.length / 2.5) * 1000
      }
    })
  }

  releaseReservations(ohtId) {
    for (const [edgeId, reservations] of this.reservations) {
      this.reservations.set(
        edgeId,
        reservations.filter(r => r.ohtId !== ohtId)
      )
    }
  }

  cleanOldReservations(beforeTime) {
    for (const [edgeId, reservations] of this.reservations) {
      this.reservations.set(
        edgeId,
        reservations.filter(r => r.time > beforeTime)
      )
    }
  }

  updateRoadNetwork(roadNetwork) {
    this.roadNetwork = roadNetwork
  }
}
