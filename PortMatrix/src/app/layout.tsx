import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PortMatrix - 空港航站楼旅客吞吐仿真系统',
  description: '基于社会力模型和离散事件仿真的大型空港旅客流向仿真平台',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
