import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HeatmapCanvas } from './components/HeatmapCanvas';
import { ControlPanel } from './components/ControlPanel';
import { calculateNoiseGrid } from './utils/acousticModel';
import { saveSnapshot, getAllSnapshots, deleteSnapshot, initDB } from './utils/storage';
import { NoiseSource, Building, SnapshotData } from './types';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = 5;

const generateId = () => Math.random().toString(36).substr(2, 9);

const defaultSources: NoiseSource[] = [
  {
    id: generateId(),
    x: 150,
    y: 200,
    frequency: 500,
    baseDecibels: 85.5,
    type: 'traffic',
    active: true
  },
  {
    id: generateId(),
    x: 600,
    y: 150,
    frequency: 1200,
    baseDecibels: 90.2,
    type: 'industrial',
    active: true
  },
  {
    id: generateId(),
    x: 400,
    y: 450,
    frequency: 750,
    baseDecibels: 75.8,
    type: 'social',
    active: true
  }
];

const defaultBuildings: Building[] = [
  {
    id: generateId(),
    x: 250,
    y: 100,
    width: 80,
    height: 120,
    floors: 5,
    material: 'concrete'
  },
  {
    id: generateId(),
    x: 450,
    y: 250,
    width: 100,
    height: 80,
    floors: 4,
    material: 'glass'
  },
  {
    id: generateId(),
    x: 100,
    y: 400,
    width: 70,
    height: 90,
    floors: 3,
    material: 'brick'
  }
];

const sourceTypes: NoiseSource['type'][] = ['traffic', 'industrial', 'construction', 'social'];
const buildingMaterials: Building['material'][] = ['concrete', 'glass', 'brick'];

export const App: React.FC = () => {
  const [sources, setSources] = useState<NoiseSource[]>(defaultSources);
  const [buildings, setBuildings] = useState<Building[]>(defaultBuildings);
  const [snapshots, setSnapshots] = useState<SnapshotData[]>([]);
  const [isSimulating, setIsSimulating] = useState(true);

  const gridData = useMemo(() => {
    return calculateNoiseGrid(sources, buildings, CANVAS_WIDTH, CANVAS_HEIGHT, CELL_SIZE);
  }, [sources, buildings]);

  const stats = useMemo(() => {
    const flatData = gridData.flat();
    if (flatData.length === 0) {
      return { avgDecibels: 0, maxDecibels: 0, minDecibels: 0 };
    }
    return {
      avgDecibels: flatData.reduce((a, b) => a + b, 0) / flatData.length,
      maxDecibels: Math.max(...flatData),
      minDecibels: Math.min(...flatData)
    };
  }, [gridData]);

  useEffect(() => {
    const loadSnapshots = async () => {
      await initDB();
      const loaded = await getAllSnapshots();
      setSnapshots(loaded);
    };
    loadSnapshots();
  }, []);

  const handleAddSource = useCallback(() => {
    const type = sourceTypes[Math.floor(Math.random() * sourceTypes.length)];
    const rawFrequency = 200 + Math.random() * 1500;
    const newSource: NoiseSource = {
      id: generateId(),
      x: 100 + Math.random() * (CANVAS_WIDTH - 200),
      y: 100 + Math.random() * (CANVAS_HEIGHT - 200),
      frequency: rawFrequency >= 1000 ? rawFrequency : Math.round(rawFrequency),
      baseDecibels: Number((60 + Math.random() * 50).toFixed(1)),
      type,
      active: true
    };
    setSources(prev => [...prev, newSource]);
  }, []);

  const handleUpdateSource = useCallback((id: string, updates: Partial<NoiseSource>) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const handleRemoveSource = useCallback((id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleAddBuilding = useCallback(() => {
    const material = buildingMaterials[Math.floor(Math.random() * buildingMaterials.length)];
    const newBuilding: Building = {
      id: generateId(),
      x: 50 + Math.random() * (CANVAS_WIDTH - 150),
      y: 50 + Math.random() * (CANVAS_HEIGHT - 150),
      width: 50 + Math.random() * 80,
      height: 50 + Math.random() * 100,
      floors: Math.floor(2 + Math.random() * 8),
      material
    };
    setBuildings(prev => [...prev, newBuilding]);
  }, []);

  const handleRemoveBuilding = useCallback((id: string) => {
    setBuildings(prev => prev.filter(b => b.id !== id));
  }, []);

  const handleSaveSnapshot = useCallback(async () => {
    const snapshot: Omit<SnapshotData, 'id'> = {
      timestamp: Date.now(),
      gridData,
      sources,
      buildings,
      metadata: { ...stats, gridSize: CELL_SIZE }
    };
    const id = await saveSnapshot(snapshot);
    setSnapshots(prev => [...prev, { ...snapshot, id }]);
  }, [gridData, sources, buildings, stats]);

  const handleLoadSnapshot = useCallback((snapshot: SnapshotData) => {
    setSources(snapshot.sources);
    setBuildings(snapshot.buildings);
  }, []);

  const handleDeleteSnapshot = useCallback(async (id: number) => {
    await deleteSnapshot(id);
    setSnapshots(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setSources([]);
    setBuildings([]);
  }, []);

  const handleToggleSimulation = useCallback(() => {
    setIsSimulating(prev => !prev);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f0f23',
      padding: '20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      gap: '20px'
    }}>
      <div>
        <h1 style={{
          color: '#00d4ff',
          fontSize: '28px',
          margin: '0 0 15px 0',
          textAlign: 'center'
        }}>
          城市噪声污染空间分布量化系统
        </h1>
        <p style={{
          color: '#888',
          fontSize: '14px',
          margin: '0 0 15px 0',
          textAlign: 'center'
        }}>
          基于声场物理建模 · 克里金插值热力图 · Web Audio 频谱分析
        </p>
        <HeatmapCanvas
          gridData={gridData}
          buildings={buildings}
          sources={sources}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          cellSize={CELL_SIZE}
          minValue={30}
          maxValue={100}
        />
        <div style={{
          marginTop: '15px',
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          color: '#888',
          fontSize: '12px'
        }}>
          <span>🎵 声源: {sources.filter(s => s.active).length}</span>
          <span>🏢 建筑: {buildings.length}</span>
          <span>📊 网格: {Math.ceil(CANVAS_WIDTH / CELL_SIZE)}x{Math.ceil(CANVAS_HEIGHT / CELL_SIZE)}</span>
        </div>
      </div>
      <ControlPanel
        sources={sources}
        buildings={buildings}
        snapshots={snapshots}
        onAddSource={handleAddSource}
        onUpdateSource={handleUpdateSource}
        onRemoveSource={handleRemoveSource}
        onAddBuilding={handleAddBuilding}
        onRemoveBuilding={handleRemoveBuilding}
        onSaveSnapshot={handleSaveSnapshot}
        onLoadSnapshot={handleLoadSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
        onClearAll={handleClearAll}
        isSimulating={isSimulating}
        onToggleSimulation={handleToggleSimulation}
        stats={stats}
      />
    </div>
  );
};
