import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './pages/Dashboard';
import LocationPage from './pages/Location';
import StackerPage from './pages/Stacker';
import DefragPage from './pages/Defrag';
import SKUPage from './pages/SKU';
import AnalyticsPage from './pages/Analytics';
import useWMSStore from './store/useWMSStore';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: '监控仪表盘', subtitle: '实时掌握仓储运营状态' },
  location: { title: '智能货位分配', subtitle: '基于 AI 算法的最优货位推荐' },
  stacker: { title: '堆垛机控制', subtitle: '设备状态监控与任务调度' },
  defrag: { title: '空间碎片整理', subtitle: '异步碎片检测与优化引擎' },
  sku: { title: 'SKU 流动性管理', subtitle: '万级商品流动性快照分析' },
  analytics: { title: '效率分析报告', subtitle: '算法优化效果对比与 ROI 分析' }
};

export default function App() {
  const { currentPage, setCurrentPage, initData, isLoading } = useWMSStore();

  useEffect(() => {
    initData();
  }, [initData]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'location': return <LocationPage />;
      case 'stacker': return <StackerPage />;
      case 'defrag': return <DefragPage />;
      case 'sku': return <SKUPage />;
      case 'analytics': return <AnalyticsPage />;
      default: return <Dashboard />;
    }
  };

  const pageInfo = pageTitles[currentPage] || pageTitles.dashboard;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background grid-bg flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mx-auto mb-6"
          >
            <div className="w-full h-full rounded-full border-4 border-primary border-t-transparent" />
          </motion.div>
          <h2 className="text-xl font-bold text-text-primary mb-2">正在初始化系统...</h2>
          <p className="text-text-muted">加载仓储数据与算法引擎</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-sm text-primary">正在生成 10,000 条 SKU 数据</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid-bg">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      
      <div className="ml-64 min-h-screen">
        <Header title={pageInfo.title} subtitle={pageInfo.subtitle} />
        
        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
