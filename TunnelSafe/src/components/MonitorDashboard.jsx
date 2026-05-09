import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Tag, Space, Tooltip } from 'antd';
import {
  FireOutlined,
  WarningOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  CloudOutlined,
  BulbOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import useTunnelStore from '../store/tunnelStore';
import { fireEvolutionModel } from '../models/fireEvolution';

const { Meta } = Card;

const getStatusColor = (status) => {
  switch (status) {
    case 'critical': return '#ff4d4f';
    case 'danger': return '#fa8c16';
    case 'warning': return '#faad14';
    case 'safe': return '#52c41a';
    default: return '#1890ff';
  }
};

const getStatusTag = (status) => {
  switch (status) {
    case 'critical': return { text: '危急', color: 'red' };
    case 'danger': return { text: '危险', color: 'orange' };
    case 'warning': return { text: '警告', color: 'gold' };
    case 'safe': return { text: '安全', color: 'green' };
    default: return { text: '未知', color: 'blue' };
  }
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const MonitorDashboard = () => {
  const {
    environment,
    ventilation,
    lighting,
    zoneData,
    history,
    simulationTime,
    isRunning,
    validationResults
  } = useTunnelStore();

  const historyChartOption = useMemo(() => {
    const times = history.timestamps.map((_, i) => i);
    
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 21, 41, 0.9)',
        borderColor: '#1890ff',
        textStyle: { color: '#fff' }
      },
      legend: {
        data: ['烟雾浓度', '通风流量'],
        textStyle: { color: '#fff' },
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: times,
        axisLine: { lineStyle: { color: '#333' } },
        axisLabel: { color: '#999' }
      },
      yAxis: [
        {
          type: 'value',
          name: '烟雾浓度',
          max: 1,
          axisLine: { lineStyle: { color: '#ff4d4f' } },
          axisLabel: { color: '#999', formatter: '{value}' },
          splitLine: { lineStyle: { color: '#222' } }
        },
        {
          type: 'value',
          name: '流量 (m³/s)',
          max: 2500,
          axisLine: { lineStyle: { color: '#1890ff' } },
          axisLabel: { color: '#999' },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: '烟雾浓度',
          type: 'line',
          smooth: true,
          data: history.smokeDensity,
          lineStyle: { color: '#ff4d4f', width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255, 77, 79, 0.3)' },
                { offset: 1, color: 'rgba(255, 77, 79, 0)' }
              ]
            }
          },
          symbol: 'none'
        },
        {
          name: '通风流量',
          type: 'line',
          smooth: true,
          yAxisIndex: 1,
          data: history.flowRate,
          lineStyle: { color: '#1890ff', width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
                { offset: 1, color: 'rgba(24, 144, 255, 0)' }
              ]
            }
          },
          symbol: 'none'
        }
      ]
    };
  }, [history]);

  const zones = Object.keys(zoneData);
  const smokeGaugeOption = useMemo(() => ({
    series: [{
      type: 'gauge',
      startAngle: 90,
      endAngle: -270,
      pointer: { show: false },
      progress: {
        show: true,
        overlap: false,
        roundCap: true,
        clip: false,
        itemStyle: {
          color: getStatusColor(fireEvolutionModel?.getSmokeStatus?.(environment.avgSmokeDensity) || 'safe')
        }
      },
      axisLine: {
        lineStyle: {
          width: 20,
          color: [[1, '#222']]
        }
      },
      splitLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      data: [{
        value: Math.round(environment.avgSmokeDensity * 100),
        detail: {
          offsetCenter: ['0%', '0%']
        }
      }],
      detail: {
        width: 50,
        height: 14,
        fontSize: 24,
        color: '#fff',
        formatter: '{value}%',
        borderColor: 'auto'
      }
    }]
  }), [environment.avgSmokeDensity]);

  const activeFireZones = environment.fireZones?.filter(f => f.stage !== 'extinguished') || [];
  const overallStatus = useMemo(() => {
    if (activeFireZones.length > 0) {
      const maxDensity = Math.max(...activeFireZones.map(f => f.smokeDensity));
      return maxDensity > 0.5 ? 'critical' : maxDensity > 0.3 ? 'danger' : 'warning';
    }
    return 'safe';
  }, [activeFireZones]);

  const statusTag = getStatusTag(overallStatus);

  return (
    <div style={{ padding: '16px' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card 
            style={{ 
              background: 'linear-gradient(135deg, rgba(0,21,41,0.95) 0%, rgba(0,33,64,0.9) 100%)',
              border: `2px solid ${getStatusColor(overallStatus)}`,
              borderRadius: 8
            }}
            styles={{ body: { padding: '16px' } }}
          >
            <Row align="middle" justify="space-between">
              <Col>
                <Space size="large">
                  <h2 style={{ color: '#fff', margin: 0 }}>
                    隧道安全环境监控中心
                  </h2>
                  <Tag color={statusTag.color} style={{ fontSize: 16, padding: '4px 12px' }}>
                    {statusTag.text}
                  </Tag>
                </Space>
              </Col>
              <Col>
                <Space size="large" style={{ color: '#1890ff' }}>
                  <Statistic 
                    title="运行时长" 
                    value={formatTime(simulationTime)}
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <Tag color={isRunning ? 'green' : 'default'} style={{ fontSize: 14 }}>
                    {isRunning ? '运行中' : '已暂停'}
                  </Tag>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card 
            style={{ background: 'rgba(0,21,41,0.9)', borderColor: '#ff4d4f' }}
            styles={{ body: { padding: '12px' } }}
          >
            <Meta 
              avatar={<FireOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />}
              title={<span style={{ color: '#fff' }}>烟雾浓度</span>}
              description={
                <Statistic 
                  value={Math.round(environment.avgSmokeDensity * 100)}
                  suffix="%"
                  valueStyle={{ color: '#ff4d4f', fontSize: 28 }}
                />
              }
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card 
            style={{ background: 'rgba(0,21,41,0.9)', borderColor: '#1890ff' }}
            styles={{ body: { padding: '12px' } }}
          >
            <Meta 
              avatar={<CloudOutlined style={{ fontSize: 32, color: '#1890ff' }} />}
              title={<span style={{ color: '#fff' }}>通风流量</span>}
              description={
                <Statistic 
                  value={Math.round(ventilation?.systemFlowRate || 0)}
                  suffix="m³/s"
                  valueStyle={{ color: '#1890ff', fontSize: 28 }}
                />
              }
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card 
            style={{ background: 'rgba(0,21,41,0.9)', borderColor: '#faad14' }}
            styles={{ body: { padding: '12px' } }}
          >
            <Meta 
              avatar={<ThunderboltOutlined style={{ fontSize: 32, color: '#faad14' }} />}
              title={<span style={{ color: '#fff' }}>活跃火灾</span>}
              description={
                <Statistic 
                  value={activeFireZones.length}
                  valueStyle={{ color: '#faad14', fontSize: 28 }}
                />
              }
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card 
            style={{ background: 'rgba(0,21,41,0.9)', borderColor: '#52c41a' }}
            styles={{ body: { padding: '12px' } }}
          >
            <Meta 
              avatar={<BulbOutlined style={{ fontSize: 32, color: '#52c41a' }} />}
              title={<span style={{ color: '#fff' }}>照明节点</span>}
              description={
                <Statistic 
                  value={lighting.totalNodes}
                  suffix="个"
                  valueStyle={{ color: '#52c41a', fontSize: 28 }}
                />
              }
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card 
            title={<span style={{ color: '#fff' }}>环境趋势</span>}
            style={{ background: 'rgba(0,21,41,0.9)', borderColor: '#333' }}
            extra={
              <Tag icon={<ReloadOutlined />} color="blue">
                实时更新
              </Tag>
            }
          >
            <ReactECharts 
              option={historyChartOption} 
              style={{ height: 280 }}
              opts={{ renderer: 'canvas' }}
            />
          </Card>
        </Col>
        
        <Col span={8}>
          <Card 
            title={<span style={{ color: '#fff' }}>系统状态</span>}
            style={{ background: 'rgba(0,21,41,0.9)', borderColor: '#333' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999' }}>
                <span>火灾系统:</span>
                <Tag color={validationResults.fire.isValid ? 'green' : 'red'}>
                  {validationResults.fire.isValid ? '正常' : '异常'}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999' }}>
                <span>通风系统:</span>
                <Tag color={validationResults.ventilation.isValid ? 'green' : 'red'}>
                  {validationResults.ventilation.isValid ? '正常' : '异常'}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999' }}>
                <span>运行模式:</span>
                <Tag color="blue">{ventilation?.mode || 'auto'}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999' }}>
                <span>系统压力:</span>
                <span style={{ color: '#1890ff' }}>{ventilation?.systemPressure?.toFixed(2) || 0} Pa</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999' }}>
                <span>运行风机:</span>
                <span style={{ color: '#52c41a' }}>
                  {ventilation?.fans?.filter(f => f.status === 'running').length || 0}/{ventilation?.fans?.length || 20}
                </span>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card 
        title={<span style={{ color: '#fff' }}>隧道分区监控</span>}
        style={{ background: 'rgba(0,21,41,0.9)', borderColor: '#333', marginTop: 16 }}
      >
        <Row gutter={[8, 8]}>
          {zones.map(zone => {
            const zoneInfo = zoneData[zone];
            const tag = getStatusTag(zoneInfo?.status || 'safe');
            const hasFire = activeFireZones.some(f => f.id.includes(zone));
            
            return (
              <Col span={4.8} key={zone}>
                <Card 
                  size="small"
                  style={{ 
                    background: hasFire 
                      ? 'rgba(255,77,79,0.15)' 
                      : 'rgba(0,33,64,0.8)',
                    borderColor: getStatusColor(zoneInfo?.status || 'safe'),
                    borderWidth: 2
                  }}
                  styles={{ body: { padding: '8px' } }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      color: '#fff', 
                      fontSize: 16, 
                      fontWeight: 'bold',
                      marginBottom: 4
                    }}>
                      {zone}
                      {hasFire && <FireOutlined style={{ color: '#ff4d4f', marginLeft: 4 }} />}
                    </div>
                    <Tag color={tag.color} style={{ marginBottom: 4 }}>
                      {tag.text}
                    </Tag>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                      <div>烟雾: {Math.round((zoneInfo?.smokeDensity || 0) * 100)}%</div>
                      <div>通风: {Math.round(zoneInfo?.ventilationFlow || 0)} m³/s</div>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>
    </div>
  );
};

export default MonitorDashboard;
