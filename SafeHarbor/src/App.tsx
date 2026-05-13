import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { Loading } from './components/layout/Loading';
import { ShipStatusCard } from './components/ShipStatusCard';
import { AnchorageInfo } from './components/AnchorageInfo';
import { StatsCard } from './components/StatsCard';
import { WeatherControl } from './components/WeatherControl';
import { SyncMessageLog } from './components/SyncMessageLog';
import { EvacuationPlan } from './components/EvacuationPlan';
import { useAppContext } from './context/AppContext';

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
    clearEvacuationPlan,
    initializeData,
    simulateAnchorStability,
    simulateAllShips,
    generateEvacuationPlan
  } = useAppContext();

  const [activeNav, setActiveNav] = useState('dashboard');

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  const handleCurrentSpeedChange = (speed: number) => {
    setCurrentSpeed(speed);
  };

  const getNavTitle = () => {
    switch (activeNav) {
      case 'dashboard': return '监控面板';
      case 'ships': return '船舶管理';
      case 'anchorages': return '锚地管理';
      case 'weather': return '气象海况';
      case 'typhoon': return '台风应急';
      case 'logs': return '同步日志';
      default: return '监控面板';
    }
  };

  if (isLoading) {
    return <Loading message="正在初始化港口数据..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-navy-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-card p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-risk-critical/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-risk-critical" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-navy-800 mb-2">初始化失败</h2>
          <p className="text-navy-500">{error}</p>
          <button
            onClick={initializeData}
            className="mt-4 btn-primary"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeNav) {
      case 'dashboard':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard
                title="在港船舶"
                value={ships.length}
                unit="艘"
                gradient="bg-gradient-to-br from-ocean-500 to-ocean-700"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
              />
              <StatsCard
                title="可用锚地"
                value={anchorages.length}
                unit="个"
                gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                }
              />
              <StatsCard
                title="低风险船舶"
                value={ships.filter(s => anchorStatuses.get(s.id)?.dragRisk === 'low').length}
                unit="艘"
                gradient="bg-gradient-to-br from-risk-low to-emerald-600"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
              />
              <StatsCard
                title="同步消息"
                value={messages.length}
                unit="条"
                gradient="bg-gradient-to-br from-slate-500 to-slate-700"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                }
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="card">
                  <div className="card-header flex justify-between items-center">
                    <span>船舶锚泊状态</span>
                    <button
                      onClick={simulateAllShips}
                      className="btn-secondary text-sm py-1.5 px-4"
                    >
                      全部模拟
                    </button>
                  </div>
                  <div className="card-body">
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
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">锚地信息</div>
                  <div className="card-body">
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
                  </div>
                </div>

                {evacuationPlan && (
                  <div className="card border-risk-critical/30">
                    <div className="card-header flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-risk-critical animate-pulse"></span>
                        <span>应急疏散方案</span>
                      </div>
                      <button
                        onClick={clearEvacuationPlan}
                        className="text-navy-500 hover:text-navy-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="card-body">
                      <EvacuationPlan
                        plan={evacuationPlan}
                        ships={ships}
                        anchorages={anchorages}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <WeatherControl weather={weather} onChange={setWeather} />

                <div className="card">
                  <div className="card-header">海流参数</div>
                  <div className="card-body">
                    <div className="mb-2 flex justify-between items-center">
                      <label className="text-sm font-medium text-navy-700">流速</label>
                      <span className="text-sm font-semibold text-ocean-600">{currentSpeed.toFixed(2)} m/s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.1"
                      value={currentSpeed}
                      onChange={(e) => handleCurrentSpeedChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-navy-100 rounded-full appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-navy-400 mt-1">
                      <span>0 m/s</span>
                      <span>3 m/s</span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">应急操作</div>
                  <div className="card-body space-y-3">
                    <button
                      onClick={generateEvacuationPlan}
                      className="w-full btn-danger flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      生成疏散方案
                    </button>
                    <button
                      onClick={clearEvacuationPlan}
                      disabled={!evacuationPlan}
                      className="w-full btn-secondary"
                    >
                      重置方案
                    </button>
                  </div>
                </div>

                <SyncMessageLog messages={messages} />
              </div>
            </div>
          </>
        );

      case 'ships':
        return (
          <div className="card">
            <div className="card-header">船舶列表</div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ships.map(ship => (
                  <ShipStatusCard
                    key={ship.id}
                    ship={ship}
                    status={anchorStatuses.get(ship.id)}
                    onSimulate={simulateAnchorStability}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'anchorages':
        return (
          <div className="card">
            <div className="card-header">锚地列表</div>
            <div className="card-body">
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
            </div>
          </div>
        );

      case 'weather':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeatherControl weather={weather} onChange={setWeather} />
            <div className="card">
              <div className="card-header">海流参数</div>
              <div className="card-body">
                <div className="mb-2 flex justify-between items-center">
                  <label className="text-sm font-medium text-navy-700">流速</label>
                  <span className="text-sm font-semibold text-ocean-600">{currentSpeed.toFixed(2)} m/s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={currentSpeed}
                  onChange={(e) => handleCurrentSpeedChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-navy-100 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-navy-400 mt-1">
                  <span>0 m/s</span>
                  <span>3 m/s</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'typhoon':
        return (
          <div className="card border-risk-critical/30">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-risk-critical" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>台风应急中心</span>
              </div>
            </div>
            <div className="card-body">
              <div className="mb-6 p-4 bg-risk-critical/5 rounded-lg border border-risk-critical/20">
                <h3 className="font-semibold text-navy-800 mb-2">当前气象条件</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-navy-500">风速</p>
                    <p className="font-semibold text-navy-700">{weather.windSpeed.toFixed(1)} m/s</p>
                  </div>
                  <div>
                    <p className="text-navy-500">风向</p>
                    <p className="font-semibold text-navy-700">{weather.windDirection.toFixed(0)}°</p>
                  </div>
                  <div>
                    <p className="text-navy-500">浪高</p>
                    <p className="font-semibold text-navy-700">{weather.waveHeight.toFixed(1)} m</p>
                  </div>
                  <div>
                    <p className="text-navy-500">周期</p>
                    <p className="font-semibold text-navy-700">{weather.wavePeriod.toFixed(1)} s</p>
                  </div>
                </div>
              </div>

              {evacuationPlan ? (
                <EvacuationPlan
                  plan={evacuationPlan}
                  ships={ships}
                  anchorages={anchorages}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-navy-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-navy-800 mb-2">尚未生成疏散方案</h3>
                  <p className="text-navy-500 mb-6">点击下方按钮，根据当前气象条件和船舶状态生成最优疏散方案</p>
                  <button
                    onClick={generateEvacuationPlan}
                    className="btn-danger"
                  >
                    生成疏散方案
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'logs':
        return (
          <div className="card">
            <div className="card-header">语义同步消息日志</div>
            <div className="card-body">
              <SyncMessageLog messages={messages} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-navy-50">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />
      <div className="main-content">
        <TopNav title={getNavTitle()} />
        <main className="content-area">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return <AppContent />;
};

export default App;
