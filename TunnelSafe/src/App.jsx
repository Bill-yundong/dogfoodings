import React, { useEffect, useRef, useCallback } from 'react';
import { Layout, Tabs, ConfigProvider, theme, Spin, Typography } from 'antd';
import {
  DashboardOutlined,
  ThunderboltOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import MonitorDashboard from './components/MonitorDashboard';
import FireControlSystem from './components/FireControlSystem';
import useTunnelStore from './store/tunnelStore';

const { Header, Content } = Layout;
const { Title } = Typography;

const App = () => {
  const {
    init,
    simulateStep,
    isInitialized,
    isRunning,
    activeTab,
    setActiveTab
  } = useTunnelStore();

  const simulationInterval = useRef(null);

  useEffect(() => {
    init();
  }, [init]);

  const runSimulationStep = useCallback(async () => {
    if (isRunning) {
      await simulateStep(0.1);
    }
  }, [isRunning, simulateStep]);

  useEffect(() => {
    if (isRunning) {
      simulationInterval.current = setInterval(runSimulationStep, 100);
    } else {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
      }
    }

    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, [isRunning, runSimulationStep]);

  const tabItems = [
    {
      key: 'monitor',
      label: (
        <span>
          <DashboardOutlined />
          监控大屏
        </span>
      ),
      children: <MonitorDashboard />
    },
    {
      key: 'control',
      label: (
        <span>
          <ThunderboltOutlined />
          消防联动系统
        </span>
      ),
      children: <FireControlSystem />
    }
  ];

  if (!isInitialized) {
    return (
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            colorBgBase: '#001529',
            colorText: '#fff',
            colorTextSecondary: '#999'
          }
        }}
      >
        <Layout style={{ minHeight: '100vh', background: '#001529' }}>
          <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div style={{ textAlign: 'center' }}>
              <Spin size="large" />
              <Title level={3} style={{ color: '#1890ff', marginTop: 24 }}>
                隧道安全环境模拟系统
              </Title>
              <p style={{ color: '#999' }}>正在初始化数据库和照明节点...</p>
              <p style={{ color: '#666', fontSize: 12 }}>首次启动将创建 10000 个照明节点</p>
            </div>
          </Content>
        </Layout>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          colorBgBase: '#001529',
          colorText: '#fff',
          colorTextSecondary: '#999',
          colorBorder: '#333',
          borderRadius: 6
        },
        components: {
          Tabs: {
            itemColor: '#999',
            itemActiveColor: '#1890ff',
            itemHoverColor: '#40a9ff',
            inkBarColor: '#1890ff'
          },
          Card: {
            colorBgContainer: 'rgba(0,33,64,0.9)',
            headerBg: 'rgba(0,21,41,0.95)',
            headerColor: '#fff'
          }
        }
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#001529' }}>
        <Header style={{
          background: 'linear-gradient(180deg, rgba(0,21,41,1) 0%, rgba(0,33,64,0.95) 100%)',
          padding: '0 24px',
          borderBottom: '1px solid #1890ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SafetyOutlined style={{ fontSize: 28, color: '#1890ff' }} />
            <Title level={4} style={{ color: '#fff', margin: 0 }}>
              隧道安全环境演化模拟系统
            </Title>
          </div>
          <div style={{ color: '#666', fontSize: 12 }}>
            Tunnel Safety Environment Simulation System v1.0
          </div>
        </Header>

        <Content style={{ padding: 0, minHeight: 'calc(100vh - 64px)', overflow: 'auto' }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            type="card"
            size="large"
          />
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
