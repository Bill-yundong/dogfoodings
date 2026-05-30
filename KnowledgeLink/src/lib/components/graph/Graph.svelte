<script lang="ts">
import { onMount } from 'svelte'
import { graphStore } from '$lib/stores/graph'
import { get } from 'svelte/store'
import { computeNodeDegree, getSubgraph, computeClusterAffinity, type GraphData, type GraphNode, type GraphEdge } from '$lib/engines/graph'
import { Search, ZoomIn, ZoomOut, Maximize2, X, Link2, Tag, ArrowRight } from 'lucide-svelte'
import * as d3 from 'd3'

let svgRef = $state<SVGSVGElement>(undefined as any)
let searchQuery = $state('')
let selectedNode = $derived.by(() => {
  const selId = get(graphStore.selectedNodeId)
  const nodes = get(graphStore.nodes)
  return selId ? nodes.find(n => n.id === selId) : null
})
let selectedNodeEdges = $derived.by(() => {
  const selId = get(graphStore.selectedNodeId)
  const edges = get(graphStore.edges)
  return selId ? edges.filter(e => e.source === selId || e.target === selId) : []
})
let clusterAffinity = $derived(computeClusterAffinity({ nodes: get(graphStore.nodes), edges: get(graphStore.edges) }))
let nodeDegrees = $derived(computeNodeDegree({ nodes: get(graphStore.nodes), edges: get(graphStore.edges) }))

let zoomLevel = $state(1)

onMount(async () => {
  await graphStore.load()
  drawGraph()
})

function drawGraph() {
  if (!svgRef) return
  const data = { nodes: get(graphStore.nodes), edges: get(graphStore.edges) }
  if (data.nodes.length === 0) return

  const svg = d3.select(svgRef)
  svg.selectAll('*').remove()

  const width = svgRef.clientWidth
  const height = svgRef.clientHeight

  const g = svg.append('g')

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
      zoomLevel = event.transform.k
    })

  svg.call(zoom)

  const simulation = d3.forceSimulation(data.nodes as d3.SimulationNodeDatum[])
    .force('link', d3.forceLink(data.edges)
      .id((d: any) => d.id)
      .distance(80)
    )
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(30))

  const link = g.append('g')
    .selectAll('line')
    .data(data.edges)
    .join('line')
    .attr('stroke', '#2a2a4a')
    .attr('stroke-width', (d: any) => Math.max(1, d.weight * 3))
    .attr('stroke-opacity', 0.6)

  const node = g.append('g')
    .selectAll('g')
    .data(data.nodes)
    .join('g')
    .attr('cursor', 'pointer')
    .on('click', (event: MouseEvent, d: any) => {
      event.stopPropagation()
      graphStore.selectNode(d.id)
    })

  node.append('circle')
    .attr('r', (d: any) => Math.max(8, d.strength * 20))
    .attr('fill', (d: any) => {
      const colors: Record<string, string> = {
        concept: '#e2b714', person: '#3b82f6', event: '#53d769', method: '#ff9f43', theory: '#a855f7'
      }
      return colors[d.type] || '#8888a8'
    })
    .attr('fill-opacity', 0.8)
    .attr('stroke', '#1a1a2e')
    .attr('stroke-width', 2)

  node.append('text')
    .text((d: any) => d.label.length > 10 ? d.label.slice(0, 10) + '…' : d.label)
    .attr('font-size', '10px')
    .attr('fill', '#e8e8f0')
    .attr('text-anchor', 'middle')
    .attr('dy', (d: any) => Math.max(8, d.strength * 20) + 14)

  simulation.on('tick', () => {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)

    node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
  })

  svg.on('click', () => {
    graphStore.selectNode(null)
  })
}

function handleZoomIn() {
  if (!svgRef) return
  d3.select(svgRef).transition().call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 1.5)
}

function handleZoomOut() {
  if (!svgRef) return
  d3.select(svgRef).transition().call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 0.67)
}

function handleReset() {
  if (!svgRef) return
  d3.select(svgRef).transition().call(
    d3.zoom<SVGSVGElement, unknown>().transform,
    d3.zoomIdentity
  )
}
</script>

