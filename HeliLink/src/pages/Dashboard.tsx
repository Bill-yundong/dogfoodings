import { useEffect, useState } from 'react';
import { Card, Row, Col, Select, Button, Spin, Alert } from 'antd';
import { motion } from 'framer-motion';
import { RefreshCw, Wind, Waves, Eye, Thermometer, Gauge, Activity, MapPin } from 'lucide-react';
import dayjs from 'dayjs';
import { useWeatherStore } from '@/store/weatherStore';
import { useRouteStore } from '@/store/routeStore';
import { useSyncStore } from '@/store/syncStore';
import { useAlertStore } from '@/store/alertStore';
import { DataCard } from '@/components/DataCard';
import { GaugeMeter } from '@/components/GaugeMeter';
import { StatusBadge } from '@/components/StatusBadge';
import { WeatherChart } from '@/components/WeatherChart';
import { LandingWindowTimeline } from '@/components/LandingWindowTimeline';
import { SyncStatusPanel } from '@/components/SyncStatusPanel';
import { ThreeDMap } from '@/components/ThreeDMap';
import { SectionHeader } from '@/components/SectionHeader';

const { Option } = Select;

export default function Dashboard() {
  const {
    platforms,
    selectedPlatformId,
    currentWeather,
    weatherHistory,
    isLoading,
    selectPlatform,
    connectWebSocket,
    disconnectWebSocket,
  } = useWeatherStore();

  const {
    landingWindows,
    isCalculating,
    calculateLandingWindows,
  } = useRouteStore();

  const {
    syncStatus,
    isLoading: syncLoading,
    init: initSync,
    loadSyncStatus,
  } = useSyncStore();

  const { addAlert } = useAlertStore();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const selectedPlatform = platforms.find(p => p.id === selectedPlatformId);
  const weather = selectedPlatformId ? currentWeather[selectedPlatformId] : null;
  const history = selectedPlatformId ? weatherHistory[selectedPlatformId] || [] : [];

  useEffect(() => {
    connectWebSocket();
    initSync();

    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket, initSync]);

  useEffect(() => {
    if (selectedPlatform) {
      calculateLandingWindows(selectedPlatform);
    }
  }, [selectedPlatform, calculateLandingWindows]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadSyncStatus();
      if (weather && weather.dataQuality === 'critical') {
        addAlert({
          type: 'weather',
          severity: 'warning',
          title: `${selectedPlatform?.code}气象数据异常`,
          message: '检测到气象数据质量下降，请注意核实',
          platformId: selectedPlatformId,
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadSyncStatus, addAlert, weather, selectedPlatform, selectedPlatformId]);

  const handleRefresh = () => {
    if (selectedPlatform) {
      calculateLandingWindows(selectedPlatform);
    }
    loadSyncStatus();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (isLoading || syncLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-128px)]">
        <div className="flex flex-col items-center gap-4">
          <Spin size="large" />
          <span className="text-gray-400">正在加载监控数据...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">综合监控大屏</h1>
          <p className="text-gray-400 text-sm mt-1">
            实时监控气象数据、着陆窗口预测与系统同步状态
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">选择平台：</span>
            <Select
              value={selectedPlatformId}
              onChange={selectPlatform}
              className="w-56"
              style={{ background: '#1f2937' }}
            >
              {platforms.map(p => (
                <Option key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-[#1B998B]" />
                    <span>{p.name}</span>
                    <StatusBadge type="platform" value={p.status} />
                  </div>
                </Option>
              ))}
            </Select>
          </div>
          <Button
            type={autoRefresh ? 'primary' : 'default'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            icon={<Activity size={16} />}
            className={autoRefresh ? 'bg-[#1B998B] border-[#1B998B]' : ''}
          >
            {autoRefresh ? '自动刷新中' : '手动刷新'}
          </Button>
          <Button
            type="default"
            onClick={handleRefresh}
            icon={<RefreshCw size={16} className={isCalculating ? 'animate-spin' : ''} />}
          >
            刷新数据
          </Button>
        </div>
      </motion.div>

      {selectedPlatform?.status === 'emergency' && (
        <motion.div variants={itemVariants}>
          <Alert
            type="error"
            showIcon
            message="平台应急状态"
            description={`${selectedPlatform.name} 当前处于应急状态，请确保救援通道畅通，优先保障该平台的通航需求。`}
            className="bg-red-900/20 border-red-800/50"
          />
        </motion.div>
      )}

      {weather && (
        <motion.div variants={itemVariants}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <DataCard
                title="当前风速"
                value={`${weather.windSpeed} m/s`}
                trend={{
                  value: weather.windSpeed - 10,
                  isUp: weather.windSpeed > 15
                }}
                icon={<Wind size={20} className="text-blue-400" />}
                status={
                  weather.windSpeed > 20 ? 'danger' :
                  weather.windSpeed > 15 ? 'warning' : 'safe'
                }
                subtitle={`风向 ${weather.windDirection}°`}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <DataCard
                title="当前浪高"
                value={`${weather.waveHeight} m`}
                trend={{
                  value: weather.waveHeight - 1.5,
                  isUp: weather.waveHeight > 2.5
                }}
                icon={<Waves size={20} className="text-cyan-400" />}
                status={
                  weather.waveHeight > 4 ? 'danger' :
                  weather.waveHeight > 2.5 ? 'warning' : 'safe'
                }
                subtitle={`周期 ${weather.wavePeriod}s`}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <DataCard
                title="能见度"
                value={`${weather.visibility} km`}
                trend={{
                  value: weather.visibility - 5,
                  isUp: false
                }}
                icon={<Eye size={20} className="text-emerald-400" />}
                status={
                  weather.visibility < 2 ? 'danger' :
                  weather.visibility < 5 ? 'warning' : 'safe'
                }
                subtitle={`气压 ${weather.pressure}hPa`}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <DataCard
                title="温度"
                value={`${weather.temperature} °C`}
                trend={{
                  value: 0,
                  isUp: false
                }}
                icon={<Thermometer size={20} className="text-orange-400" />}
                status="safe"
                subtitle={
                  <span className="flex items-center gap-2">
                    数据质量
                    <StatusBadge type="quality" value={weather.dataQuality} />
                  </span>
                }
              />
            </Col>
          </Row>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={8}>
            <Card
              className="bg-[#0f141f] border-[#1f2937] rounded-xl"
              styles={{ body: { padding: '24px' } }}
            >
              <SectionHeader
                title="着陆可行性评分"
                subtitle="DWA算法实时解算"
                icon={<Gauge size={18} className="text-[#1B998B]" />}
              />
              <div className="flex items-center justify-center mt-6">
                <GaugeMeter
                  value={landingWindows.length > 0 ? landingWindows[0].feasibilityScore : 0}
                  max={100}
                  label="综合评分"
                  size="lg"
                />
              </div>
              {landingWindows.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">安全评分</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {landingWindows[0].safetyScore.toFixed(1)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">时效评分</div>
                    <div className="text-lg font-bold text-blue-400">
                      {landingWindows[0].timeScore.toFixed(1)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">油耗评分</div>
                    <div className="text-lg font-bold text-amber-400">
                      {landingWindows[0].fuelScore.toFixed(1)}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </Col>

          <Col xs={24} xl={16}>
            <Card
              className="bg-[#0f141f] border-[#1f2937] rounded-xl h-full"
              styles={{ body: { padding: '24px', height: '100%' } }}
            >
              <SectionHeader
                title="全球平台与海缆分布"
                subtitle="三维可视化监控"
                icon={<MapPin size={18} className="text-[#1B998B]" />}
              />
              <div className="h-[380px] mt-4 rounded-xl overflow-hidden">
                <ThreeDMap
                  selectedPlatformId={selectedPlatformId}
                  onSelectPlatform={selectPlatform}
                  landingWindows={landingWindows}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <Card
              className="bg-[#0f141f] border-[#1f2937] rounded-xl"
              styles={{ body: { padding: '24px' } }}
            >
              <SectionHeader
                title="气象趋势分析"
                subtitle={`最近6小时数据 - ${selectedPlatform?.code || ''}`}
                icon={<Activity size={18} className="text-[#1B998B]" />}
                actions={
                  <span className="text-xs text-gray-500">
                    更新时间: {weather ? dayjs(weather.timestamp).format('HH:mm:ss') : '--'}
                  </span>
                }
              />
              <div className="h-[280px] mt-4">
                <WeatherChart data={history} metric="windSpeed" />
              </div>
            </Card>
          </Col>

          <Col xs={24} xl={10}>
            <Card
              className="bg-[#0f141f] border-[#1f2937] rounded-xl"
              styles={{ body: { padding: '24px' } }}
            >
              <SectionHeader
                title="三端语义同步状态"
                subtitle="气象系统 · 机队指挥 · 平台终端"
                icon={<Activity size={18} className="text-[#1B998B]" />}
              />
              <div className="mt-4">
                <SyncStatusPanel statuses={syncStatus} />
              </div>
            </Card>
          </Col>
        </Row>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card
          className="bg-[#0f141f] border-[#1f2937] rounded-xl"
          styles={{ body: { padding: '24px' } }}
        >
          <SectionHeader
            title="最佳着陆窗口预测"
            subtitle={`基于DWA动态窗算法 - ${selectedPlatform?.code || ''}`}
            icon={<Gauge size={18} className="text-[#1B998B]" />}
            actions={
              isCalculating ? (
                <span className="text-xs text-[#1B998B] flex items-center gap-2">
                  <RefreshCw size={12} className="animate-spin" />
                  算法解算中...
                </span>
              ) : (
                <span className="text-xs text-gray-500">
                  共找到 {landingWindows.length} 个可行窗口
                </span>
              )
            }
          />
          <div className="mt-6">
            <LandingWindowTimeline windows={landingWindows} />
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
