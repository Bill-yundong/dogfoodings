import { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Badge, Button } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Route,
  RefreshCw,
  Database,
  Settings,
  LogOut,
  Bell,
  Wifi,
  WifiOff,
  AlertTriangle,
  User,
  Plane,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAlertStore } from '@/store/alertStore';
import { useOfflineStore } from '@/store/offlineStore';
import { useWeatherStore } from '@/store/weatherStore';
import dayjs from 'dayjs';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = AntLayout;

const roleNames: Record<string, string> = {
  admin: '系统管理员',
  fleet_commander: '机队指挥官',
  meteorologist: '气象分析师',
  platform_safety: '平台安全员',
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, hasPermission } = useAuthStore();
  const { alerts, unreadCount, acknowledgeAlert } = useAlertStore();
  const { isOnline, enterEmergencyMode, exitEmergencyMode, emergencyMode } = useOfflineStore();
  const { selectedPlatform, platforms } = useWeatherStore();
  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <LayoutDashboard size={20} />,
      label: '综合监控大屏',
    },
    {
      key: '/route',
      icon: <Route size={20} />,
      label: '航线规划',
      disabled: !hasPermission('route:create'),
    },
    {
      key: '/semantic',
      icon: <RefreshCw size={20} />,
      label: '语义同步',
      disabled: !hasPermission('sync:configure'),
    },
    {
      key: '/offline',
      icon: <Database size={20} />,
      label: '离线管理',
    },
    {
      key: '/system',
      icon: <Settings size={20} />,
      label: '系统管理',
      disabled: !hasPermission('*'),
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <User size={16} />,
      label: '个人信息',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogOut size={16} />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const alertMenuItems: MenuProps['items'] = alerts
    .filter((a) => !a.acknowledged)
    .slice(0, 5)
    .map((alert) => ({
      key: alert.id,
      label: (
        <div className="flex flex-col gap-1 py-1">
          <div className="flex items-center gap-2">
            <AlertTriangle
              size={14}
              className={
                alert.severity === 'critical'
                  ? 'text-red-500'
                  : alert.severity === 'warning'
                  ? 'text-orange-500'
                  : 'text-blue-500'
              }
            />
            <span className="font-medium text-sm">{alert.title}</span>
          </div>
          <span className="text-xs text-gray-400">{dayjs(alert.timestamp).format('HH:mm:ss')}</span>
        </div>
      ),
      onClick: () => acknowledgeAlert(alert.id),
    }));

  const selectedPlat = platforms.find((p) => p.id === selectedPlatform);

  return (
    <AntLayout className="min-h-screen bg-[#0a0e17]">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        className="bg-[#0f141f] border-r border-[#1f2937] flex flex-col"
      >
        <div className="h-16 flex items-center px-4 border-b border-[#1f2937]">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B998B] to-[#0d5c53] flex items-center justify-center mr-3"
          >
            <Plane size={18} className="text-white" />
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col"
              >
                <span className="text-white font-bold text-lg tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  HELILINK
                </span>
                <span className="text-[#1B998B] text-xs">海上通航应急系统</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="flex-1 bg-transparent border-0 mt-2"
          style={{
            color: '#94a3b8',
          }}
        />

        <div className="p-4 border-t border-[#1f2937]">
          <div className={`flex items-center gap-2 text-xs ${isOnline ? 'text-[#1B998B]' : 'text-red-500'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isOnline ? '在线' : '离线'}</span>
            {emergencyMode && (
              <Badge
                status="processing"
                text="应急模式"
                color="red"
                className="ml-auto"
              />
            )}
          </div>
        </div>
      </Sider>

      <AntLayout>
        <Header className="h-16 bg-[#0f141f] border-b border-[#1f2937] px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button
              type="text"
              onClick={() => setCollapsed(!collapsed)}
              className="text-gray-400 hover:text-white"
            >
              <span className="text-xl">{collapsed ? '☰' : '☰'}</span>
            </Button>

            {selectedPlat && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">当前平台：</span>
                <span className="text-white font-medium">{selectedPlat.name}</span>
                <span className="text-[#1B998B] text-sm">({selectedPlat.code})</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-white font-mono text-lg">{currentTime.format('HH:mm:ss')}</div>
              <div className="text-gray-500 text-xs">{currentTime.format('YYYY-MM-DD')}</div>
            </div>

            <Dropdown menu={{ items: alertMenuItems }} placement="bottomRight" trigger={['click']}>
              <Badge count={unreadCount} size="small" offset={[0, 2]}>
                <Button type="text" className="text-gray-400 hover:text-white relative">
                  <Bell size={20} />
                </Button>
              </Badge>
            </Dropdown>

            <Button
              type={emergencyMode ? 'primary' : 'default'}
              danger={!emergencyMode}
              onClick={emergencyMode ? exitEmergencyMode : enterEmergencyMode}
              size="small"
              className={emergencyMode ? 'bg-red-600 border-red-600' : ''}
            >
              {emergencyMode ? '退出应急' : '应急模式'}
            </Button>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div className="flex items-center gap-3 cursor-pointer hover:bg-[#1f2937] px-3 py-2 rounded-lg transition-colors">
                <Avatar
                  size={36}
                  className="bg-gradient-to-br from-[#1B998B] to-[#0d5c53]"
                  icon={<User size={18} />}
                />
                <div className="hidden md:block">
                  <div className="text-white text-sm font-medium">{user?.name}</div>
                  <div className="text-gray-500 text-xs">{user?.role ? roleNames[user.role] : ''}</div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content className="m-0 p-6 min-h-[calc(100vh-64px)]">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
