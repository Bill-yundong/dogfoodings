import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WeldNexus - 焊接质量监控系统",
  description: "基于 Next.js 的自动化机器人焊接质量实时监控平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
