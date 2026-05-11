import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LightLogic - 城市光污染分布建模系统",
  description: "基于 Next.js 的城市光污染分布建模系统，实现反射亮度数据在环保局与规划设计系统间的动态对齐",
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
