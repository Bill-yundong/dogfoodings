import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoilPulse - 农田养分监控与智慧施肥系统",
  description: "基于 Next.js 的农田养分流失与施肥冗余监控系统，实现土壤化学特性实时映射",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
