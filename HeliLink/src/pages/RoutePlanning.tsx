import { useEffect, useState } from 'react';
import { Card, Row, Col, Select, Slider, Button, Form, Table, Tag, Space, Divider, message } from 'antd';
import { motion } from 'framer-motion';
import { Route, RefreshCw, Settings, Zap, MapPin, Clock, Fuel, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { useWeatherStore } from '@/store/weatherStore';
import { useRouteStore } from '@/store/routeStore';
import { defaultDWAParams } from '@/types';
import type { RoutePlan } from '@/types';
import { SectionHeader } from '@/components/SectionHeader';
import { DataCard } from '@/components/DataCard';
import { StatusBadge } from '@/components/StatusBadge';
import { ThreeDMap } from '@/components/ThreeDMap';

const { Option } = Select;

export default function RoutePlanning() {
  const { platforms, selectedPlatformId, selectPlatform } = useWeatherStore();
  const {
    dwaParams,
    routePlans,
    selectedRouteId,
    originPlatformId,
    destinationPlatformId,
    isPlanning,
    isCalculating,
    setDWAParams,
    setOrigin,
    setDestination,
    planRoutes,
    selectRoute,
    calculateLandingWindows,
    reset,
    landingWindows,
  } = useRouteStore();

  const [form] = Form.useForm();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const originPlatform = platforms.find(p => p.id === originPlatformId);
  const destinationPlatform = platforms.find(p => p.id === destinationPlatformId);
  const selectedRoute = routePlans.find(r => r.id === selectedRouteId);

  useEffect(() => {
    form.setFieldsValue({
      safetyWeight: dwaParams.safetyWeight * 100,
      timeWeight: dwaParams.timeWeight * 100,
      fuelWeight: dwaParams.fuelWeight * 100,
      windowSize: dwaParams.windowSize,
      predictionHorizon: dwaParams.predictionHorizon,
      minLandingDuration: dwaParams.minLandingDuration,
      maxWindSpeed: dwaParams.maxWindSpeed,
      maxWaveHeight: dwaParams.maxWaveHeight,
    });
  }, [dwaParams, form]);

  const handleParamsChange = (changedValues: Record<string, number>) => {
    const normalized: Record<string, number> = {};

    Object.entries(changedValues).forEach(([key, value]) => {
      if (['safetyWeight', 'timeWeight', 'fuelWeight'].includes(key)) {
        normalized[key] = value / 100;
      } else {
        normalized[key] = value;
      }
    });

    if (changedValues.safetyWeight !== undefined || changedValues.timeWeight !== undefined || changedValues.fuelWeight !== undefined) {
      const safety = form.getFieldValue('safetyWeight') / 100;
      const time = form.getFieldValue('timeWeight') / 100;
      const fuel = form.getFieldValue('fuelWeight') / 100;
      const total = safety + time + fuel;

      if (Math.abs(total - 1) > 0.01) {
        normalized.safetyWeight = safety / total;
        normalized.timeWeight = time / total;
        normalized.fuelWeight = fuel / total;
        form.setFieldsValue({
          safetyWeight: Math.round(normalized.safetyWeight * 100),
          timeWeight: Math.round(normalized.timeWeight * 100),
          fuelWeight: Math.round(normalized.fuelWeight * 100),
        });
        message.info('权重已自动归一化，总和保持为100%');
      }
    }

    setDWAParams(normalized);
  };

  const handlePlanRoutes = async () => {
    if (!originPlatformId || !destinationPlatformId) {
      message.error('请选择起点和终点平台');
      return;
    }

    if (originPlatformId === destinationPlatformId) {
      message.error('起点和终点不能相同');
      return;
    }

    await planRoutes();

    if (destinationPlatform) {
      await calculateLandingWindows(destinationPlatform);
    }

    message.success('航线规划完成');
  };

  const handleReset = () => {
    reset();
    form.setFieldsValue({
      safetyWeight: defaultDWAParams.safetyWeight * 100,
      timeWeight: defaultDWAParams.timeWeight * 100,
      fuelWeight: defaultDWAParams.fuelWeight * 100,
      windowSize: defaultDWAParams.windowSize,
      predictionHorizon: defaultDWAParams.predictionHorizon,
      minLandingDuration: defaultDWAParams.minLandingDuration,
      maxWindSpeed: defaultDWAParams.maxWindSpeed,
      maxWaveHeight: defaultDWAParams.maxWaveHeight,
    });
    message.info('已重置为默认参数');
  };

  const columns = [
    {
      title: '航线名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: RoutePlan) => (
        <div className="flex items-center gap-2">
          <Route size={16} className={record.isRecommended ? 'text-[#1B998B]' : 'text-gray-500'} />
          <span className={record.isRecommended ? 'text-white font-medium' : 'text-gray-300'}>
            {text}
          </span>
          {record.isRecommended && (
            <Tag color="green" icon={<CheckCircle size={12} />}>
              推荐
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '距离',
      dataIndex: 'distance',
      key: 'distance',
      render: (val: number) => `${val.toFixed(1)} km`,
    },
    {
      title: '预计时间',
      dataIndex: 'estimatedTime',
      key: 'estimatedTime',
      render: (val: number) => {
        const hours = Math.floor(val / 60);
        const mins = val % 60;
        return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
      },
    },
    {
      title: '油耗',
      dataIndex: 'fuelConsumption',
      key: 'fuelConsumption',
      render: (val: number) => `${val.toFixed(0)} L`,
    },
    {
      title: '风险评分',
      dataIndex: 'riskScore',
      key: 'riskScore',
      render: (val: number) => {
        const risk = val > 70 ? 'safe' : val > 40 ? 'caution' : 'danger';
        return <StatusBadge type="risk" value={`${val.toFixed(1)}`} />;
      },
    },
    {
      title: '避开障碍物',
      dataIndex: 'obstacles',
      key: 'obstacles',
      render: (val: string[]) => (
        <Space size={4}>
          {val.length > 0 ? val.map((obs, idx) => (
            <Tag key={idx} color="orange">
              {obs}
            </Tag>
          )) : <span className="text-gray-500">无</span>}
        </Space>
      ),
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">航线规划</h1>
            <p className="text-gray-400 text-sm mt-1">
              基于DWA动态窗算法的多目标优化航线规划
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleReset} icon={<RefreshCw size={16} />}>
              重置参数
            </Button>
            <Button
              type="primary"
              onClick={handlePlanRoutes}
              loading={isPlanning}
              icon={<Zap size={16} />}
              className="bg-[#1B998B] border-[#1B998B]"
            >
              {isPlanning ? '规划中...' : '开始规划'}
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card
          className="bg-[#0f141f] border-[#1f2937] rounded-xl"
          styles={{ body: { padding: '24px' } }}
        >
          <SectionHeader
            title="航线设置"
            subtitle="选择起点和终点平台"
            icon={<Route size={18} className="text-[#1B998B]" />}
          />
          <div className="flex flex-wrap items-end gap-6 mt-6">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-400 mb-2">起点平台</label>
              <Select
                value={originPlatformId}
                onChange={setOrigin}
                className="w-full"
                size="large"
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

            <div className="pb-2">
              <ArrowRight size={24} className="text-[#1B998B]" />
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-400 mb-2">终点平台</label>
              <Select
                value={destinationPlatformId}
                onChange={setDestination}
                className="w-full"
                size="large"
                style={{ background: '#1f2937' }}
              >
                {platforms.map(p => (
                  <Option key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[#F46036]" />
                      <span>{p.name}</span>
                      <StatusBadge type="platform" value={p.status} />
                    </div>
                  </Option>
                ))}
              </Select>
            </div>
          </div>

          {originPlatform && destinationPlatform && (
            <div className="mt-6 p-4 bg-[#1f2937]/50 rounded-lg">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="text-gray-500 text-sm">航线方向：</span>
                  <span className="text-white ml-2">
                    {originPlatform.code} → {destinationPlatform.code}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">终点最大风速限制：</span>
                  <span className="text-white ml-2">{destinationPlatform.maxWindSpeed} m/s</span>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">终点最大浪高限制：</span>
                  <span className="text-white ml-2">{destinationPlatform.maxWaveHeight} m</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card
          className="bg-[#0f141f] border-[#1f2937] rounded-xl"
          styles={{ body: { padding: '24px' } }}
        >
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <SectionHeader
              title="DWA算法参数配置"
              subtitle="调整多目标优化权重"
              icon={<Settings size={18} className="text-[#1B998B]" />}
            />
            <Button type="text" className="text-[#1B998B]">
              {showAdvanced ? '收起' : '展开'}高级参数
            </Button>
          </div>

          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleParamsChange}
            className="mt-6"
          >
            <Row gutter={[24, 16]}>
              <Col xs={24} md={8}>
                <Form.Item
                  label={
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-emerald-400" />
                      <span className="text-gray-300">安全权重 ({(dwaParams.safetyWeight * 100).toFixed(0)}%)</span>
                    </div>
                  }
                  name="safetyWeight"
                >
                  <Slider min={10} max={80} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label={
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-blue-400" />
                      <span className="text-gray-300">时效权重 ({(dwaParams.timeWeight * 100).toFixed(0)}%)</span>
                    </div>
                  }
                  name="timeWeight"
                >
                  <Slider min={10} max={60} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label={
                    <div className="flex items-center gap-2">
                      <Fuel size={14} className="text-amber-400" />
                      <span className="text-gray-300">油耗权重 ({(dwaParams.fuelWeight * 100).toFixed(0)}%)</span>
                    </div>
                  }
                  name="fuelWeight"
                >
                  <Slider min={5} max={40} />
                </Form.Item>
              </Col>
            </Row>

            {showAdvanced && (
              <>
                <Divider className="border-[#1f2937] my-6" />
                <Row gutter={[24, 16]}>
                  <Col xs={24} sm={12} lg={6}>
                    <Form.Item
                      label={<span className="text-gray-300">窗口大小 (分钟)</span>}
                      name="windowSize"
                    >
                      <Slider min={5} max={60} step={5} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Form.Item
                      label={<span className="text-gray-300">预测范围 (小时)</span>}
                      name="predictionHorizon"
                    >
                      <Slider min={6} max={48} step={1} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Form.Item
                      label={<span className="text-gray-300">最小着陆时长 (分钟)</span>}
                      name="minLandingDuration"
                    >
                      <Slider min={5} max={30} step={1} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Form.Item
                      label={<span className="text-gray-300">最大风速 (m/s)</span>}
                      name="maxWindSpeed"
                    >
                      <Slider min={10} max={30} step={1} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={[24, 16]}>
                  <Col xs={24} sm={12} lg={6}>
                    <Form.Item
                      label={<span className="text-gray-300">最大浪高 (m)</span>}
                      name="maxWaveHeight"
                    >
                      <Slider min={2} max={6} step={0.5} />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            )}
          </Form>
        </Card>
      </motion.div>

      {routePlans.length > 0 && (
        <>
          <motion.div variants={itemVariants}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <DataCard
                  title="最短距离"
                  value={`${Math.min(...routePlans.map(r => r.distance)).toFixed(1)} km`}
                  icon={<Route size={20} className="text-blue-400" />}
                  status="safe"
                />
              </Col>
              <Col xs={24} sm={8}>
                <DataCard
                  title="最快时间"
                  value={(() => {
                    const min = Math.min(...routePlans.map(r => r.estimatedTime));
                    const hours = Math.floor(min / 60);
                    const mins = min % 60;
                    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
                  })()}
                  icon={<Clock size={20} className="text-emerald-400" />}
                  status="safe"
                />
              </Col>
              <Col xs={24} sm={8}>
                <DataCard
                  title="最低风险"
                  value={`${Math.max(...routePlans.map(r => r.riskScore)).toFixed(1)}`}
                  icon={<Shield size={20} className="text-amber-400" />}
                  status="safe"
                />
              </Col>
            </Row>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card
              className="bg-[#0f141f] border-[#1f2937] rounded-xl"
              styles={{ body: { padding: '24px' } }}
            >
              <SectionHeader
                title="航线方案对比"
                subtitle="点击选择查看详情"
                icon={<Route size={18} className="text-[#1B998B]" />}
              />
              <div className="mt-4">
                <Table
                  dataSource={routePlans}
                  columns={columns}
                  rowKey="id"
                  rowSelection={{
                    type: 'radio',
                    selectedRowKeys: selectedRouteId ? [selectedRouteId] : [],
                    onChange: (keys) => selectRoute(keys[0] as string || null),
                  }}
                  onRow={(record) => ({
                    onClick: () => selectRoute(record.id),
                    className: 'cursor-pointer hover:bg-[#1f2937]/50',
                  })}
                  pagination={false}
                  className="route-table"
                />
              </div>
            </Card>
          </motion.div>

          {selectedRoute && (
            <motion.div variants={itemVariants}>
              <Card
                className="bg-[#0f141f] border-[#1f2937] rounded-xl"
                styles={{ body: { padding: '24px' } }}
              >
                <SectionHeader
                  title={`航线详情 - ${selectedRoute.name}`}
                  subtitle={selectedRoute.isRecommended ? '系统推荐航线' : '备选航线'}
                  icon={<Route size={18} className="text-[#1B998B]" />}
                />
                <div className="h-[400px] mt-4 rounded-xl overflow-hidden">
                  <ThreeDMap
                    selectedPlatformId={selectedRoute.destination}
                    onSelectPlatform={selectPlatform}
                    highlightRoute={selectedRoute}
                    landingWindows={landingWindows}
                  />
                </div>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-[#1f2937]/50 rounded-lg text-center">
                    <div className="text-gray-500 text-xs mb-1">总距离</div>
                    <div className="text-xl font-bold text-white">{selectedRoute.distance.toFixed(1)} km</div>
                  </div>
                  <div className="p-4 bg-[#1f2937]/50 rounded-lg text-center">
                    <div className="text-gray-500 text-xs mb-1">预计时间</div>
                    <div className="text-xl font-bold text-white">
                      {Math.floor(selectedRoute.estimatedTime / 60)}h {selectedRoute.estimatedTime % 60}min
                    </div>
                  </div>
                  <div className="p-4 bg-[#1f2937]/50 rounded-lg text-center">
                    <div className="text-gray-500 text-xs mb-1">预计油耗</div>
                    <div className="text-xl font-bold text-white">{selectedRoute.fuelConsumption.toFixed(0)} L</div>
                  </div>
                  <div className="p-4 bg-[#1f2937]/50 rounded-lg text-center">
                    <div className="text-gray-500 text-xs mb-1">风险评分</div>
                    <div className="text-xl font-bold text-emerald-400">{selectedRoute.riskScore.toFixed(1)}</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
