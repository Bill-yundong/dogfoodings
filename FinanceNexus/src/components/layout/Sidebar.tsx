import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Calculator,
  PieChart,
  LineChart,
  Settings,
  LogOut,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { formatCurrency, maskEmail } from '@/utils/formatters';

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { path: '/transactions', label: '记账中心', icon: Receipt },
  { path: '/tax', label: '税务规划', icon: Calculator },
  { path: '/finance', label: '理财辅助', icon: PieChart },
  { path: '/simulation', label: '模拟引擎', icon: LineChart },
  { path: '/settings', label: '系统设置', icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { accounts } = useDataStore();

  const totalBalance = accounts.reduce((sum, acc) => {
    if (acc.type === 'liability' || acc.type === 'credit') {
      return sum - acc.balance;
    }
    return sum + acc.balance;
  }, 0);

  const handleLogout = () => {
    logout();
    useDataStore.getState().clearData();
    navigate('/');
  };

  return (
    <aside className="w-64 h-screen bg-primary-900/80 backdrop-blur-xl border-r border-primary-800/50 flex flex-col fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-primary-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-amber-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary-950" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold gradient-text">
              FinanceNexus
            </h1>
            <p className="text-xs text-slate-500">智能财务规划</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-primary-800/50">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 mb-1">净资产总额</p>
          <p className="font-display text-2xl font-bold text-slate-100">
            {formatCurrency(totalBalance)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
            <span className="text-xs text-slate-500">数据已同步</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-xs text-slate-500 font-medium px-4 mb-2 uppercase tracking-wider">
          导航
        </p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-primary-800/50">
        {user && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-800/30 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-amber-500 flex items-center justify-center">
              <span className="text-primary-950 font-bold text-sm">
                {user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">
                {maskEmail(user.email)}
              </p>
              <p className="text-xs text-slate-500">已加密保护</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full nav-item text-danger-400 hover:text-danger-300 hover:bg-danger-500/10"
        >
          <LogOut className="w-5 h-5" />
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  );
};