<div class="h-full flex relative">
  <div class="flex-1 relative bg-bg">
    {#if get(graphStore.nodes).length === 0}
      <div class="absolute inset-0 flex flex-col items-center justify-center text-text-secondary">
        <Link2 size={48} class="mb-4 opacity-30" />
        <p class="text-lg">知识图谱为空</p>
        <p class="text-sm mt-1">添加笔记和知识节点后，图谱将自动构建</p>
      </div>
    {:else}
      <svg bind:this={svgRef} class="w-full h-full"></svg>
    {/if}

    <div class="absolute bottom-4 right-4 flex flex-col gap-2">
      <button onclick={handleZoomIn} class="p-2 bg-surface border border-border rounded-lg hover:border-accent/40 transition-colors">
        <ZoomIn size={18} class="text-text-secondary" />
      </button>
      <button onclick={handleZoomOut} class="p-2 bg-surface border border-border rounded-lg hover:border-accent/40 transition-colors">
        <ZoomOut size={18} class="text-text-secondary" />
      </button>
      <button onclick={handleReset} class="p-2 bg-surface border border-border rounded-lg hover:border-accent/40 transition-colors">
        <Maximize2 size={18} class="text-text-secondary" />
      </button>
    </div>

    <div class="absolute bottom-4 left-4 px-3 py-1 bg-surface border border-border rounded-lg text-xs text-text-secondary" style="font-family: var(--font-mono)">
      {Math.round(zoomLevel * 100)}%
    </div>
  </div>

  {#if selectedNode}
    <div class="w-80 bg-surface border-l border-border overflow-y-auto animate-fade-in">
      <div class="p-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-lg">{selectedNode.label}</h2>
          <button onclick={() => graphStore.selectNode(null)} class="p-1 hover:bg-surface-elevated rounded-lg">
            <X size={16} class="text-text-secondary" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <div class="text-xs text-text-secondary mb-1">类型</div>
            <span class="px-2 py-0.5 text-sm bg-accent/10 text-accent rounded-full">{selectedNode.type}</span>
          </div>

          <div>
            <div class="text-xs text-text-secondary mb-1">强度</div>
            <div class="flex items-center gap-2">
              <div class="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                <div class="h-full bg-accent rounded-full" style="width: {selectedNode.strength * 100}%"></div>
              </div>
              <span class="text-xs text-text-secondary" style="font-family: var(--font-mono)">{(selectedNode.strength * 100).toFixed(0)}%</span>
            </div>
          </div>

          {#if nodeDegrees.has(selectedNode.id)}
            <div>
              <div class="text-xs text-text-secondary mb-1">连接度</div>
              <div class="text-sm" style="font-family: var(--font-mono)">
                入度 {nodeDegrees.get(selectedNode.id)!.in} · 出度 {nodeDegrees.get(selectedNode.id)!.out}
              </div>
            </div>
          {/if}

          {#if selectedNodeEdges.length > 0}
            <div>
              <div class="text-xs text-text-secondary mb-2">关联 ({selectedNodeEdges.length})</div>
              <div class="space-y-1">
                {#each selectedNodeEdges.slice(0, 10) as edge}
                  <div class="flex items-center gap-2 text-xs text-text-secondary p-2 bg-bg rounded-lg">
                    <span class="truncate">{edge.source}</span>
                    <ArrowRight size={10} class="text-accent shrink-0" />
                    <span class="truncate">{edge.target}</span>
                    <span class="ml-auto text-accent">{edge.relationType}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <div class="absolute top-4 left-4 w-48">
    {#if clusterAffinity.size > 0}
      <div class="bg-surface/90 backdrop-blur border border-border rounded-xl p-3">
        <h3 class="text-xs text-text-secondary mb-2 uppercase tracking-wider">聚类</h3>
        <div class="space-y-1">
          {#each [...clusterAffinity.entries()].slice(0, 8) as [cluster, nodeIds]}
            <button
              class="w-full text-left px-2 py-1 text-xs rounded hover:bg-surface-elevated transition-colors flex items-center justify-between"
            >
              <span class="text-text truncate">{cluster}</span>
              <span class="text-text-secondary" style="font-family: var(--font-mono)">{nodeIds.length}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
