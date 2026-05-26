import type { Metadata } from 'next';
import './globals.css';
import AppLayout from '@/components/layout/AppLayout';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'VertiPulset - eVTOL城市空中交通管理系统',
  description: '基于Next.js的城市电动垂直起降飞行器（eVTOL）枢纽智能管理系统',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
