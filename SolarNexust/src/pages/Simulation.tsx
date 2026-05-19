import { useEffect } from 'react';
import { SolarScene } from '@/components/simulation/SolarScene';
import { SimulationControls } from '@/components/simulation/SimulationControls';
import { PanelDetails } from '@/components/simulation/PanelDetails';
import { useSimulationStore } from '@/store/useSimulationStore';
import { useRayTracing } from '@/hooks/useRayTracing';
import { generateAllMockData } from '@/utils/mockData';
import { initDB, regionDB, solarPanelDB, buildingDB } from '@/utils/db';

export default function Simulation() {
  const { setRegions, setPanels, setBuildings, setCurrentRegionId } = useSimulationStore();
  const { isWorkerReady } = useRayTracing();
  
  useEffect(() => {
    const init = async () => {
      await initDB();
      
      const existingRegions = await regionDB.getAll();
      const existingPanels = await solarPanelDB.getAll();
      const existingBuildings = await buildingDB.getAll();
      
      if (existingRegions.length === 0) {
        const mockData = await generateAllMockData();
        
        await regionDB.bulkPut(mockData.regions);
        await solarPanelDB.bulkPut(mockData.panels);
        await buildingDB.bulkPut(mockData.buildings);
        
        setRegions(mockData.regions);
        setPanels(mockData.panels);
        setBuildings(mockData.buildings);
        setCurrentRegionId(mockData.regions[0]?.id || null);
      } else {
        setRegions(existingRegions);
        setPanels(existingPanels);
        setBuildings(existingBuildings);
        setCurrentRegionId(existingRegions[0]?.id || null);
      }
    };
    
    init();
  }, [setRegions, setPanels, setBuildings, setCurrentRegionId]);
  
  return (
    <div className="relative w-full h-full">
      <SolarScene />
      <SimulationControls />
      <PanelDetails />
      
      {!isWorkerReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">正在初始化光线追踪引擎</h2>
            <p className="text-slate-400">加载中，请稍候...</p>
          </div>
        </div>
      )}
    </div>
  );
}
