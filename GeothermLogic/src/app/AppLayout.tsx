'use client';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-900">
      <Sidebar />
      <div className="ml-64">
        <Header />
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
