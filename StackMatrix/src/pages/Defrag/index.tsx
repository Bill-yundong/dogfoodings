import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Play, Pause, RefreshCw, TrendingUp, AlertTriangle, CheckCircle, Clock, Zap, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import useWMSStore from '../../store/useWMSStore';
import { Fragment } from '../../types';

function FragmentVisualization() {
  const { locations, fragments, selectedLocationId, setSelectedLocationId } = useWMSStore();
  const [selectedLevel, setSelectedLevel] = useState(1);

  const levelLocations = locations.filter(l => l.level === selectedLevel);
  const rows = Math.max(...levelLocations.map(l => l.row));
  const cols = Math.max(...levelLocations.map(l => l.col));

  const fragmentLocationIds = new Set(fragments.flatMap(f => f.locationIds));

  const getLocationStatus = (loc: typeof locations[0]) => {
    if (fragmentLocationIds.has(loc.id)) return 'fragment';
    return loc.status;
  };

  const getCellStyle = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-accent-green/70';
      case 'empty': return 'bg-surface-hover';
      case 'reserved': return 'bg-accent-amber/70';
      case 'defective': return 'bg-accent-red/70';
      case 'fragment': return 'bg-accent-purple/70 animate-pulse';
      default: return 'bg-surface-hover';
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
      <div className="p-4 border-b border-surface-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">碎片分布视图</h3>
          <p className="text-xs text-text-muted">紫色闪烁区域为检测到的空间碎片</p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(level => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                selectedLevel === level
                  ? 'bg-primary text-white'
                  : 'bg-background text-text-muted hover:text-text-primary'
              }`}
            >
              {level}F
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 overflow-auto">
        <div 
          className="grid gap-1 min-w-max mx-auto"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(24px, 32px))` }}
        >
          {Array.from({ length: rows }).map((_, rowIdx) => (
            Array.from({ length: cols }).map((_, colIdx) => {
              const location = levelLocations.find(
                l => l.row === rowIdx + 1 && l.col === colIdx + 1
              );
              if (!location) return <div key={`${rowIdx}-${colIdx}`} className="aspect-square" />;
              
              const status = getLocationStatus(location);
              const isSelected = selectedLocationId === location.id;
              
              return (
                <motion.div
                  key={location.id}
                  whileHover={{ scale: 1.2, zIndex: 10 }}
                  onClick={() => setSelectedLocationId(isSelected ? null : location.id)}
                  className={`aspect-square rounded cursor-pointer transition-all ${getCellStyle(status)} ${
                    isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                  }`}
                  title={location.id}
                />
              );
            })
          )).flat()}
        </div>
      </div>
      <div className="p-4 border-t border-surface-border flex justify-center gap-6 text-xs">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-accent-green/70" />
          已占用
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-surface-hover" />
          空闲
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-accent-purple/70" />
          碎片
        </span>
      </div>
    </div>
  );
}

function FragmentCard({ fragment, onExecute }: { fragment: Fragment; onExecute: () => void }) {
  const getRecConfig = (rec: string) => {
    switch (rec) {
      case 'merge': return { color: 'bg-accent-green', text: '合并', bg: 'bg-accent-green/10' };
      case 'relocate': return { color: 'bg-accent-amber', text: '迁移', bg: 'bg-accent-amber/10' };
      default: return { color: 'bg-text-muted', text: '保留', bg: 'bg-surface-hover' };
    }
  };

  const recConfig = getRecConfig(fragment.recommendation);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background rounded-lg p-4 border border-surface-border"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${recConfig.bg} flex items-center justify-center`}>
            <Database className={`w-5 h-5 ${recConfig.color.replace('bg-', 'text-')}`} />
          </div>
          <div>
            <p className="font-mono text-sm text-text-primary">{fragment.id}</p>
            <span className={`inline-block px-2 py-0.5 rounded text-xs ${recConfig.color} text-white`}>
              {recConfig.text}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-text-primary">{fragment.size}</p>
          <p className="text-xs text-text-muted">个货位</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">浪费评分</span>
          <span className={`font-mono ${
            fragment.wasteScore > 80 ? 'text-accent-red' :
            fragment.wasteScore > 50 ? 'text-accent-amber' : 'text-text-primary'
          }`}>
            {fragment.wasteScore.toFixed(0)}/100
          </span>
        </div>
        <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${
              fragment.wasteScore > 80 ? 'bg-accent-red' :
              fragment.wasteScore > 50 ? 'bg-accent-amber' : 'bg-primary'
            }`}
            style={{ width: `${fragment.wasteScore}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">潜在收益</span>
          <span className="text-accent-green font-mono">+{fragment.potentialGain.toFixed(1)} 单位</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {fragment.locationIds.slice(0, 5).map(id => (
          <span key={id} className="px-1.5 py-0.5 bg-surface rounded text-[10px] text-text-muted font-mono">
            {id}
          </span>
        ))}
        {fragment.locationIds.length > 5 && (
          <span className="px-1.5 py-0.5 bg-surface rounded text-[10px] text-text-muted">
            +{fragment.locationIds.length - 5}
          </span>
        )}
      </div>

      {fragment.recommendation !== 'keep' && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onExecute}
          className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary text-sm font-medium rounded-lg transition-colors"
        >
          执行整理
        </motion.button>
      )}
    </motion.div>
  );
}

