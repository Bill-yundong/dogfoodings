import { writable } from 'svelte/store'
import { knowledgeNodesRepo, knowledgeEdgesRepo } from '$lib/db/repositories'
import { generateId } from '$lib/utils/id'
import { now } from '$lib/utils/time'
import type { GraphData, GraphNode, GraphEdge } from '$lib/engines/graph'

function createGraphStore() {
  const nodes = writable<GraphNode[]>([])
  const edges = writable<GraphEdge[]>([])
  const selectedNodeId = writable<string | null>(null)

  const graphData = writable<GraphData>({ nodes: [], edges: [] })

  return {
    nodes, edges, selectedNodeId, graphData,
    async load() {
      const dbNodes = await knowledgeNodesRepo.getAll() as any[]
      const dbEdges = await knowledgeEdgesRepo.getAll() as any[]
      const graphNodes: GraphNode[] = dbNodes.map(n => ({
        id: n.id, label: n.label, type: n.type, strength: n.strength
      }))
      const graphEdges: GraphEdge[] = dbEdges.map(e => ({
        id: e.id, source: e.sourceId, target: e.targetId, relationType: e.relationType, weight: e.weight
      }))
      nodes.set(graphNodes)
      edges.set(graphEdges)
      graphData.set({ nodes: graphNodes, edges: graphEdges })
    },
    async addNode(node: { label: string; type: string; sourceNoteId: string }) {
      const t = now()
      const id = generateId()
      await knowledgeNodesRepo.add({
        id, label: node.label, type: node.type, strength: 0.5,
        sourceNoteId: node.sourceNoteId, lastAccessedAt: t, createdAt: t
      })
      const graphNode: GraphNode = { id, label: node.label, type: node.type, strength: 0.5 }
      nodes.update(n => [...n, graphNode])
      graphData.update(d => ({ nodes: [...d.nodes, graphNode], edges: d.edges }))
      return id
    },
    async addEdge(sourceId: string, targetId: string, relationType: string, weight: number = 0.5) {
      const id = generateId()
      await knowledgeEdgesRepo.add({ id, sourceId, targetId, relationType, weight })
      const graphEdge: GraphEdge = { id, source: sourceId, target: targetId, relationType, weight }
      edges.update(e => [...e, graphEdge])
      graphData.update(d => ({ nodes: d.nodes, edges: [...d.edges, graphEdge] }))
      return id
    },
    async updateNodeStrength(id: string, strength: number) {
      const all = await knowledgeNodesRepo.getAll() as any[]
      const existing = all.find(n => n.id === id)
      if (!existing) return
      await knowledgeNodesRepo.put({ ...existing, strength, lastAccessedAt: now() })
      nodes.update(ns => ns.map(n => n.id === id ? { ...n, strength } : n))
      graphData.update(d => ({
        nodes: d.nodes.map(n => n.id === id ? { ...n, strength } : n),
        edges: d.edges
      }))
    },
    selectNode(id: string | null) {
      selectedNodeId.set(id)
    }
  }
}

export const graphStore = createGraphStore()
