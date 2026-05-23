'use client';

import React from 'react';
import { ShoppingBag, TrendingUp, Users, Clock, DollarSign, Star, AlertTriangle, BarChart3, PieChart } from 'lucide-react';
import type { SimulationMetrics } from '@/types';

interface RetailPanelProps {
  metrics: SimulationMetrics | null;
}

export const RetailPanel: React.FC<RetailPanelProps> = ({ metrics }) => {
  const zoneDensities = metrics?.zoneDensities || {};
  const avgWaitTime = metrics?.avgWaitTime || {};
  const bottlenecks = metrics?.bottlenecks || [];

  const shops = [
    { id: 'shop_luxury_1', name: '奢侈品店 A', type: '奢侈品', visitors: 45, revenue: 12800, attractiveness: 0.8, dwellTime: 180 },
    { id: 'shop_luxury_2', name: '奢侈品店 B', type: '奢侈品', visitors: 38, revenue: 9600, attractiveness: 0.7, dwellTime: 150 },
    { id: 'shop_dutyfree_1', name: '免税烟酒', type: '免税', visitors: 120, revenue: 25600, attractiveness: 0.9, dwellTime: 90 },
    { id: 'shop_dutyfree_2', name: '免税化妆品', type: '免税', visitors: 95, revenue: 18500, attractiveness: 0.85, dwellTime: 120 },
    { id: 'shop_food_1', name: '美食广场', type: '餐饮', visitors: 180, revenue: 15200, attractiveness: 0.75, dwellTime: 240 },
    { id: 'shop_books', name: '书店', type: '文化', visitors: 32, revenue: 3200, attractiveness: 0.4, dwellTime: 180 },
  ];

  const retailBottlenecks = bottlenecks.filter(b =>
    b.includes('shop') || b.includes('retail') || b === 'zone_retail'
  );

  const categoryStats = [
    { name: '奢侈品', revenue: 22400, percentage: 28, color: '#7c4dff' },
    { name: '免税品', revenue: 44100, percentage: 55, color: '#00d4ff' },
    { name: '餐饮', revenue: 15200, percentage: 19, color: '#ff6e40' },
    { name: '文化', revenue: 3200, percentage: 4, color: '#00e676' },
  ];

  const totalRevenue = categoryStats.reduce((s, c) => s + c.revenue, 0);
  const totalVisitors = shops.reduce((s, c) => s + c.visitors, 0);
  const avgDwellTime = Math.floor(shops.reduce((s, c) => s + c.dwellTime, 0) / shops.length);
  const conversionRate = Math.floor((totalVisitors / (metrics?.activePassengers || 500)) * 100);

  return (
    <div className="h-full flex flex-col gap-4 p-6 overflow-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-retail-pink/20 rounded-lg">
          <ShoppingBag className="w-6 h-6 text-retail-pink" />
        </div>
        <div>
          <h1 className="text-2xl font-display text-cyber-blue">免税零售</h1>
          <p className="text-sm text-gray-400">商业热力图 · 消费行为分析 · 业态优化</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="预估营收"
          value={`¥${(totalRevenue / 1000).toFixed(1)}K`}
          color="retail-pink"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="进店客流"
          value={totalVisitors.toString()}
          color="cyber-blue"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="平均停留"
          value={`${avgDwellTime}s`}
          color="biz-purple"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="转化率"
          value={`${conversionRate}%`}
          color="safe-green"
        />
      </div>

      {retailBottlenecks.length > 0 && (
        <div className="bg-alert-amber/10 border border-alert-amber/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-alert-amber mb-2">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <span className="font-mono font-bold">商业预警</span>
          </div>
          <p className="text-sm text-alert-amber/80">
            免税烟酒区域客流过于集中，建议引导分流至其他业态
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-cyber-blue text-sm font-mono flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              业态营收分布
            </h3>
          </div>
          <div className="space-y-3">
            {categoryStats.map((cat) => (
              <div key={cat.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400">{cat.name}</span>
                  <span className="text-xs font-mono" style={{ color: cat.color }}>
                    ¥{(cat.revenue / 1000).toFixed(1)}K ({cat.percentage}%)
                  </span>
                </div>
                <div className="h-3 bg-deep-space rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.percentage * 1.5}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-cyber-blue text-sm font-mono flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              商业区热力分布
            </h3>
          </div>
          <div className="relative h-40 bg-deep-space-dark/50 rounded-lg overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-5 grid-rows-4 gap-px p-2">
              {Array.from({ length: 20 }).map((_, i) => {
                const intensity = Math.random();
                return (
                  <div
                    key={i}
                    className="rounded-sm transition-all"
                    style={{
                      backgroundColor: intensity > 0.7
                        ? `rgba(255, 64, 129, ${0.3 + intensity * 0.5})`
                        : intensity > 0.4
                        ? `rgba(0, 212, 255, ${0.2 + intensity * 0.4})`
                        : `rgba(0, 230, 118, ${0.1 + intensity * 0.3})`,
                    }}
                  />
                );
              })}
            </div>
            <div className="absolute bottom-2 right-2 flex gap-1 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-safe-green/50" />
                <span className="text-gray-500">低</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-cyber-blue/50" />
                <span className="text-gray-500">中</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-retail-pink/50" />
                <span className="text-gray-500">高</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
        <h3 className="text-cyber-blue text-sm font-mono mb-4">商铺运营详情</h3>
        <div className="space-y-3">
          {shops.map((shop) => {
            const popularity = shop.attractiveness * 100;
            const isHighPerforming = shop.revenue / shop.visitors > 150;
            const needsAttention = popularity < 50;
            return (
              <div
                key={shop.id}
                className={`bg-deep-space-dark/50 rounded-lg p-3 border transition-all ${
                  needsAttention ? 'border-alert-amber/30' : 'border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isHighPerforming ? 'bg-safe-green/20' : 'bg-biz-purple/20'
                    }`}>
                      <ShoppingBag className={`w-5 h-5 ${isHighPerforming ? 'text-safe-green' : 'text-biz-purple'}`} />
                    </div>
                    <div>
                      <div className="text-sm font-mono text-cyber-blue">{shop.name}</div>
                      <div className="text-xs text-gray-500">{shop.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-retail-pink">¥{shop.revenue.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{shop.visitors} 人次</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">吸引力指数</div>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 h-2 bg-deep-space rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${popularity}%`,
                            backgroundColor: popularity > 70 ? '#00e676' : popularity > 50 ? '#00d4ff' : '#ffb300',
                          }}
                        />
                      </div>
                      <Star className={`w-3 h-3 ${popularity > 70 ? 'text-safe-green' : 'text-gray-500'}`} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">平均停留</div>
                    <div className="text-xs font-mono text-cyber-blue">{shop.dwellTime}s</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1">客单价</div>
                    <div className="text-xs font-mono text-safe-green">¥{Math.floor(shop.revenue / shop.visitors)}</div>
                  </div>
                </div>
                {needsAttention && (
                  <div className="mt-2 pt-2 border-t border-alert-amber/20 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-alert-amber" />
                    <span className="text-[10px] text-alert-amber">吸引力较低，建议优化陈列或开展促销</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
        <h3 className="text-cyber-blue text-sm font-mono mb-3">业态优化建议</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-start gap-2">
            <span className="text-safe-green">✓</span>
            <span>免税烟酒区域吸引力最高 (90%)，建议扩大经营面积 20%</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-retail-pink">$</span>
            <span>奢侈品店客单价最高 (¥284)，可引入更多高端品牌</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-alert-amber">!</span>
            <span>书店吸引力偏低 (40%)，建议转型为复合式文创咖啡厅</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-cyber-blue">i</span>
            <span>餐饮区域停留时间最长 (240s)，可增设充电设施延长驻留</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-biz-purple">⚡</span>
            <span>预计优化后整体营收可提升 15-20%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <div className={`bg-deep-space-light/50 rounded-lg p-4 border border-${color}/20`}>
    <div className={`text-${color} mb-2`}>{icon}</div>
    <div className="text-xs text-gray-400 mb-1">{label}</div>
    <div className={`text-2xl font-mono font-bold text-${color}`}>{value}</div>
  </div>
);
