import React, { useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Loading } from './components/layout/Loading';
import { ShipStatusCard } from './components/ShipStatusCard';
import { AnchorageInfo } from './components/AnchorageInfo';
import { WeatherControl } from './components/WeatherControl';
import { SyncMessageLog } from './components/SyncMessageLog';
import { EvacuationPlan } from './components/EvacuationPlan';
import { formatNumber } from './utils/format';

const AppContent: React.FC = () => {
  const {
    ships,
    anchorages,
    selectedAnchorageId,
    anchorStatuses,
    weather,
    currentSpeed,
    messages,
    evacuationPlan,
    isLoading,
    error,
    setSelectedAnchorageId,
    setWeather,
    setCurrentSpeed,
    setEvacuationPlan,
    initializeData,
    simulateAnchorStability,
    simulateAllShips,
    generateEvacuationPlan
  } = useAppContext();

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-red-600 text-center">
          <h2 className="text-xl font-bold mb-2">初始化失败</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8 flex-grow w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">锚泊船舶状态</h2>
                <button
                  onClick={simulateAllShips}
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
                    onSimulate={simulateAnchorStability}
                  />
                ))}
              </div>
            </section>

            <section className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">避风锚地</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {anchorages.map(anchorage => (
                  <AnchorageInfo
                    key={anchorage.id}
                    anchorage={anchorage}
                    isSelected={selectedAnchorageId === anchorage.id}
                    onSelect={() => setSelectedAnchorageId(anchorage.id)}
                  />
                ))}
              </div>
            </section>

            {evacuationPlan && (
              <EvacuationPlan
                plan={evacuationPlan}
                ships={ships}
                anchorages={anchorages}
              />
            )}
          </div>

          <div className="space-y-6">
            <WeatherControl weather={weather} onChange={setWeather} />

            <section className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">海流参数</h3>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">流速</label>
                  <span className="text-sm text-gray-500">{formatNumber(currentSpeed, 2)} m/s</span>
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
            </section>

            <section className="bg-white rounded-lg shadow-md p-6">
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
                  disabled={!evacuationPlan}
                  className="w-full bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  重置
                </button>
              </div>
            </section>

            <SyncMessageLog messages={messages} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
