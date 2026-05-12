import React, { useState, useEffect } from 'react';
import type { Ship, Anchorage, WeatherCondition, AnchorStatus, SemanticSyncMessage } from './types';
import { db, initializeSampleData } from './db';
import { catenaryModel } from './models/catenary';
import { semanticSynchronizer, syncAnchorStatus, sendDragAlert } from './services/semanticSync';
import { typhoonOptimizer } from './services/typhoonOptimizer';
import type { EvacuationPlan } from './services/typhoonOptimizer';
import { ShipStatusCard } from './components/ShipStatusCard';
import { AnchorageInfo } from './components/AnchorageInfo';
import { WeatherControl } from './components/WeatherControl';
import { SyncMessageLog } from './components/SyncMessageLog';

const App: React.FC = () => {
  const [ships, setShips] = useState<Ship[]>([]);
  const [anchorages, setAnchorages] = useState<Anchorage[]>([]);
  const [selectedAnchorage, setSelectedAnchorage] = useState<string>('');
  const [anchorStatuses, setAnchorStatuses] = useState<Map<string, AnchorStatus>>(new Map());
  const [weather, setWeather] = useState<WeatherCondition>({
    windSpeed: 15,
    windDirection: 180,
    waveHeight: 2,
    wavePeriod: 8
  });
  const [messages, setMessages] = useState<SemanticSyncMessage[]>([]);
  const [evacuationPlan, setEvacuationPlan] = useState<EvacuationPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSpeed, setCurrentSpeed] = useState(0.8);

  useEffect(() => {
    const initData = async () => {
      await initializeSampleData();
      const [shipsData, anchoragesData] = await Promise.all([
        db.getAllShips(),
        db.getAllAnchorages()
      ]);
      setShips(shipsData);
      setAnchorages(anchoragesData);
      if (anchoragesData.length > 0) {
        setSelectedAnchorage(anchoragesData[0].id);
      }
      setIsLoading(false);
    };
    initData();

    semanticSynchronizer.subscribe('app', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      semanticSynchronizer.unsubscribe('app');
    };
  }, []);

  const handleSimulate = async (shipId: string) => {
    const ship = ships.find(s => s.id === shipId);
    const anchorage = anchorages.find(a => a.id === selectedAnchorage);
    
    if (ship && anchorage) {
      const status = await catenaryModel.simulateAnchorStability(
        ship,
        anchorage,
        weather,
        currentSpeed,
        180,
        6
      );
      
      setAnchorStatuses(prev => new Map(prev).set(shipId, status));
      await db.addAnchorStatus(status);
      await syncAnchorStatus(shipId, status);
      
      if (status.dragRisk === 'high' || status.dragRisk === 'critical') {
        await sendDragAlert(shipId, status.dragRisk);
      }
    }
  };

  const simulateAll = async () => {
    for (const ship of ships) {
      await handleSimulate(ship.id);
    }
  };

  const generateEvacuationPlan = async () => {
    if (ships.length === 0 || anchorages.length === 0) return;
    
    const plan = await typhoonOptimizer.generateEvacuationPlan(
      ships,
      anchorages,
      weather,
      currentSpeed,
      180
    );
    setEvacuationPlan(plan);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">正在加载数据...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-800 text-white py-6 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-2xl font-bold">港口避风锚地船舶运力协同系统</h1>
          <p className="text-blue-200 mt-1">走锚风险监控与台风应急协同平台</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">锚泊船舶状态</h2>
                <button
                  onClick={simulateAll}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  全部模拟
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ships.map(ship => (
                  <ShipStatusCard
                    key={ship.id}
                    ship={ship}
                    status={anchorStatuses.get(ship.id)}
                    onSimulate={handleSimulate}
                  />
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">避风锚地</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {anchorages.map(anchorage => (
                  <AnchorageInfo
                    key={anchorage.id}
                    anchorage={anchorage}
                    isSelected={selectedAnchorage === anchorage.id}
                    onSelect={() => setSelectedAnchorage(anchorage.id)}
                  />
                ))}
              </div>
            </div>

            {evacuationPlan && (
              <div className="bg-white rounded-lg shadow-md p-6 border-2 border-orange-400">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  🚨 应急疏散方案
                </h2>
                <div className="mb-4 p-4 bg-orange-50 rounded-lg">
                  <p className="font-medium text-orange-800">
                    风险评估: {evacuationPlan.riskAssessment}
                  </p>
                  <p className="text-sm text-orange-600 mt-1">
                    预计总耗时: {evacuationPlan.totalEstimatedTime} 分钟
                  </p>
                </div>
                <div className="space-y-2">
                  {evacuationPlan.shipOrders.map(order => {
                    const ship = ships.find(s => s.id === order.shipId);
                    const anchorage = anchorages.find(a => a.id === order.targetAnchorage);
                    return (
                      <div key={order.shipId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">#{order.order} {ship?.name}</span>
                        <span className="text-gray-600">{anchorage?.name}</span>
                        <span className="text-sm text-gray-500">预计 {order.estimatedTime} 分钟</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <WeatherControl weather={weather} onChange={setWeather} />

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">海流参数</h3>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">流速</label>
                  <span className="text-sm text-gray-500">{currentSpeed.toFixed(2)} m/s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={currentSpeed}
                  onChange={(e) => setCurrentSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">应急协同操作</h3>
              <div className="space-y-3">
                <button
                  onClick={generateEvacuationPlan}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  生成疏散方案
                </button>
                <button
                  onClick={() => setEvacuationPlan(null)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  重置
                </button>
              </div>
            </div>

            <SyncMessageLog messages={messages} />
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          港口避风锚地船舶运力协同系统 - 基于动态悬链线模型的走锚风险评估
        </div>
      </footer>
    </div>
  );
};

export default App;
