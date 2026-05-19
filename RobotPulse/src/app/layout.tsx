import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RobotPulse - 多协作机器人运动避障仿真系统",
  description: "基于 Next.js 的多协作机器人空间运动避障仿真平台，支持关节坐标数据对齐、异步人工势场法路径规划和 IndexedDB 历史数据存储",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
