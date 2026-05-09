import React, { useState, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Space,
  Slider,
  Select,
  Table,
  Modal,
  message,
  Switch,
  Divider,
  Statistic,
  Timeline,
  Progress
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  FireOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  CloudServerOutlined,
  CameraOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import useTunnelStore from '../store/tunnelStore';

const TUNNEL_ZONES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'];

const { Option } = Select;

const formatLogTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour12: false });
};

const FireControlSystem = () => {
  const {
    isRunning,
    isInitialized,
    simulationSpeed,
    ventilation,
    environment,
    zoneData,
    logs,
    validationResults,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    setSimulationSpeed,
    triggerFire,
    extinguishFire,
    setSuppressionLevel,
    setVentilationMode,
    createSnapshot,
    addLog
  } = useTunnelStore();

  const [selectedZone, setSelectedZone] = useState('C1');
  const [modalVisible, setModalVisible] = useState(false);
  const [processingFire, setProcessingFire] = useState(false);

  const activeFireZones = environment.fireZones?.filter(f => f.stage !== 'extinguished') || [];

  const handleTriggerFire = useCallback(async () => {
    if (!selectedZone) {
      message.warning('请先选择区域');
      return;
    }
    
    const hasActiveFire = activeFireZones.some(f => f.id.includes(selectedZone));
    if (hasActiveFire) {
      message.warning('该区域已有活跃火灾');
      return;
    }
    
    setModalVisible(true);
  }, [selectedZone, activeFireZones]);

  const confirmTriggerFire = useCallback(async () => {
    setProcessingFire(true);
    setModalVisible(false);
    
    try {
      await triggerFire(selectedZone);
      message.success(`区域 ${selectedZone} 火灾模拟已启动`);
    } catch (error) {
      message.error('启动火灾模拟失败');
    } finally {
      setProcessingFire(false);
    }
  }, [selectedZone, triggerFire]);

  const handleExtinguishFire = useCallback(async (zone) => {
    try {
      await extinguishFire(zone);
      message.success(`区域 ${zone} 灭火程序已启动`);
    } catch (error) {
      message.error('启动灭火程序失败');
    }
  }, [extinguishFire]);

  const handleCreateSnapshot = useCallback(async () => {
    try {
      const snapshot = await createSnapshot('manual');
      message.success(`快照已创建: ${snapshot.snapshotId}`);
    } catch (error) {
      message.error('创建快照失败');
    }
  }, [createSnapshot]);

  const handleVentilationModeChange = useCallback((mode) => {
    setVentilationMode(mode);
    message.info(`通风模式已切换为: ${mode}`);
  }, [setVentilationMode]);

  const handleSuppressionChange = useCallback((value) => {
    setSuppressionLevel(value / 100);
  }, [setSuppressionLevel]);

  const ventilationModeOptions = [
    { value: 'auto', label: '自动模式', color: 'blue' },
    { value: 'manual', label: '手动模式', color: 'gold' },
    { value: 'emergency', label: '紧急模式', color: 'red' }
  ];

  const logColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 100,
      render: (val) => <span style={{ color: '#1890ff' }}>{formatLogTime(val)}</span>
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (val) => {
        const colorMap = {
          fire: 'red',
          warning: 'gold',
          error: 'red',
          system: 'blue',
          control: 'green',
          ventilation: 'cyan'
        };
        return <Tag color={colorMap[val] || 'default'}>{val}</Tag>;
      }
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (val) => <span style={{ color: '#ccc' }}>{val}</span>
    }
  ];

  const zoneChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 21, 41, 0.9)',
      borderColor: '#1890ff'
    },
    legend: {
      data: ['烟雾浓度', '通风流量'],
      textStyle: { color: '#fff' },
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: TUNNEL_ZONES,
      axisLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#999' }
    },
    yAxis: [
      {
        type: 'value',
        name: '烟雾(%)',
        max: 100,
        axisLine: { lineStyle: { color: '#ff4d4f' } },
        axisLabel: { color: '#999' },
        splitLine: { lineStyle: { color: '#222' } }
      },
      {
        type: 'value',
        name: '流量',
        max: 250,
        axisLine: { lineStyle: { color: '#1890ff' } },
        axisLabel: { color: '#999' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '烟雾浓度',
        type: 'bar',
        data: TUNNEL_ZONES.map(z => Math.round((zoneData[z]?.smokeDensity || 0) * 100)),
        itemStyle: { color: '#ff4d4f' }
      },
      {
        name: '通风流量',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: TUNNEL_ZONES.map(z => Math.round(zoneData[z]?.ventilationFlow || 0)),
        lineStyle: { color: '#1890ff', width: 2 },
        symbol: 'circle',
        symbolSize: 6
      }
    ]
  };

  const fireZonesTableData = activeFireZones.map(fire => ({
    key: fire.id,
    zone: fire.id.replace('FIRE-', ''),
    stage: fire.stage,
    intensity: fire.intensity,
    smoke: fire.smokeDensity,
    temperature: fire.temperature,
    duration: fire.duration
  }));

  const fireTableColumns = [
    {
      title: '区域',
      dataIndex: 'zone',
      key: 'zone',
      render: (val) => <Tag color="red"><FireOutlined /> {val}</Tag>
    },
    {
      title: '阶段',
      dataIndex: 'stage',
      key: 'stage',
      render: (val) => {
        const stageMap = {
          ignition: { text: '引燃', color: 'gold' },
          growth: { text: '发展', color: 'orange' },
          full_development: { text: '全面发展', color: 'red' },
          decay: { text: '衰减', color: 'cyan' }
        };
        const stage = stageMap[val] || { text: val, color: 'default' };
        return <Tag color={stage.color}>{stage.text}</Tag>;
      }
    },
    {
      title: '强度',
      dataIndex: 'intensity',
      key: 'intensity',
      render: (val) => (
        <Progress 
          percent={Math.round(val * 100)} 
          size="small"
          strokeColor="#ff4d4f"
        />
      )
    },
    {
      title: '温度',
      dataIndex: 'temperature',
      key: 'temperature',
      render: (val) => <span style={{ color: '#ff4d4f' }}>{Math.round(val)}°C</span>
    },
    {
      title: '持续时间',
      dataIndex: 'duration',
      key: 'duration',
      render: (val) => <span style={{ color: '#1890ff' }}>{Math.round(val)}s</span>
    },
    {
      title: '操作',
      dataIndex: 'zone',
      key: 'action',
      render: (zone) => (
        <Button 
          type="primary" 
          danger 
          size="small"
          icon={<SafetyCertificateOutlined />}
          onClick={() => handleExtinguishFire(zone)}
        >
          灭火
        </Button>
      )
    }
  ];

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      <Card 
        style={{ 
          background: 'rgba(0,21,41,0.95)',
          borderColor: '#333',
          marginBottom: 16
        }}
        bodyStyle={{ padding: '16px' }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <Button
                type={isRunning ? 'default' : 'primary'}
                icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                size="large"
                onClick={isRunning ? pauseSimulation : startSimulation}
                disabled={!isInitialized}
              >
                {isRunning ? '暂停' : '开始'}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                size="large"
                onClick={resetSimulation}
              >
                重置
              </Button>
              <Space>
                <span style={{ color: '#999' }}>模拟速度:</span>
                <Select
                  value={simulationSpeed}
                  onChange={setSimulationSpeed}
                  style={{ width: 100 }}
                >
                  <Option value={0.5}>0.5x</Option>
                  <Option value={1}>1x</Option>
                  <Option value={2}>2x</Option>
                  <Option value={5}>5x</Option>
                </Select>
              </Space>
            </Space>
          </Col>
          <Col>
            <Space size="large">
              <Tag color={isInitialized ? 'green' : 'red'}>
                {isInitialized ? '系统就绪' : '初始化中'}
              </Tag>
              <Tag icon={<FireOutlined />} color={activeFireZones.length > 0 ? 'red' : 'green'}>
                活跃火灾: {activeFireZones.length}
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card 
            title={<span style={{ color: '#fff' }}><ThunderboltOutlined /> 消防联动控制</span>}
            style={{ background: 'rgba(0,21,41,0.9)', borderColor: '#ff4d4f' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <div style={{ color: '#999', marginBottom: 8 }}>火灾模拟</div>
                <Space>
                  <Select
                    value={selectedZone}
                    onChange={setSelectedZone}
                    style={{ width: 120 }}
                  >
                    {TUNNEL_ZONES.map(z => (
                      <Option key={z} value={z}>
                        {z} 区
                      </Option>
                    ))}
                  </Select>
                  <Button
                    type="primary"
                    danger
                    icon={<FireOutlined />}
                    onClick={handleTriggerFire}
                    loading={processingFire}
                  >
                    触发火灾
                  </Button>
                  <Button
                    icon={<DatabaseOutlined />}
                    onClick={handleCreateSnapshot}
                  >
                    创建快照
                  </Button>
                </Space>
              </div>

              <Divider style={{ borderColor: '#333', margin: '8px 0' }} />

              <div>
                <div style={{ color: '#999', marginBottom: 8 }}>灭火系统控制</div>
                <div style={{ maxWidth: 400 }}>
                  <Space.Compact style={{ width: '100%' }}>
                    <span style={{ color: '#fff', padding: '4px 8px' }}>灭火强度:</span>
                    <Slider
                      min={0}
                      max={100}
                      value={environment.suppressionLevel * 100}
                      onChange={handleSuppressionChange}
                      style={{ flex: 1, marginLeft: 8 }}
                    />
                    <span style={{ color: '#52c41a', width: 50, textAlign: 'right' }}>
                      {Math.round(environment.suppressionLevel * 100)}%
                    </span>
                  </Space.Compact>
                </div>
              </div>

              <Divider style={{ borderColor: '#333', margin: '8px 0' }} />

              <div>
                <div style={{ color: '#999', marginBottom: 8 }}>通风系统模式</div>
                <Space>
                  {ventilationModeOptions.map(opt => (
                    <Button
                      key={opt.value}
                      type={ventilation?.mode === opt.value ? 'primary' : 'default'}
                      icon={<CloudServerOutlined />}
                      onClick={() => handleVentilationModeChange(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </Space>
              </div>
            </Space>
          </Card>

          {activeFireZones.length > 0 && (
            <Card 
              title={<span style={{ color: '#fff' }}><FireOutlined /> 活跃火灾监控</span>}
              style={{ 
                background: 'rgba(255,77,79,0.05)', 
                borderColor: '#ff4d4f',
                marginTop: 16 
              }}
            >
              <Table
                columns={fireTableColumns}
                dataSource={fireZonesTableData}
                pagination={false}
                size="small"
                rowKey="key"
              />
            </Card>
          )}

          <Card 
            title={<span style={{ color: '#fff' }}>分区数据映射</span>}
            style={{ background: 'rgba(0,21,41,0.9)', borderColor: '#333', marginTop: 16 }}
          >
            <ReactECharts 
              option={zoneChartOption} 
              style={{ height: 300 }}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card 
            title={<span style={{ color: '#fff' }}><CameraOutlined /> 系统状态</span>}
            style={{ background: 'rgba(0,21,41,0.9)', borderColor: '#333', marginBottom: 16 }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Statistic
                title={<span style={{ color: '#999' }}>通风模式</span>}
                value={ventilation?.mode || 'auto'}
                valueStyle={{ color: '#1890ff', fontSize: 18 }}
              />
              <Statistic
                title={<span style={{ color: '#999' }}>系统流量</span>}
                value={Math.round(ventilation?.systemFlowRate || 0)}
                suffix="m³/s"
                valueStyle={{ color: '#1890ff', fontSize: 18 }}
              />
              <Statistic
                title={<span style={{ color: '#999' }}>运行风机</span>}
                value={ventilation?.fans?.filter(f => f.status === 'running').length || 0}
                suffix={`/${ventilation?.fans?.length || 20}`}
                valueStyle={{ color: '#52c41a', fontSize: 18 }}
              />
              <Statistic
                title={<span style={{ color: '#999' }}>灭火强度</span>}
                value={Math.round(environment.suppressionLevel * 100)}
                suffix="%"
                valueStyle={{ color: '#faad14', fontSize: 18 }}
              />
            </Space>
          </Card>

          <Card 
            title={<span style={{ color: '#fff' }}><WarningOutlined /> 逻辑验证</span>}
            style={{ background: 'rgba(0,21,41,0.9)', borderColor: '#333', marginBottom: 16 }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#999' }}>火灾系统逻辑</span>
                  <Tag color={validationResults.fire.isValid ? 'green' : 'red'}>
                    {validationResults.fire.isValid ? '通过' : '未通过'}
                  </Tag>
                </div>
                {validationResults.fire.issues?.length > 0 && (
                  <div style={{ color: '#ff4d4f', fontSize: 12 }}>
                    {validationResults.fire.issues[0].message}
                  </div>
                )}
                {validationResults.fire.warnings?.length > 0 && (
                  <div style={{ color: '#faad14', fontSize: 12 }}>
                    {validationResults.fire.warnings[0].message}
                  </div>
                )}
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#999' }}>通风系统逻辑</span>
                  <Tag color={validationResults.ventilation.isValid ? 'green' : 'red'}>
                    {validationResults.ventilation.isValid ? '通过' : '未通过'}
                  </Tag>
                </div>
                {validationResults.ventilation.issues?.length > 0 && (
                  <div style={{ color: '#ff4d4f', fontSize: 12 }}>
                    {validationResults.ventilation.issues[0].message}
                  </div>
                )}
              </div>
            </Space>
          </Card>

          <Card 
            title={<span style={{ color: '#fff' }}>事件日志</span>}
            style={{ background: 'rgba(0,21,41,0.9)', borderColor: '#333' }}
            bodyStyle={{ padding: '8px' }}
          >
            <Table
              columns={logColumns}
              dataSource={logs}
              pagination={false}
              size="small"
              rowKey="logId"
              scroll={{ y: 250 }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="火灾模拟确认"
        open={modalVisible}
        onOk={confirmTriggerFire}
        onCancel={() => setModalVisible(false)}
        okText="确认触发"
        cancelText="取消"
        okType="danger"
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <FireOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
          <p style={{ color: '#999', marginBottom: 8 }}>即将在以下区域触发火灾模拟:</p>
          <p style={{ fontSize: 24, color: '#fff', fontWeight: 'bold' }}>
            {selectedZone} 区域
          </p>
          <p style={{ color: '#faad14', marginTop: 16 }}>
            ⚠️ 此操作将启动烟雾扩散和通风联动响应
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default FireControlSystem;
