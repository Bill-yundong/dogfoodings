import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GasMatrix - 城镇燃气管网动态平衡系统',
  description: '基于 Next.js 的城镇燃气管网动态平衡调峰系统，实现压力数据实时同步与管存预测',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
