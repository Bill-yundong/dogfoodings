import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RobotPulses - 多协作机器人运动避障仿真平台',
  description: '基于 Next.js 的多协作机器人空间运动避障仿真系统，实现关节坐标数据在主控系统与安全监控终端间的逻辑对齐',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
