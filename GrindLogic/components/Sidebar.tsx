'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Activity,
  LineChart,
  Sliders,
  Database,
  Settings,
  Zap,
} from 'lucide-react';

const navItems = [
  {
    path: '/',
    label: '实时监控',
    icon: Activity,
    description: '功率谱数据与生产状态',
  },
  {
    path: '/prediction',
    label: '粗糙度预测',
    icon: LineChart,
    description: '分形分析与AI预测',
  },
  {
    path: '/optimization',
    label: '参数优化',
    icon: Sliders,
    description: '进给参数优化建议',
  },
  {
    path: '/fingerprint',
    label: '加工指纹库',
    icon: Database,
    description: '零件快照与数字化复刻',
  },
  {
    path: '/settings',
    label: '系统设置',
    icon: Settings,
    description: '数据源与阈值配置',
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed left-0 top-0 bottom-0 w-72 backdrop-blur-xl border-r z-40 flex flex-col"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 90%, transparent)',
        borderRightColor: 'var(--border-color)',
      }}
    >
      <div className="p-6" style={{ borderBottomColor: 'var(--border-color)' }}>
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-all duration-300">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>GrindLogic</h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>精密磨削智能预测系统</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <motion.div
              key={item.path}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Link
                href={item.path}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30 shadow-lg shadow-primary-500/10'
                    : 'border border-transparent'
                }`}
                style={{
                  color: isActive ? undefined : 'var(--text-secondary)',
                }}
              >
                <Icon
                  className={`w-5 h-5 mt-0.5 flex-shrink-0 transition-transform duration-200 ${
                    isActive ? 'text-primary-400' : 'group-hover:scale-110'
                  }`}
                />
                <div className="min-w-0">
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{item.description}</div>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-400 mt-2"
                  />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="p-4" style={{ borderTopColor: 'var(--border-color)' }}>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>系统运行中</span>
          </div>
          <div className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <div className="flex justify-between">
              <span>模型版本</span>
              <span style={{ color: 'var(--text-secondary)' }}>v1.2.0</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>数据延迟</span>
              <span className="text-accent-400">~12ms</span>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
