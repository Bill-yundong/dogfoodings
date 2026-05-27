'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { LineChartCard, BarChartCard } from '@/components/charts/ChartCards';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useBatteryStore } from '@/store/useBatteryStore';
import { useEnergyStore } from '@/store/useEnergyStore';
import { BarChart3, TrendingUp, Calendar, Download, Filter, PlaneTakeoff, Zap, Battery, Clock, DollarSign } from 'lucide-react';
import { cn, formatDateTime } from '@/utils/format';

export default function ReportsPage() {
  const { flights, runways, aircraft } = useDashboardStore();
  const { batteries, snapshots } = useBatteryStore();
  const { gridSignals, chargeSessions } = useEnergyStore();
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedReport, setSelectedReport] = useState('efficiency');
  const [isExporting, setIsExporting] = useState(false);

  const efficiencyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      time: `${i + 1}日`,
      起降架次: 80 + Math.floor(Math.random() * 40),
  准点率: 85 + Math.random() * 15,
  能源效率: 75 + Math.random() * 20,
    }));
  }, []);

  const hourlyData = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      time: `${String(i).padStart(2, '0')}:00`,
      起飞: Math.floor(2 + Math.random() * 5),
      降落: Math.floor(2 + Math.random() * 5),
    }));
  }, []);

  const batteryHealthData = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      time: `${90 - i * 5}-${95 - i * 5}%`,
      数量: batteries.filter(b => {
        const soh = Math.max(0.7, 1 - b.cycleCount * 0.0001) * 100;
        return soh >= (90 - i * 5) && soh < (95 - i * 5);
      }).length,
    })).reverse();
  }, [batteries]);

  const energyCostData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      time: `${i + 1}日`,
      充电成本: 2000 + Math.random() * 1500,
      V2G收益: 500 + Math.random() * 1000,
      净成本: 1000 + Math.random() * 1000,
    }));
  }, []);

  const kpiSummary = useMemo(() => {
    const totalFlights = flights.length;
    const onTimeFlights = flights.filter(f => !f.delayMinutes || f.delayMinutes === 0).length;
    const onTimeRate = totalFlights > 0 ? (onTimeFlights / totalFlights) * 100 : 0;
    const avgDelay = flights.filter(f => f.delayMinutes && f.delayMinutes > 0)
      .reduce((sum, f) => sum + (f.delayMinutes || 0), 0) / Math.max(1, flights.filter(f => f.delayMinutes && f.delayMinutes > 0).length);
    
    const totalEnergy = chargeSessions.reduce((sum, s) => sum + Math.abs(s.energyCharged), 0);
    const totalCost = chargeSessions.reduce((sum, s) => sum + s.cost, 0);
    const avgSOH = batteries.length > 0 
      ? batteries.reduce((sum, b) => sum + Math.max(0.7, 1 - b.cycleCount * 0.0001), 0) / batteries.length 
      : 0;

    return { totalFlights, onTimeRate, avgDelay, totalEnergy, totalCost, avgSOH };
  }, [flights, chargeSessions, batteries]);

  const handleExportReport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const reportData = {
        reportType: selectedReport,
        period: selectedPeriod,
        generatedAt: formatDateTime(new Date()),
        kpis: {
          totalFlights: kpiSummary.totalFlights,
          onTimeRate: `${kpiSummary.onTimeRate.toFixed(1)}%`,
          avgDelay: `${kpiSummary.avgDelay.toFixed(1)}分钟`,
          totalEnergy: `${(kpiSummary.totalEnergy / 1000).toFixed(2)} MWh`,
          totalCost: `${(kpiSummary.totalCost / 1000).toFixed(1)} K元`,
          avgSOH: `${(kpiSummary.avgSOH * 100).toFixed(1)}%`,
        },
        flights: flights.slice(0, 50).map(f => ({
          flightNumber: f.flightNumber,
          origin: f.origin,
          destination: f.destination,
          status: f.status,
          delayMinutes: f.delayMinutes || 0,
          scheduledDeparture: formatDateTime(f.scheduledDeparture),
        })),
        batteries: batteries.slice(0, 20).map(b => ({
          serialNumber: b.serialNumber,
          chemistry: b.chemistry,
          cycleCount: b.cycleCount,
          nominalCapacity: b.nominalCapacity,
          currentCapacity: b.currentCapacity,
          status: b.status,
          soh: `${(Math.max(0.7, 1 - b.cycleCount * 0.0001) * 100).toFixed(1)}%`,
        })),
        energy: {
          totalChargeSessions: chargeSessions.length,
          totalEnergyCharged: `${(kpiSummary.totalEnergy / 1000).toFixed(2)} MWh`,
          totalCost: `${(kpiSummary.totalCost / 1000).toFixed(1)} K元`,
        },
      };

      const jsonStr = JSON.stringify(reportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `vertipulset-report-${selectedReport}-${formatDateTime(new Date()).replace(/[:\s]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">分析报告</h1>
          <p className="text-sm text-metal-gray">运行效率分析与预测性报告</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            className="input-field w-40 text-sm"
          >
            <option value="efficiency">运行效率报告</option>
            <option value="battery">电池健康报告</option>
            <option value="energy">能源成本报告</option>
            <option value="predictive">预测性分析</option>
          </select>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input-field w-32 text-sm"
          >
            <option value="24h">最近24小时</option>
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
            <option value="90d">最近90天</option>
          </select>
          <button 
            onClick={handleExportReport} 
            disabled={isExporting}
            className="btn-primary flex items-center gap-2"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isExporting ? '导出中...' : '导出报告'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <StatCard
          label="总起降架次"
          value={kpiSummary.totalFlights}
          unit="架"
          trend={8.5}
          icon={<PlaneTakeoff className="w-5 h-5" />}
        />
        <StatCard
          label="航班准点率"
          value={kpiSummary.onTimeRate.toFixed(1)}
          unit="%"
          trend={2.3}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="平均延误"
          value={kpiSummary.avgDelay.toFixed(1)}
          unit="分钟"
          trend={-15.2}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="总能耗"
          value={(kpiSummary.totalEnergy / 1000).toFixed(2)}
          unit="MWh"
          trend={-5.8}
          icon={<Zap className="w-5 h-5" />}
        />
        <StatCard
          label="能源成本"
          value={(kpiSummary.totalCost / 1000).toFixed(1)}
          unit="K元"
          trend={-3.2}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          label="平均电池SOH"
          value={(kpiSummary.avgSOH * 100).toFixed(1)}
          unit="%"
          icon={<Battery className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          {selectedReport === 'efficiency' && (
            <>
              <LineChartCard
                title="运行效率趋势"
                data={efficiencyData}
                lines={[
                  { key: '起降架次', color: '#00D4FF', name: '起降架次', area: true },
                  { key: '准点率', color: '#00FF94', name: '准点率 (%)' },
                  { key: '能源效率', color: '#7C3AED', name: '能源效率 (%)' },
                ]}
                height={300}
              />
              <LineChartCard
                title="24小时起降分布"
                data={hourlyData}
                lines={[
                  { key: '起飞', color: '#00D4FF', name: '起飞', area: true },
                  { key: '降落', color: '#00FF94', name: '降落', area: true },
                ]}
                height={250}
              />
            </>
          )}

          {selectedReport === 'battery' && (
            <>
              <Card title="电池健康分布" icon={<Battery className="w-4 h-4" />}>
                <BarChartCard
                  title=""
                  data={batteryHealthData}
                  bars={[
                    { key: '数量', color: '#00D4FF', name: '电池数量' },
                  ]}
                  height={300}
                  className="!p-0"
                />
              </Card>
              <Card title="电池衰减分析" className="glow">
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass-card p-4 text-center">
                    <p className="text-3xl font-bold text-electric-blue font-display">
                      {batteries.filter(b => b.status === 'healthy').length}
                    </p>
                    <p className="text-sm text-metal-gray mt-1">健康电池</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-3xl font-bold text-alert-orange font-display">
                      {batteries.filter(b => b.status === 'degrading').length}
                    </p>
                    <p className="text-sm text-metal-gray mt-1">衰减中电池</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-3xl font-bold text-red-500 font-display">
                      {batteries.filter(b => b.status === 'replace').length}
                    </p>
                    <p className="text-sm text-metal-gray mt-1">需更换电池</p>
                  </div>
                </div>
                <div className="mt-6 p-4 glass-card">
                  <h4 className="text-sm font-medium text-white mb-3">预测性维护建议</h4>
                  <div className="space-y-2">
                    {batteries.filter(b => b.status === 'degrading').slice(0, 3).map((battery) => (
                      <div key={battery.id} className="flex items-center justify-between py-2 border-b border-electric-blue/10 last:border-0">
                        <div>
                          <p className="text-sm text-white font-display">{battery.serialNumber}</p>
                          <p className="text-xs text-metal-gray">循环次数: {battery.cycleCount}</p>
                        </div>
                        <span className="text-xs text-alert-orange">建议: 增加检测频率</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </>
          )}

          {selectedReport === 'energy' && (
            <>
              <LineChartCard
                title="能源成本分析"
                data={energyCostData}
                lines={[
                  { key: '充电成本', color: '#FF6B35', name: '充电成本 (元)', area: true },
                  { key: 'V2G收益', color: '#00FF94', name: 'V2G收益 (元)', area: true },
                  { key: '净成本', color: '#00D4FF', name: '净成本 (元)' },
                ]}
                height={300}
              />
              <Card title="能源结构分析" className="glow">
                <div className="grid grid-cols-4 gap-4">
                  <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-electric-blue font-display">68%</p>
                    <p className="text-xs text-metal-gray mt-1">电网供电</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-status-green font-display">22%</p>
                    <p className="text-xs text-metal-gray mt-1">可再生能源</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-tech-purple font-display">10%</p>
                    <p className="text-xs text-metal-gray mt-1">V2G 回馈</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-alert-orange font-display">¥0.62</p>
                    <p className="text-xs text-metal-gray mt-1">平均电价</p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {selectedReport === 'predictive' && (
            <Card title="预测性分析" icon={<TrendingUp className="w-4 h-4" />} className="glow">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-white mb-4">未来7天客流量预测</h4>
                  <LineChartCard
                    title=""
                    data={Array.from({ length: 7 }, (_, i) => ({
                      time: `D+${i + 1}`,
                      预测值: 150 + Math.sin(i) * 30 + Math.random() * 20,
                      置信上限: 180 + Math.sin(i) * 30,
                      置信下限: 120 + Math.sin(i) * 30,
                    }))}
                    lines={[
                      { key: '预测值', color: '#00D4FF', name: '预测客流量', area: true },
                      { key: '置信上限', color: 'rgba(0, 255, 148, 0.5)', name: '置信上限' },
                      { key: '置信下限', color: 'rgba(255, 107, 53, 0.5)', name: '置信下限' },
                    ]}
                    height={200}
                    className="!p-0"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white mb-4">资源需求预测</h4>
                  <div className="space-y-4">
                    <div className="glass-card p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white">跑道容量需求</span>
                        <span className="text-electric-blue font-medium">+15%</span>
                      </div>
                      <p className="text-xs text-metal-gray">预计周末高峰时段需要增加临时跑道</p>
                    </div>
                    <div className="glass-card p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white">充电设施负载</span>
                        <span className="text-alert-orange font-medium">+25%</span>
                      </div>
                      <p className="text-xs text-metal-gray">建议调整充电计划，平衡电网负荷</p>
                    </div>
                    <div className="glass-card p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white">人力资源需求</span>
                        <span className="text-status-green font-medium">充足</span>
                      </div>
                      <p className="text-xs text-metal-gray">当前排班可满足预计需求</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="col-span-4 space-y-6">
          <Card title="关键指标" icon={<BarChart3 className="w-4 h-4" />}>
            <div className="space-y-4">
              <div className="glass-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white">跑道利用率</span>
                  <span className="text-electric-blue font-medium">78.5%</span>
                </div>
                <div className="h-2 bg-space-dark rounded-full overflow-hidden">
                  <div className="h-full bg-electric-blue rounded-full" style={{ width: '78.5%' }}></div>
                </div>
                <p className="text-xs text-status-green mt-2">↑ 较上周提升 5.2%</p>
              </div>
              <div className="glass-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white">平均过站时间</span>
                  <span className="text-tech-purple font-medium">12.3分钟</span>
                </div>
                <div className="h-2 bg-space-dark rounded-full overflow-hidden">
                  <div className="h-full bg-tech-purple rounded-full" style={{ width: '61%' }}></div>
                </div>
                <p className="text-xs text-status-green mt-2">↓ 较上周缩短 1.8分钟</p>
              </div>
              <div className="glass-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white">单位能耗</span>
                  <span className="text-alert-orange font-medium">1.8 kWh/架次</span>
                </div>
                <div className="h-2 bg-space-dark rounded-full overflow-hidden">
                  <div className="h-full bg-alert-orange rounded-full" style={{ width: '72%' }}></div>
                </div>
                <p className="text-xs text-metal-gray mt-2">与上周持平</p>
              </div>
              <div className="glass-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white">电池可用率</span>
                  <span className="text-status-green font-medium">94.2%</span>
                </div>
                <div className="h-2 bg-space-dark rounded-full overflow-hidden">
                  <div className="h-full bg-status-green rounded-full" style={{ width: '94.2%' }}></div>
                </div>
                <p className="text-xs text-status-green mt-2">↑ 较上周提升 1.1%</p>
              </div>
            </div>
          </Card>

          <Card title="报告模板" icon={<Calendar className="w-4 h-4" />}>
            <div className="space-y-2">
              {[
                { name: '每日运行简报', desc: '每日0点自动生成' },
                { name: '周效率分析', desc: '每周一0点自动生成' },
                { name: '月度运营报告', desc: '每月1日0点自动生成' },
                { name: '季度预测报告', desc: '每季度首月1日生成' },
              ].map((report, i) => (
                <div key={i} className="glass-card p-3 hover:border-electric-blue/30 cursor-pointer transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">{report.name}</p>
                      <p className="text-xs text-metal-gray">{report.desc}</p>
                    </div>
                    <Download className="w-4 h-4 text-metal-gray hover:text-electric-blue transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
