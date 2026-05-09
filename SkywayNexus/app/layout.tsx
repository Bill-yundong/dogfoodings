import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkywayNexus - 低空物流航路管理系统",
  description: "基于 Next.js 的低空物流航路建模系统，实现多机飞行轨迹语义对齐、异步冲突检测和飞行黑匣子离线存储",
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
