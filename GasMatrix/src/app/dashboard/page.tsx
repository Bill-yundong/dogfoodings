'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Activity,
  Gauge,
  Wind,
  Database,
  AlertTriangle,
  MapPin,
  Clock,
} from 'lucide-react';
import Layout from '@/components/Layout';
import DataCard from '@/components/DataCard';
import AlertList from '@/components/AlertList';
import StationList from '@/components/StationList';
import { useGasMatrixStore } from '@/store';
import { useWebSocket } from '@/lib/websocket';
import { formatPressure, formatTime, formatTimestamp } from '@/utils';
import ReactECharts from 'echarts-for-react';

const MapComponent = dynamic(() => import('@/components/PressureMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-dark-500">
        <MapPin className="w-12 h-12 mx-auto mb-2 animate-pulse" />
        <p>加载地图中...</p>
      </div>
    </div>
  ),
});

export default function DashboardPage() {
  const {
    stations,
    pressureData,
    flowData,
    alerts,
    lastUpdate,
    totalStorage,
    isConnected,
    updatePressureData,
    addAlert,
    setConnected,
    calculateTotalStorage,
    getUnacknowledgedAlerts,
  } = useGasMatrixStore();

  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [pressureHistory, setPressureHistory] = useState<{ time: string; value: number }[]>([]);

  useEffect(() => {
    const unsubscribe = useWebSocket((message) => {
      if (message.type === 'pressure_update' && message.payload.stationId) {
        updatePressureData(message.payload);
        
        setPressureHistory((prev) => {
          const newHistory = [
            ...prev,
            {
              time: formatTime(message.timestamp),
              value: message.payload.pressure,
            },
          ];
          return newHistory.slice(-50);
        });
      } else if (message.type === 'alert') {
        addAlert(message.payload);
      } else if (message.payload.connected === true) {
        setConnected(true);
      }
    });

    return unsubscribe;
  }, [updatePressureData, addAlert, setConnected]);

  useEffect(() => {
    calculateTotalStorage();
  }, [pressureData, calculateTotalStorage]);

  const avgPressure =
    Object.values(pressureData).reduce((a, b) => a + b, 0) / Object.values(pressureData).length || 0;
  const totalFlow = Object.values(flowData).reduce((a, b) => a + b, 0);
  const abnormalStations = stations.filter((s) => s.status === 'warning' || s.status === 'danger').length;
  const unacknowledgedAlerts = getUnacknowledgedAlerts();

  const pressureChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(16, 42, 67, 0.9)',
      borderColor: '#334e68',
      textStyle: { color: '#d9e2ec' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: pressureHistory.map((d) => d.time),
      axisLine: { lineStyle: { color: '#334e68' } },
      axisLabel: { color: '#829ab1', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#334e68' } },
      axisLabel: {
        color: '#829ab1',
        fontSize: 10,
        formatter: (value: number) => (value / 1000).toFixed(0) + 'k',
      },
      splitLine: { lineStyle: { color: '#243b53' } },
    },
    series: [
      {
        name: '平均压力',
        type: 'line',
        smooth: true,
        symbol: 'none',
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 212, 255, 0.3)' },
              { offset: 1, color: 'rgba(0, 212, 255, 0)' },
            ],
          },
        },
        lineStyle: { color: '#00D4FF', width: 2 },
        data: pressureHistory.map((d) => d.value),
      },
    ],
  };

  const stationsByStatus = {
    online: stations.filter((s) => s.status === 'online').length,
    warning: stations.filter((s) => s.status === 'warning').length,
    danger: stations.filter((s) => s.status === 'danger').length,
    offline: stations.filter((s) => s.status === 'offline').length,
  };

  const statusChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(16, 42, 67, 0.9)',
      borderColor: '#334e68',
      textStyle: { color: '#d9e2ec' },
    },
    legend: {
      orient: 'horizontal',
      bottom: '5%',
      textStyle: { color: '#829ab1', fontSize: 10 },
    },
    series: [
      {
        name: '站点状态',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '40%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#0A1628',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold', color: '#d9e2ec' },
        },
        data: [
          { value: stationsByStatus.online, name: '正常', itemStyle: { color: '#00E676' } },
          { value: stationsByStatus.warning, name: '预警', itemStyle: { color: '#FF8A00' } },
          { value: stationsByStatus.danger, name: '告警', itemStyle: { color: '#F5222D' } },
          { value: stationsByStatus.offline, name: '离线', itemStyle: { color: '#486581' } },
        ],
      },
    ],
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-100">实时监控大屏</h1>
            <p className="text-sm text-dark-400 flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4" />
              最后更新：{formatTimestamp(lastUpdate)}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-800 text-sm">
            <span className={isConnected ? 'status-online' : 'status-offline'} />
            <span className={isConnected ? 'text-success-400' : 'text-dark-400'}>
              {isConnected ? '实时连接' : '连接断开'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DataCard
            title="平均压力"
            value={formatPressure(avgPressure, 'kPa').replace(' kPa', '')}
            unit="kPa"
            icon={Gauge}
            trend={{ value: 2.3, isPositive: true }}
          />
          <DataCard
            title="总供气流量"
            value={(totalFlow * 3600 / 1000).toFixed(1)}
            unit="km³/h"
            icon={Wind}
            trend={{ value: 5.7, isPositive: true }}
          />
          <DataCard
            title="管网管存"
            value={(totalStorage / 1000).toFixed(1)}
            unit="t"
            icon={Database}
          />
          <DataCard
            title="异常站点"
            value={abnormalStations}
            unit="个"
            icon={AlertTriangle}
            status={abnormalStations > 0 ? 'warning' : 'normal'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6 h-[500px]">
            <h3 className="section-title">
              <Activity className="w-5 h-5 text-primary-400" />
              全网压力分布
            </h3>
            <MapComponent
              stations={stations}
              pressureData={pressureData}
              selectedStationId={selectedStation}
              onStationSelect={setSelectedStation}
            />
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="section-title">
                <Gauge className="w-5 h-5 text-primary-400" />
                压力趋势
              </h3>
              <div className="h-[200px]">
                <ReactECharts option={pressureChartOption} style={{ height: '100%' }} />
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="section-title">
                <MapPin className="w-5 h-5 text-primary-400" />
                站点状态分布
              </h3>
              <div className="h-[200px]">
                <ReactECharts option={statusChartOption} style={{ height: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="section-title">
              <AlertTriangle className="w-5 h-5 text-warning-400" />
              实时告警
              {unacknowledgedAlerts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-danger-500/20 text-danger-400 rounded-full">
                  {unacknowledgedAlerts.length} 条未确认
                </span>
              )}
            </h3>
            <AlertList alerts={alerts} maxItems={5} />
          </div>

          <div className="glass-card p-6">
            <h3 className="section-title">
              <MapPin className="w-5 h-5 text-primary-400" />
              调压站状态
            </h3>
            <StationList
              stations={stations}
              selectedStationId={selectedStation || undefined}
              onStationClick={(station) => setSelectedStation(station.id)}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
