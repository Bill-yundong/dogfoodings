import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { initDB } from '@/lib/db';

export const metadata: Metadata = {
  title: 'TankNexus - 机器人焊接质量监控系统',
  description: '基于 Next.js 的工业级机器人焊接质量监控系统，实现熔池稳定性数据实时对齐与缺陷风险预警',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (typeof window !== 'undefined') {
    initDB();
  }

  return (
    <html lang="zh-CN">
      <body>
        <Navbar />
        <main className="pt-16 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
