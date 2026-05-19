import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/common/Sidebar';
import { Header } from '@/components/common/Header';
import { DashboardPage } from '@/pages/DashboardPage';
import { AllocationPage } from '@/pages/AllocationPage';
import { StackerPage } from '@/pages/StackerPage';
import { SpacePage } from '@/pages/SpacePage';
import { SkuPage } from '@/pages/SkuPage';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { initData, loading } = useWarehouseStore();

  useRealTimeData(3000);

  useEffect(() => {
    initData();
  }, [initData]);

  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/dashboard':
        return '综合仪表盘';
      case '/allocation':
        return '货位分配中心';
      case '/stacker':
        return '堆垛机监控';
      case '/space':
        return '空间管理';
      case '/sku':
        return 'SKU 流动性分析';
      default:
        return 'WMS 智能仓储系统';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-wms-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-wms-primary animate-spin mx-auto mb-4" />
          <p className="text-wms-subtext">系统初始化中...</p>
          <p className="text-xs text-wms-subtext mt-2">正在加载仓储数据</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-wms-bg">
        <Sidebar collapsed={sidebarCollapsed} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title={getPageTitle(window.location.pathname)} />
          <main className="flex-1 overflow-y-auto wms-scrollbar">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/allocation" element={<AllocationPage />} />
              <Route path="/stacker" element={<StackerPage />} />
              <Route path="/space" element={<SpacePage />} />
              <Route path="/sku" element={<SkuPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default function App() {
  return <AppContent />;
}
