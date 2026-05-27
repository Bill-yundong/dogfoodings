'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { initializeMockDatabase } from '@/lib/mockData';
import { syncEngine } from '@/lib/syncEngine';
import { getAll, count } from '@/lib/database';
import type {
  BrewingPreset,
  CoffeeBean,
  StoreLocation,
  BrewingRecord,
  RnDExperiment,
  ExtractionCurve,
} from '@/types';

interface AppDataContextType {
  presets: BrewingPreset[];
  beans: CoffeeBean[];
  stores: StoreLocation[];
  records: BrewingRecord[];
  experiments: RnDExperiment[];
  curves: ExtractionCurve[];
  loading: boolean;
  stats: {
    presets: number;
    beans: number;
    stores: number;
    records: number;
    experiments: number;
    curves: number;
  };
  refreshData: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [presets, setPresets] = useState<BrewingPreset[]>([]);
  const [beans, setBeans] = useState<CoffeeBean[]>([]);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [records, setRecords] = useState<BrewingRecord[]>([]);
  const [experiments, setExperiments] = useState<RnDExperiment[]>([]);
  const [curves, setCurves] = useState<ExtractionCurve[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    presets: 0,
    beans: 0,
    stores: 0,
    records: 0,
    experiments: 0,
    curves: 0,
  });

  const refreshData = async () => {
    try {
      const [
        presetsData,
        beansData,
        storesData,
        recordsData,
        experimentsData,
        curvesData,
        presetsCount,
        beansCount,
        storesCount,
        recordsCount,
        experimentsCount,
        curvesCount,
      ] = await Promise.all([
        getAll<BrewingPreset>('presets'),
        getAll<CoffeeBean>('beans'),
        getAll<StoreLocation>('stores'),
        getAll<BrewingRecord>('records'),
        getAll<RnDExperiment>('experiments'),
        getAll<ExtractionCurve>('extractionCurves'),
        count('presets'),
        count('beans'),
        count('stores'),
        count('records'),
        count('experiments'),
        count('extractionCurves'),
      ]);

      setPresets(presetsData);
      setBeans(beansData);
      setStores(storesData);
      setRecords(recordsData);
      setExperiments(experimentsData);
      setCurves(curvesData);
      setStats({
        presets: presetsCount,
        beans: beansCount,
        stores: storesCount,
        records: recordsCount,
        experiments: experimentsCount,
        curves: curvesCount,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await initializeMockDatabase();
        await refreshData();
        await syncEngine.start();
      } catch (error) {
        console.error('Initialization failed:', error);
        setLoading(false);
      }
    };

    init();

    return () => {
      syncEngine.stop();
    };
  }, []);

  return (
    <AppDataContext.Provider
      value={{
        presets,
        beans,
        stores,
        records,
        experiments,
        curves,
        loading,
        stats,
        refreshData,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
