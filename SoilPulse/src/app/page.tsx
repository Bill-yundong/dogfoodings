'use client';

import { useState, useEffect } from 'react';
import { SoilSample } from '@/types';
import { soilSampleStore } from '@/lib/IndexedDBStore';
import Dashboard from '@/components/Dashboard';
import SoilSamples from '@/components/SoilSamples';
import Simulation from '@/components/Simulation';
import Fertilization from '@/components/Fertilization';
import SupplyChain from '@/components/SupplyChain';

const navItems = [
  { id: 'dashboard', label: '数据概览', icon: '📊', description: '农田养分整体状况' },
  { id: 'samples', label: '土壤样本', icon: '🌱', description: '测土配方点管理' },
  { id: 'simulation', label: '根系模拟', icon: '🔬', description: '养分吸收过程模拟' },
  { id: 'fertilization', label: '施肥决策', icon: '💡', description: '智能配方优化' },
  { id: 'supplychain', label: '供应链', icon: '🚚', description: '农资采购协同' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [soilSamples, setSoilSamples] = useState<SoilSample[]>([]);
  const [selectedSample, setSelectedSample] = useState<SoilSample | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    loadSoilSamples();
    initDemoData();
  }, []);

  const loadSoilSamples = async () => {
    const samples = await soilSampleStore.getAll();
    setSoilSamples(samples);
    if (samples.length > 0 && !selectedSample) {
      setSelectedSample(samples[0]);
    }
    setIsLoading(false);
  };

  const initDemoData = async () => {
    const existingSamples = await soilSampleStore.count();
    if (existingSamples === 0) {
      const demoSamples: SoilSample[] = Array.from({ length: 50 }, (_, i) => ({
        id: `sample_demo_${i}`,
        location: {
          lat: 30 + Math.random() * 10,
          lng: 110 + Math.random() * 10,
          farmId: 'farm_demo_001',
          plotName: `地块 ${String.fromCharCode(65 + (i % 5))}${Math.floor(i / 5) + 1}`,
        },
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        pH: 5.5 + Math.random() * 3,
        organicMatter: 15 + Math.random() * 25,
        totalNitrogen: 50 + Math.random() * 100,
        availablePhosphorus: 10 + Math.random() * 40,
        availablePotassium: 80 + Math.random() * 120,
        moisture: 0.15 + Math.random() * 0.25,
        temperature: 15 + Math.random() * 15,
        bulkDensity: 1.2 + Math.random() * 0.4,
        cationExchangeCapacity: 10 + Math.random() * 15,
      }));

      for (const sample of demoSamples) {
        await soilSampleStore.add(sample);
      }
      await loadSoilSamples();
    }
  };

  const getStats = () => {
    if (soilSamples.length === 0) {
      return { avgPh: 0, avgOm: 0, avgN: 0, avgP: 0, avgK: 0, healthCount: { good: 0, medium: 0, poor: 0 } };
    }

    const avgPh = soilSamples.reduce((sum, s) => sum + s.pH, 0) / soilSamples.length;
    const avgOm = soilSamples.reduce((sum, s) => sum + s.organicMatter, 0) / soilSamples.length;
    const avgN = soilSamples.reduce((sum, s) => sum + s.totalNitrogen, 0) / soilSamples.length;
    const avgP = soilSamples.reduce((sum, s) => sum + s.availablePhosphorus, 0) / soilSamples.length;
    const avgK = soilSamples.reduce((sum, s) => sum + s.availablePotassium, 0) / soilSamples.length;

    const healthCount = {
      good: soilSamples.filter(s => s.pH >= 6 && s.pH <= 7.5).length,
      medium: soilSamples.filter(s => (s.pH >= 5.5 && s.pH < 6) || (s.pH > 7.5 && s.pH <= 8)).length,
      poor: soilSamples.filter(s => s.pH < 5.5 || s.pH > 8).length,
    };

    return { avgPh, avgOm, avgN, avgP, avgK, healthCount };
  };

  const stats = getStats();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard stats={stats} soilSamples={soilSamples} />;
      case 'samples':
        return <SoilSamples soilSamples={soilSamples} selectedSample={selectedSample} setSelectedSample={setSelectedSample} />;
      case 'simulation':
        return <Simulation selectedSample={selectedSample} />;
      case 'fertilization':
        return <Fertilization selectedSample={selectedSample} />;
      case 'supplychain':
        return <SupplyChain />;
      default:
        return <Dashboard stats={stats} soilSamples={soilSamples} />;
    }
  };

  const activeNav = navItems.find(n => n.id === activeTab);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🌱</div>
          <p className="text-slate-600 text-lg">正在加载 SoilPulse 系统...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300 shadow-sm`}>
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-crop-400 to-crop-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-xl">🌱</span>
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-bold text-slate-800">SoilPulse</h1>
                <p className="text-xs text-slate-500">农田养分智能监控</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 py-4">
          <div className="px-3 mb-2">
            {!sidebarCollapsed && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">功能模块</p>}
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-all rounded-lg mx-3 mb-1 ${
                activeTab === item.id
                  ? 'bg-crop-50 text-crop-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {!sidebarCollapsed && (
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
              管
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">管理员</p>
                <p className="text-xs text-slate-400">admin@soilpulse.com</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">{activeNav?.label}</h2>
              <p className="text-sm text-slate-500">{activeNav?.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="status-dot status-success animate-pulse"></span>
                <span className="text-slate-600">系统运行正常</span>
              </div>
              <div className="h-6 w-px bg-slate-200"></div>
              <div className="text-sm text-slate-600">
                样本总数: <span className="font-semibold text-slate-800">{soilSamples.length}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
