import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { AppDataProvider } from './providers';

export const metadata: Metadata = {
  title: 'ExtractionLab - 精品咖啡萃取品质管理系统',
  description: '基于 Next.js 的精品咖啡萃取品质管理系统，实现萃取曲线与风味雷达数据在研发中心与全球连锁门店系统间的实时映射',
  keywords: '咖啡,萃取,品质管理,风味分析,冲煮配方,连锁门店',
  authors: [{ name: 'ExtractionLab Team' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen coffee-scrollbar">
        <div className="relative min-h-screen bg-gradient-to-br from-coffee-50 via-white to-amber-50/30">
          <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />
          <div className="relative z-10">
            <AppDataProvider>
              <Navigation />
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </main>
            </AppDataProvider>
            <footer className="border-t border-coffee-200 bg-white/50 backdrop-blur-sm mt-16">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-coffee-600 to-coffee-800 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">☕</span>
                    </div>
                    <div>
                      <p className="font-semibold text-coffee-800">ExtractionLab</p>
                      <p className="text-xs text-coffee-500">精品咖啡萃取品质管理系统</p>
                    </div>
                  </div>
                  <div className="text-sm text-coffee-500 text-center md:text-right">
                    <p>© 2024 ExtractionLab. All rights reserved.</p>
                    <p className="text-xs mt-1">异步多因子平衡引擎 · IndexedDB 万级数据存储</p>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
