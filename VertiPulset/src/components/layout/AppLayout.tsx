'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { initDB, getDatabaseStats } from '@/db';
import { mockGenerators } from '@/utils/mock/generators';
import { dbOperations } from '@/db/operations';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useBatteryStore } from '@/store/useBatteryStore';
import { useEnergyStore } from '@/store/useEnergyStore';
import { useAirspaceStore } from '@/store/useAirspaceStore';
import { useSchedulingStore } from '@/store/useSchedulingStore';
import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const setFlights = useDashboardStore((state) => state.setFlights);
  const setRunways = useDashboardStore((state) => state.setRunways);
  const setAircraft = useDashboardStore((state) => state.setAircraft);
  const setBatteries = useBatteryStore((state) => state.setBatteries);
  const setSnapshots = useBatteryStore((state) => state.setSnapshots);
  const setGridSignals = useEnergyStore((state) => state.setGridSignals);
  const setChargeSessions = useEnergyStore((state) => state.setChargeSessions);
  const setSectors = useAirspaceStore((state) => state.setSectors);
  const initMDP = useSchedulingStore((state) => state.initMDP);

  useEffect(() => {
    const initializeSystem = async () => {
      try {
        await initDB();
        setLoadingProgress(20);

        const stats = await getDatabaseStats();
        setLoadingProgress(40);

        let batteries = mockGenerators.generateBatteries(30);
        let aircraft = mockGenerators.generateAircraft(batteries, 30);
        let flights = mockGenerators.generateFlights(aircraft, 200);
        let runways = mockGenerators.generateRunways(8);
        let sectors = mockGenerators.generateAirspaceSectors();
        let gridSignals = mockGenerators.generateGridSignals(500);
        let chargeSessions = mockGenerators.generateChargeSessions(batteries, gridSignals, 200);
        
        setLoadingProgress(60);

        if (stats.batterySnapshots < 1000) {
          const snapshots = mockGenerators.generateBatterySnapshots(batteries, flights, 5000);
          await dbOperations.addBatterySnapshotsBulk(snapshots);
          setSnapshots(snapshots.slice(0, 1000));
        }

        if (stats.flights < 100) {
          await dbOperations.addFlightsBulk(flights);
        }

        if (stats.gridSignals < 100) {
          await dbOperations.addGridSignalsBulk(gridSignals);
        }

        if (stats.chargeSessions < 50) {
          await dbOperations.addChargeSessionsBulk(chargeSessions);
        }

        setLoadingProgress(80);

        setFlights(flights.slice(0, 50));
        setRunways(runways);
        setAircraft(aircraft);
        setBatteries(batteries);
        setGridSignals(gridSignals.slice(-100));
        setChargeSessions(chargeSessions.slice(0, 50));
        setSectors(sectors);
        initMDP();

        setLoadingProgress(100);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize system:', error);
        setIsInitialized(true);
      }
    };

    initializeSystem();
  }, [setFlights, setRunways, setAircraft, setBatteries, setSnapshots, setGridSignals, setChargeSessions, setSectors, initMDP]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-space-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-electric-blue/30 border-t-electric-blue rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-white font-display mb-2">VertiPulset</h2>
          <p className="text-metal-gray text-sm mb-4">系统初始化中...</p>
          <div className="w-64 h-2 bg-space-blue rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-electric-blue to-tech-purple transition-all duration-500"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-metal-gray mt-2">{loadingProgress}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-space-dark grid-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
