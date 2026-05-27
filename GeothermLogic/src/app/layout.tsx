import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GeothermLogic - 地热能源管理系统',
  description: '浅层地源热泵热平衡稳定性分析平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-900 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
