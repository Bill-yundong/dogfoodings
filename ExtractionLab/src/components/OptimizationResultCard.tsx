'use client';

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
} from './ui/Card';
import { ExtractionCurveChart } from './ExtractionCurveChart';
import { FlavorRadarChart } from './FlavorRadarChart';
import { cn, formatNumber } from '@/lib/utils';
import { BREWING_METHODS, REGIONS } from '@/lib/constants';
import type { OptimizationResult } from '@/types';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
} from 'lucide-react';

interface OptimizationResultCardProps {
  result: OptimizationResult;
  onApply?: (result: OptimizationResult) => void;
  onDiscard?: (result: OptimizationResult) => void;
  className?: string;
}

export function OptimizationResultCard({
  result,
  onApply,
  onDiscard,
  className,
}: OptimizationResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'curve' | 'flavor' | 'factors'>('overview');

  const { originalPreset, optimizedPreset, improvements, confidence, factors } = result;

  const methodInfo = BREWING_METHODS.find(m => m.value === optimizedPreset.method);
  const regionInfo = REGIONS.find(r => r.id === optimizedPreset.region);

  const overallImprovement = improvements.reduce((sum, imp) => sum + imp.changePercent, 0) / improvements.length;

  const getImpactIcon = (impact: 'positive' | 'negative' | 'neutral') => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 1) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < -1) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-coffee-50 to-amber-50">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{methodInfo?.icon}</span>
              <CardTitle className="text-xl">{optimizedPreset.name}</CardTitle>
              <Badge variant="info" size="sm">
                {optimizedPreset.version}
              </Badge>
            </div>
            <CardDescription>
              {methodInfo?.label} · {regionInfo?.name || '全球'} · 基于 {factors.length} 个因子优化
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-coffee-600">置信度</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {(confidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-white/70 rounded-xl p-3">
            <p className="text-xs text-coffee-500 mb-1">综合提升</p>
            <div className="flex items-center gap-1">
              {getChangeIcon(overallImprovement)}
              <span
                className={cn(
                  'text-lg font-bold',
                  overallImprovement > 1
                    ? 'text-green-600'
                    : overallImprovement < -1
                    ? 'text-red-600'
                    : 'text-coffee-600'
                )}
              >
                {overallImprovement > 0 ? '+' : ''}
                {overallImprovement.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="bg-white/70 rounded-xl p-3">
            <p className="text-xs text-coffee-500 mb-1">水温</p>
            <p className="text-lg font-bold text-coffee-900">
              {originalPreset.waterTemperature.toFixed(1)} → {optimizedPreset.waterTemperature.toFixed(1)}°C
            </p>
          </div>
          <div className="bg-white/70 rounded-xl p-3">
            <p className="text-xs text-coffee-500 mb-1">研磨度</p>
            <p className="text-lg font-bold text-coffee-900">
              {originalPreset.grindSize.toFixed(0)} → {optimizedPreset.grindSize.toFixed(0)} μm
            </p>
          </div>
          <div className="bg-white/70 rounded-xl p-3">
            <p className="text-xs text-coffee-500 mb-1">萃取时间</p>
            <p className="text-lg font-bold text-coffee-900">
              {originalPreset.brewTime.toFixed(0)} → {optimizedPreset.brewTime.toFixed(0)}s
            </p>
          </div>
        </div>
      </CardHeader>

      <div className="flex border-b border-coffee-100 px-6">
        {(['overview', 'curve', 'flavor', 'factors'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab
                ? 'border-coffee-600 text-coffee-800'
                : 'border-transparent text-coffee-500 hover:text-coffee-700'
            )}
          >
            {tab === 'overview' && '概览'}
            {tab === 'curve' && '萃取曲线'}
            {tab === 'flavor' && '风味分析'}
            {tab === 'factors' && '影响因子'}
          </button>
        ))}
      </div>

      <CardContent className="pt-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-coffee-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-coffee-600" />
              优化改进项
            </h4>
            <div className="grid gap-3">
              {improvements.map((imp, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-coffee-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        imp.category === 'flavor' && 'bg-pink-100',
                        imp.category === 'consistency' && 'bg-green-100',
                        imp.category === 'efficiency' && 'bg-blue-100',
                        imp.category === 'yield' && 'bg-amber-100'
                      )}
                    >
                      {getChangeIcon(imp.changePercent)}
                    </div>
                    <div>
                      <p className="font-medium text-coffee-900">{imp.metric}</p>
                      <p className="text-sm text-coffee-500">{imp.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-coffee-500">
                      {imp.before.toFixed(1)} → {imp.after.toFixed(1)}
                    </p>
                    <p
                      className={cn(
                        'text-lg font-bold',
                        imp.changePercent > 1
                          ? 'text-green-600'
                          : imp.changePercent < -1
                          ? 'text-red-600'
                          : 'text-coffee-600'
                      )}
                    >
                      {imp.changePercent > 0 ? '+' : ''}
                      {imp.changePercent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'curve' && (
          <div>
            <ExtractionCurveChart
              data={optimizedPreset.pressureProfile?.map(p => ({
                time: p.time,
                temperature: optimizedPreset.waterTemperature,
                pressure: p.pressure,
                flowRate: 2,
                weight: 0,
                tds: 0,
              })) || []}
              referenceData={originalPreset.pressureProfile?.map(p => ({
                time: p.time,
                temperature: originalPreset.waterTemperature,
                pressure: p.pressure,
                flowRate: 2,
                weight: 0,
                tds: 0,
              })) || []}
              preset={optimizedPreset}
              height={350}
            />
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-coffee-600 rounded" />
                <span className="text-coffee-600">优化后</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-coffee-400 rounded border-dashed" />
                <span className="text-coffee-500">优化前</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'flavor' && (
          <div className="grid md:grid-cols-2 gap-6">
            <FlavorRadarChart
              profiles={[
                { name: '优化后', profile: optimizedPreset.targetFlavor, color: '#8b6914' },
                { name: '优化前', profile: originalPreset.targetFlavor, color: '#d1d5db' },
              ]}
              tolerance={optimizedPreset.tolerance}
              targetProfile={originalPreset.targetFlavor}
              height={350}
              showDetails={false}
            />
            <div className="space-y-4">
              <h4 className="font-semibold text-coffee-900">参数对比</h4>
              <div className="space-y-3">
                {Object.entries(optimizedPreset.targetFlavor).map(([key, value]) => {
                  const original = originalPreset.targetFlavor[key as keyof typeof originalPreset.targetFlavor];
                  const diff = value - original;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-coffee-600 capitalize">{key}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-coffee-500">{original.toFixed(1)}</span>
                        <span className="text-coffee-400">→</span>
                        <span className="font-medium text-coffee-900">{value.toFixed(1)}</span>
                        <span
                          className={cn(
                            'text-sm font-medium px-2 py-0.5 rounded',
                            Math.abs(diff) < 0.3
                              ? 'bg-gray-100 text-gray-600'
                              : diff > 0
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          )}
                        >
                          {diff > 0 ? '+' : ''}
                          {diff.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'factors' && (
          <div>
            <h4 className="font-semibold text-coffee-900 mb-4">多因子权重分析</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {factors.map((factor, index) => (
                <div
                  key={index}
                  className="p-4 bg-gradient-to-br from-coffee-50 to-white rounded-xl border border-coffee-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-coffee-900">{factor.name}</span>
                    {getImpactIcon(factor.impact)}
                  </div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-2xl font-bold text-coffee-800">
                      {formatNumber(factor.value, factor.unit === '°C' ? 1 : 0)}
                    </span>
                    <span className="text-sm text-coffee-500 mb-1">{factor.unit}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-coffee-500 mb-1">
                    <span>权重</span>
                    <span>{(factor.weight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-coffee-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-coffee-400 to-coffee-600 rounded-full transition-all"
                      style={{ width: `${factor.weight * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-coffee-600 hover:text-coffee-800 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-5 h-5" />
              收起详情
            </>
          ) : (
            <>
              <ChevronDown className="w-5 h-5" />
              展开参数详情
            </>
          )}
        </button>
        <div className="flex gap-3">
          {onDiscard && (
            <Button variant="outline" size="sm" onClick={() => onDiscard(result)}>
              <X className="w-4 h-4 mr-2" />
              放弃
            </Button>
          )}
          {onApply && (
            <Button variant="primary" size="sm" onClick={() => onApply(result)}>
              <Check className="w-4 h-4 mr-2" />
              应用优化
            </Button>
          )}
        </div>
      </CardFooter>

      {expanded && (
        <div className="border-t border-coffee-100 p-6 bg-coffee-50/50">
          <h4 className="font-semibold text-coffee-900 mb-4">完整参数对比</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm text-coffee-500 mb-2">粉量</p>
              <p className="text-lg font-bold text-coffee-900">
                {originalPreset.dose.toFixed(1)}g → {optimizedPreset.dose.toFixed(1)}g
              </p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm text-coffee-500 mb-2">总水量</p>
              <p className="text-lg font-bold text-coffee-900">
                {originalPreset.totalWater.toFixed(0)}g → {optimizedPreset.totalWater.toFixed(0)}g
              </p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm text-coffee-500 mb-2">粉水比</p>
              <p className="text-lg font-bold text-coffee-900">
                1:{originalPreset.ratio.toFixed(1)} → 1:{optimizedPreset.ratio.toFixed(1)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm text-coffee-500 mb-2">目标 TDS</p>
              <p className="text-lg font-bold text-coffee-900">
                {originalPreset.targetTDS.toFixed(2)}% → {optimizedPreset.targetTDS.toFixed(2)}%
              </p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm text-coffee-500 mb-2">目标萃取率</p>
              <p className="text-lg font-bold text-coffee-900">
                {originalPreset.targetYield.toFixed(1)}% → {optimizedPreset.targetYield.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm text-coffee-500 mb-2">适用门店</p>
              <p className="text-lg font-bold text-coffee-900">
                {originalPreset.storeIds.length} → {optimizedPreset.storeIds.length} 家
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
