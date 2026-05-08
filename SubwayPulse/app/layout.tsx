import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subway Pulse - 轨道交通客流涌浪优化系统",
  description: "基于排队论的轨道交通客流预测与运力调度系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans">{children}</body>
    </html>
  );
}
