import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrossNexus - 智能交通拥堵治理系统",
  description: "基于元胞自动机的核心城区情报级拥堵治理系统，支持指挥中心与交警移动端流量指数动态对齐",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-950">
        {children}
      </body>
    </html>
  );
}