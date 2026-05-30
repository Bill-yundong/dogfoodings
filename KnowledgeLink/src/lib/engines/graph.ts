export interface GraphNode {
	id: string
	label: string
	type: string
	strength: number
	x?: number
	y?: number
	vx?: number
	vy?: number
}

export interface GraphEdge {
	id: string
	source: string
	target: string
	relationType: string
	weight: number
}

export interface GraphData {
	nodes: GraphNode[]
	edges: GraphEdge[]
}

export function computeNodeDegree(data: GraphData): Map<string, { in: number; out: number; total: number }> {
	const degrees = new Map<string, { in: number; out: number; total: number }>()
	for (const node of data.nodes) {
		degrees.set(node.id, { in: 0, out: 0, total: 0 })
	}
	for (const edge of data.edges) {
		const sourceDeg = degrees.get(edge.source)
		if (sourceDeg) {
			sourceDeg.out++
			sourceDeg.total++
		}
		const targetDeg = degrees.get(edge.target)
		if (targetDeg) {
			targetDeg.in++
			targetDeg.total++
		}
	}
	return degrees
}

export function findShortestPath(data: GraphData, sourceId: string, targetId: string): string[] {
	if (sourceId === targetId) return [sourceId]
	const adjacency = new Map<string, string[]>()
	for (const node of data.nodes) {
		adjacency.set(node.id, [])
	}
	for (const edge of data.edges) {
		adjacency.get(edge.source)?.push(edge.target)
		adjacency.get(edge.target)?.push(edge.source)
	}
	const visited = new Set<string>([sourceId])
	const queue: { nodeId: string; path: string[] }[] = [{ nodeId: sourceId, path: [sourceId] }]
	while (queue.length > 0) {
		const { nodeId, path } = queue.shift()!
		const neighbors = adjacency.get(nodeId) ?? []
		for (const neighbor of neighbors) {
			if (visited.has(neighbor)) continue
			visited.add(neighbor)
			const newPath = [...path, neighbor]
			if (neighbor === targetId) return newPath
			queue.push({ nodeId: neighbor, path: newPath })
		}
	}
	return []
}

export function getSubgraph(data: GraphData, centerNodeId: string, depth: number): GraphData {
	const nodeMap = new Map<string, GraphNode>()
	for (const node of data.nodes) {
		nodeMap.set(node.id, node)
	}
	const adjacency = new Map<string, string[]>()
	for (const node of data.nodes) {
		adjacency.set(node.id, [])
	}
	for (const edge of data.edges) {
		adjacency.get(edge.source)?.push(edge.target)
		adjacency.get(edge.target)?.push(edge.source)
	}
	const includedNodeIds = new Set<string>()
	const queue: { nodeId: string; currentDepth: number }[] = [{ nodeId: centerNodeId, currentDepth: 0 }]
	includedNodeIds.add(centerNodeId)
	while (queue.length > 0) {
		const { nodeId, currentDepth } = queue.shift()!
		if (currentDepth >= depth) continue
		const neighbors = adjacency.get(nodeId) ?? []
		for (const neighbor of neighbors) {
			if (includedNodeIds.has(neighbor)) continue
			includedNodeIds.add(neighbor)
			queue.push({ nodeId: neighbor, currentDepth: currentDepth + 1 })
		}
	}
	const nodes: GraphNode[] = []
	for (const id of includedNodeIds) {
		const node = nodeMap.get(id)
		if (node) nodes.push(node)
	}
	const edges = data.edges.filter(e => includedNodeIds.has(e.source) && includedNodeIds.has(e.target))
	return { nodes, edges }
}

export function computeClusterAffinity(data: GraphData): Map<string, string[]> {
	const groups = new Map<string, string[]>()
	for (const node of data.nodes) {
		const key = node.label.split(' ')[0]
		if (!groups.has(key)) {
			groups.set(key, [])
		}
		groups.get(key)!.push(node.id)
	}
	return groups
}
