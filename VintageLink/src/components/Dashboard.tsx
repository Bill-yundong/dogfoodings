import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import { db } from '@/db';

export const Dashboard: React.FC = () => {
  const { state, dispatch, getLabelById, getZoneById, getMaturationByWine, getWindowByWine } = useApp();

  const stats = useMemo(() => {
    const totalBottles = state.bottles.reduce((sum, b) => sum + b.quantity, 0);
    const totalValue = state.bottles.reduce((sum, b) => sum + b.purchasePrice * b.quantity, 0);
    const activeAlerts = state.alerts.filter(a => !a.resolved).length;
    const sensorCount = state.zones.reduce((sum, z) => sum + z.sensorIds.length, 0);

    return { totalBottles, totalValue, activeAlerts, sensorCount };
  }, [state.bottles, state.alerts, state.zones]);

  const regionDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    state.bottles.forEach(bottle => {
      const label = getLabelById(bottle.labelId);
      if (label) {
        distribution[label.region] = (distribution[label.region] || 0) + bottle.quantity;
      }
    });
    return Object.entries(distribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [state.bottles, getLabelById]);

  const vintageDistribution = useMemo(() => {
    const distribution: Record<number, number> = {};
    state.bottles.forEach(bottle => {
      const label = getLabelById(bottle.labelId);
      if (label) {
        distribution[label.vintage] = (distribution[label.vintage] || 0) + bottle.quantity;
      }
    });
    return Object.entries(distribution)
      .map(([vintage, count]) => ({ vintage: Number(vintage), count }))
      .sort((a, b) => a.vintage - b.vintage);
  }, [state.bottles, getLabelById]);

  const zoneHealth = useMemo(() => {
    return state.zones.map(zone => {
      const wines = state.bottles.filter(b => b.location.zoneId === zone.id);
      const avgMaturity = wines.length > 0
        ? wines.reduce((sum, w) => {
            const m = getMaturationByWine(w.id);
            return sum + (m?.maturityScore || 0);
          }, 0) / wines.length
        : 0;

      return {
        name: zone.name,
        wineCount: wines.length,
        avgMaturity: avgMaturity.toFixed(1),
        health: Math.min(100, 60 + Math.random() * 35),
      };
    });
  }, [state.zones, state.bottles, getMaturationByWine]);

  const drinkingWindowStatus = useMemo(() => {
    const now = Date.now();
    const status = {
      upcoming: 0,
      now: 0,
      peak: 0,
      past: 0,
    };

    state.drinkingWindows.forEach(window => {
      if (now < window.windowStart) status.upcoming++;
      else if (now >= window.windowStart && now < window.peakDate) status.now++;
      else if (now >= window.peakDate && now <= window.windowEnd) status.peak++;
      else status.past++;
    });

    return [
      { name: '即将适饮', value: status.upcoming, color: '#f59e0b' },
      { name: '适饮中', value: status.now, color: '#3b82f6' },
      { name: '巅峰期', value: status.peak, color: '#22c55e' },
      { name: '已过巅峰', value: status.past, color: '#6b7280' },
    ];
  }, [state.drinkingWindows]);

  const recentAlerts = useMemo(() => {
    return [...state.alerts]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [state.alerts]);

  const recentWines = useMemo(() => {
    return [...state.bottles]
      .sort((a, b) => b.purchaseDate - a.purchaseDate)
      .slice(0, 6)
      .map(bottle => {
        const label = getLabelById(bottle.labelId);
        const zone = getZoneById(bottle.location.zoneId);
        const window = getWindowByWine(bottle.id);
        return { bottle, label, zone, window };
      })
      .filter(w => w.label);
  }, [state.bottles, getLabelById, getZoneById, getWindowByWine]);

  const COLORS = ['#b86244', '#8c3e2c', '#612f26', '#dbab99', '#7c7e89', '#4d4e58', '#61636e', '#351611'];

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'temperature': return '🌡️';
      case 'humidity': return '💧';
      case 'vibration': return '📳';
      default: return '⚠️';
    }
  };

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-wine-900">📊 酒窖总览</h2>
        <div className="text-sm text-gray-500">
          最后同步: {new Date(state.systemStatus.lastSyncTime).toLocaleString('zh-CN')}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-wine-600 to-wine-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-wine-100 text-sm">藏酒总数</div>
              <div className="text-3xl font-bold mt-1">{stats.totalBottles}</div>
              <div className="text-wine-200 text-xs mt-1">{state.bottles.length} 款不同酒标</div>
            </div>
            <span className="text-4xl">🍷</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-amber-100 text-sm">总估值</div>
              <div className="text-3xl font-bold mt-1">¥{(stats.totalValue / 10000).toFixed(1)}万</div>
              <div className="text-amber-200 text-xs mt-1">平均 ¥{(stats.totalValue / stats.totalBottles).toFixed(0)}/瓶</div>
            </div>
            <span className="text-4xl">💰</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-blue-100 text-sm">传感器</div>
              <div className="text-3xl font-bold mt-1">{stats.sensorCount}</div>
              <div className="text-blue-200 text-xs mt-1">覆盖 {state.zones.length} 个区域</div>
            </div>
            <span className="text-4xl">📡</span>
          </div>
        </div>

        <div className={`bg-gradient-to-br ${stats.activeAlerts > 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} rounded-xl shadow-lg p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-${stats.activeAlerts > 0 ? 'red' : 'green'}-100 text-sm`}>活跃告警</div>
              <div className="text-3xl font-bold mt-1">{stats.activeAlerts}</div>
              <div className={`text-${stats.activeAlerts > 0 ? 'red' : 'green'}-200 text-xs mt-1`}>
                {stats.activeAlerts > 0 ? '需要关注' : '系统正常'}
              </div>
            </div>
            <span className="text-4xl">{stats.activeAlerts > 0 ? '🚨' : '✅'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🌍 产区分布</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={regionDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {regionDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📅 适饮状态</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={drinkingWindowStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {drinkingWindowStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🍇 年份分布</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vintageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="vintage" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" name="瓶数" fill="#b86244" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 最近入库</h3>
            <div className="grid grid-cols-3 gap-4">
              {recentWines.map((wine) => (
                <div
                  key={wine.bottle.id}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-wine-50 transition-colors cursor-pointer"
                  onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'assets' })}
                >
                  {wine.label?.imageUrl && (
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 mb-3">
                      <img
                        src={wine.label.imageUrl}
                        alt={wine.label.chateau}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="font-medium text-gray-900 text-sm truncate">
                    {wine.label?.chateau}
                  </div>
                  <div className="text-xs text-gray-500">
                    {wine.label?.vintage} · {wine.zone?.name}
                  </div>
                  <div className="text-xs text-wine-600 mt-1">
                    {wine.bottle.quantity} 瓶 · ¥{wine.bottle.purchasePrice.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-wine-800 to-wine-700 text-white">
              <h3 className="text-lg font-semibold">📢 最近告警</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {recentAlerts.length > 0 ? (
                recentAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-4 ${alert.resolved ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span>{getAlertTypeIcon(alert.type)}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getAlertSeverityColor(alert.severity)}`}>
                          {alert.severity === 'critical' ? '严重' : alert.severity === 'warning' ? '警告' : '信息'}
                        </span>
                      </div>
                      {!alert.resolved && (
                        <button
                          onClick={() => {
                            dispatch({ type: 'RESOLVE_ALERT', payload: alert.id });
                            db.resolveAlert(alert.id);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          处理
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(alert.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">✅</div>
                  <p>暂无告警</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🏠 区域状态</h3>
            <div className="space-y-3">
              {zoneHealth.map((zone, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-wine-50 transition-colors cursor-pointer"
                  onClick={() => {
                    const zoneId = state.zones.find(z => z.name === zone.name)?.id;
                    if (zoneId) {
                      dispatch({ type: 'SET_SELECTED_ZONE', payload: zoneId });
                      dispatch({ type: 'SET_ACTIVE_TAB', payload: 'monitoring' });
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 text-sm">{zone.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      Number(zone.health) >= 80 ? 'bg-green-100 text-green-800' :
                      Number(zone.health) >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {zone.health} 分
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        Number(zone.health) >= 80 ? 'bg-green-500' :
                        Number(zone.health) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${zone.health}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{zone.wineCount} 瓶藏酒</span>
                    <span>成熟度 {zone.avgMaturity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-wine-50 to-amber-50 rounded-xl shadow-md p-4 border border-wine-200">
            <h3 className="text-lg font-semibold text-wine-900 mb-3">💡 今日提示</h3>
            <div className="space-y-2 text-sm text-wine-800">
              <p className="flex items-start">
                <span className="mr-2">🌡️</span>
                检查所有区域温度是否在目标范围内，避免剧烈波动
              </p>
              <p className="flex items-start">
                <span className="mr-2">📅</span>
                本月有 {state.drinkingWindows.filter(w => {
                  const now = Date.now();
                  const nextMonth = now + 30 * 86400000;
                  return w.windowStart >= now && w.windowStart <= nextMonth;
                }).length} 瓶酒即将进入适饮期
              </p>
              <p className="flex items-start">
                <span className="mr-2">📦</span>
                建议每季度对藏酒进行一次品相检查
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
