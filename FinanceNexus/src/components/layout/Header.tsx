import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Bell, Search, Shield, Database } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header = ({ title, subtitle }: HeaderProps) => {
  const today = new Date();

  return (
    <header className="h-20 px-8 flex items-center justify-between border-b border-primary-800/50 bg-primary-950/50 backdrop-blur-xl sticky top-0 z-30">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-100">{title}</h2>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary-900/50 rounded-xl border border-primary-800/50">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索交易、分类..."
            className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 w-48"
          />
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-xs text-slate-500 bg-primary-800/50 rounded">
            ⌘K
          </kbd>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-500/10 border border-accent-500/20">
          <Shield className="w-4 h-4 text-accent-400" />
          <span className="text-xs text-accent-400 font-medium">加密中</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-800/50 border border-primary-700/50">
          <Database className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400">本地存储</span>
        </div>

        <button className="relative p-2 rounded-lg hover:bg-primary-800/50 transition-colors">
          <Bell className="w-5 h-5 text-slate-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full" />
        </button>

        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-slate-200">
            {format(today, 'yyyy年M月d日', { locale: zhCN })}
          </p>
          <p className="text-xs text-slate-500">
            {format(today, 'EEEE', { locale: zhCN })}
          </p>
        </div>
      </div>
    </header>
  );
};
