import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SoilPulse - 农田养分智能监控系统',
  description: '基于异步反应输运模拟的农田养分流失监控与智慧施肥决策系统',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-slate-50 min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
