import { create } from 'zustand';
import type { PipelineNode, PipelineSegment, Region } from '../types';

interface PipelineState {
  nodes: PipelineNode[];
  segments: PipelineSegment[];
  regions: Region[];
  selectedNodeId: string | null;
  selectedSegmentId: string | null;
  pan: { x: number; y: number };
  zoom: number;

  setNodes: (nodes: PipelineNode[]) => void;
  setSegments: (segments: PipelineSegment[]) => void;
  setRegions: (regions: Region[]) => void;
  addNode: (node: PipelineNode) => void;
  updateNode: (id: string, updates: Partial<PipelineNode>) => void;
  removeNode: (id: string) => void;
  addSegment: (segment: PipelineSegment) => void;
  updateSegment: (id: string, updates: Partial<PipelineSegment>) => void;
  removeSegment: (id: string) => void;
  selectNode: (id: string | null) => void;
  selectSegment: (id: string | null) => void;
  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  resetView: () => void;
  loadDemoPipeline: () => void;
}

export const usePipelineStore = create<PipelineState>((set) => ({
  nodes: [],
  segments: [],
  regions: [],
  selectedNodeId: null,
  selectedSegmentId: null,
  pan: { x: 0, y: 0 },
  zoom: 1,

  setNodes: (nodes) => set({ nodes }),
  setSegments: (segments) => set({ segments }),
  setRegions: (regions) => set({ regions }),

  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  updateNode: (id, updates) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),
  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      segments: state.segments.filter((s) => s.fromNodeId !== id && s.toNodeId !== id),
    })),

  addSegment: (segment) => set((state) => ({ segments: [...state.segments, segment] })),
  updateSegment: (id, updates) =>
    set((state) => ({
      segments: state.segments.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),
  removeSegment: (id) =>
    set((state) => ({
      segments: state.segments.filter((s) => s.id !== id),
    })),

  selectNode: (id) => set({ selectedNodeId: id, selectedSegmentId: null }),
  selectSegment: (id) => set({ selectedSegmentId: id, selectedNodeId: null }),

  setPan: (x, y) => set({ pan: { x, y } }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  resetView: () => set({ pan: { x: 0, y: 0 }, zoom: 1 }),

  loadDemoPipeline: () => {
    const demoRegions: Region[] = [
      { id: 'region-a', name: '华北区', color: '#3B82F6', bounds: { x: 50, y: 50, width: 400, height: 300 } },
      { id: 'region-b', name: '华东区', color: '#8B5CF6', bounds: { x: 500, y: 50, width: 400, height: 300 } },
      { id: 'region-c', name: '华南区', color: '#06B6D4', bounds: { x: 275, y: 380, width: 400, height: 250 } },
    ];

    const demoNodes: PipelineNode[] = [
      { id: 'res-1', type: 'reservoir', name: '储油站 A1', x: 100, y: 150, region: 'region-a', elevation: 50, pressure: 2000000, flowRate: 0.5, velocity: 1.2 },
      { id: 'junc-1', type: 'junction', name: '节点 J1', x: 250, y: 150, region: 'region-a', elevation: 45, pressure: 1800000, flowRate: 0.5, velocity: 1.2 },
      { id: 'valve-1', type: 'valve', name: '阀门 V1', x: 400, y: 150, region: 'region-a', elevation: 40, pressure: 1600000, flowRate: 0.5, velocity: 1.2 },
      { id: 'pump-1', type: 'pump', name: '泵站 P1', x: 550, y: 150, region: 'region-b', elevation: 35, pressure: 2500000, flowRate: 0.5, velocity: 1.2 },
      { id: 'junc-2', type: 'junction', name: '节点 J2', x: 700, y: 150, region: 'region-b', elevation: 30, pressure: 2200000, flowRate: 0.5, velocity: 1.2 },
      { id: 'valve-2', type: 'valve', name: '阀门 V2', x: 700, y: 300, region: 'region-b', elevation: 25, pressure: 2000000, flowRate: 0.3, velocity: 1.2 },
      { id: 'junc-3', type: 'junction', name: '节点 J3', x: 450, y: 450, region: 'region-c', elevation: 20, pressure: 1500000, flowRate: 0.5, velocity: 1.2 },
      { id: 'valve-3', type: 'valve', name: '阀门 V3', x: 600, y: 450, region: 'region-c', elevation: 15, pressure: 1200000, flowRate: 0.5, velocity: 1.2 },
      { id: 'sensor-1', type: 'sensor', name: '传感器 S1', x: 300, y: 150, region: 'region-a', elevation: 42, pressure: 1700000, flowRate: 0.5, velocity: 1.2 },
      { id: 'res-2', type: 'reservoir', name: '储油站 A2', x: 750, y: 450, region: 'region-c', elevation: 10, pressure: 800000, flowRate: 0, velocity: 0 },
    ];

    const demoSegments: PipelineSegment[] = [
      { id: 'seg-1', fromNodeId: 'res-1', toNodeId: 'junc-1', diameter: 0.5, wallThickness: 0.02, length: 5000, material: 'steel', roughness: 0.00015, waveSpeed: 1200 },
      { id: 'seg-2', fromNodeId: 'junc-1', toNodeId: 'sensor-1', diameter: 0.5, wallThickness: 0.02, length: 2000, material: 'steel', roughness: 0.00015, waveSpeed: 1200 },
      { id: 'seg-3', fromNodeId: 'sensor-1', toNodeId: 'valve-1', diameter: 0.5, wallThickness: 0.02, length: 3000, material: 'steel', roughness: 0.00015, waveSpeed: 1200 },
      { id: 'seg-4', fromNodeId: 'valve-1', toNodeId: 'pump-1', diameter: 0.5, wallThickness: 0.02, length: 4000, material: 'steel', roughness: 0.00015, waveSpeed: 1200 },
      { id: 'seg-5', fromNodeId: 'pump-1', toNodeId: 'junc-2', diameter: 0.5, wallThickness: 0.02, length: 3000, material: 'steel', roughness: 0.00015, waveSpeed: 1200 },
      { id: 'seg-6', fromNodeId: 'junc-2', toNodeId: 'valve-2', diameter: 0.4, wallThickness: 0.015, length: 2500, material: 'steel', roughness: 0.00015, waveSpeed: 1150 },
      { id: 'seg-7', fromNodeId: 'valve-2', toNodeId: 'junc-3', diameter: 0.4, wallThickness: 0.015, length: 6000, material: 'castIron', roughness: 0.00026, waveSpeed: 1000 },
      { id: 'seg-8', fromNodeId: 'junc-1', toNodeId: 'junc-3', diameter: 0.45, wallThickness: 0.018, length: 8000, material: 'steel', roughness: 0.00015, waveSpeed: 1180 },
      { id: 'seg-9', fromNodeId: 'junc-3', toNodeId: 'valve-3', diameter: 0.45, wallThickness: 0.018, length: 3500, material: 'steel', roughness: 0.00015, waveSpeed: 1180 },
      { id: 'seg-10', fromNodeId: 'valve-3', toNodeId: 'res-2', diameter: 0.4, wallThickness: 0.015, length: 2000, material: 'steel', roughness: 0.00015, waveSpeed: 1150 },
    ];

    set({
      nodes: demoNodes,
      segments: demoSegments,
      regions: demoRegions,
    });
  },
}));
