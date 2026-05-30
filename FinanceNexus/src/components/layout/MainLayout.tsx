import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: '财务仪表盘',
    subtitle: '实时掌握您的财务状况与资产趋势',
  },
  '/transactions': {
    title: '记账中心',
    subtitle: '记录每一笔收支，追踪消费习惯',
  },
  '/tax': {
    title: '税务规划',
    subtitle: '智能税务计算，优化税负结构',
  },
  '/finance': {
    title: '理财辅助',
    subtitle: '资产配置分析，投资组合优化',
  },
  '/simulation': {
    title: '模拟引擎',
    subtitle: '复利演化预测，多情景风险分析',
  },
  '/settings': {
    title: '系统设置',
    subtitle: '数据安全管理，偏好配置',
  },
};

export const MainLayout = ({ children, title, subtitle }: MainLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const { loadData, isLoading } = useDataStore();
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    const loadUserData = async () => {
      if (user && !dataLoaded) {
        await loadData(user.id);
        setDataLoaded(true);
      }
    };

    loadUserData();
  }, [isAuthenticated, user, navigate, loadData, dataLoaded]);

  const pageInfo = pageTitles[location.pathname] || {
    title: 'FinanceNexus',
    subtitle: '智能财务规划系统',
  };

  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen bg-primary-950 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-500 to-amber-500 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary-950 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-slate-400">正在加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-950 noise-overlay">
      <Sidebar />
      <div className="ml-64 min-h-screen">
        <Header title={pageInfo.title} subtitle={pageInfo.subtitle} />
        <main className="p-8 min-h-[calc(100vh-80px)]">
          {children}
        </main>
      </div>
    </div>
  );
};
