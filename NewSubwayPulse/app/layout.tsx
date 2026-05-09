import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NewSubwayPulse - 轨道交通客流涌浪系统',
  description: '基于 Next.js 的轨道交通客流涌浪优化系统，实现人群压力数据实时同步与运力预测',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