export default function DefragPage() {
  const { fragments, locations, defragProgress, startDefrag, pauseDefrag, runDefragStep, refreshMetrics } = useWMSStore();
  const [autoRun, setAutoRun] = useState(false);

  const mergeCount = fragments.filter(f => f.recommendation === 'merge').length;
  const relocateCount = fragments.filter(f => f.recommendation === 'relocate').length;
  const keepCount = fragments.filter(f => f.recommendation === 'keep').length;

  const pieData = [
    { name: '合并', value: mergeCount, color: '#10B981' },
    { name: '迁移', value: relocateCount, color: '#F59E0B' },
    { name: '保留', value: keepCount, color: '#64748B' }
  ];

  const totalWaste = fragments.reduce((sum, f) => sum + f.wasteScore, 0);
  const avgWaste = fragments.length > 0 ? totalWaste / fragments.length : 0;
  const totalPotentialGain = fragments.reduce((sum, f) => sum + f.potentialGain, 0);

  useEffect(() => {
    if (!autoRun || !defragProgress.isRunning) return;

    const interval = setInterval(() => {
      runDefragStep();
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRun, defragProgress.isRunning, runDefragStep]);

  useEffect(() => {
    if (defragProgress.isRunning && defragProgress.currentStep >= defragProgress.totalSteps) {
      setAutoRun(false);
      refreshMetrics();
    }
  }, [defragProgress.isRunning, defragProgress.currentStep, defragProgress.totalSteps, refreshMetrics]);

  const handleStart = () => {
    startDefrag();
    setAutoRun(true);
  };

  const handlePause = () => {
    pauseDefrag();
    setAutoRun(false);
  };

  const progress = defragProgress.totalSteps > 0 
    ? (defragProgress.currentStep / defragProgress.totalSteps) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-surface-border p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-accent-purple/20 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <p className="text-text-muted text-sm">碎片总数</p>
              <p className="text-2xl font-bold text-text-primary font-mono">{fragments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-accent-red/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-accent-red" />
            </div>
            <div>
              <p className="text-text-muted text-sm">平均浪费</p>
              <p className="text-2xl font-bold text-text-primary font-mono">{avgWaste.toFixed(0)}%</p>
            </div>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-accent-green/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <p className="text-text-muted text-sm">潜在收益</p>
              <p className="text-2xl font-bold text-text-primary font-mono">{totalPotentialGain.toFixed(1)}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-text-muted text-sm">总货位数</p>
              <p className="text-2xl font-bold text-text-primary font-mono">{locations.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-text-primary">碎片整理引擎</h3>
            <p className="text-xs text-text-muted">异步空间碎片整理，优化货位利用率</p>
          </div>
          <div className="flex items-center gap-3">
            {defragProgress.isRunning ? (
              <button
                onClick={handlePause}
                className="px-4 py-2 bg-accent-amber hover:bg-accent-amber/80 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Pause className="w-4 h-4" />
                暂停整理
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4" />
                开始整理
              </button>
            )}
            <button
              onClick={refreshMetrics}
              className="p-2 bg-surface-hover hover:bg-surface text-text-primary rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-muted">整理进度</span>
              <span className="text-sm text-primary font-mono">
                {defragProgress.currentStep} / {defragProgress.totalSteps}
              </span>
            </div>
            <div className="h-3 bg-surface-hover rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-primary via-primary-light to-primary rounded-full transition-all duration-300"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-background rounded-lg p-4">
              <p className="text-xs text-text-muted mb-1">已处理碎片</p>
              <p className="text-xl font-bold text-accent-green font-mono">{defragProgress.fragmentsProcessed}</p>
            </div>
            <div className="bg-background rounded-lg p-4">
              <p className="text-xs text-text-muted mb-1">已回收空间</p>
              <p className="text-xl font-bold text-primary font-mono">{defragProgress.spaceRecovered.toFixed(1)}</p>
            </div>
            <div className="bg-background rounded-lg p-4">
              <p className="text-xs text-text-muted mb-1">运行状态</p>
              <p className={`text-xl font-bold font-mono ${
                defragProgress.isRunning ? 'text-accent-green' : 'text-text-muted'
              }`}>
                {defragProgress.isRunning ? '运行中' : '已停止'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FragmentVisualization />
        </div>

        <div className="space-y-4">
          <div className="bg-surface rounded-xl border border-surface-border p-4">
            <h3 className="font-semibold text-text-primary mb-4">碎片类型分布</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-surface-border p-4">
            <h3 className="font-semibold text-text-primary mb-4">整理策略</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent-green" />
                  <span className="text-sm text-text-primary">贪心合并算法</span>
                </div>
                <span className="text-xs text-text-muted">已启用</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent-green" />
                  <span className="text-sm text-text-primary">动态规划优化</span>
                </div>
                <span className="text-xs text-text-muted">已启用</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent-amber" />
                  <span className="text-sm text-text-primary">低峰期自动触发</span>
                </div>
                <span className="text-xs text-text-muted">02:00</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm text-text-primary">实时联动</span>
                </div>
                <span className="text-xs text-text-muted">已启用</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
        <div className="p-4 border-b border-surface-border">
          <h3 className="font-semibold text-text-primary">碎片详情列表</h3>
          <p className="text-xs text-text-muted">按浪费评分降序排列</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {fragments.slice(0, 12).map((fragment, index) => (
              <FragmentCard
                key={fragment.id}
                fragment={fragment}
                onExecute={() => {}}
              />
            ))}
          </div>
          {fragments.length > 12 && (
            <div className="mt-4 text-center">
              <button className="px-4 py-2 bg-surface-hover hover:bg-surface text-text-primary text-sm rounded-lg transition-colors">
                查看全部 {fragments.length} 个碎片
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
