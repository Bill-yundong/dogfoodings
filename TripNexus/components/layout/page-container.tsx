'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { ToastContainer } from '@/components/ui/toast';

interface PageContainerProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showSidebar?: boolean;
}

export function PageContainer({
  children,
  showHeader = true,
  showSidebar = true,
}: PageContainerProps) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <div className="page-container flex h-screen w-full overflow-hidden">
      {showSidebar && <Sidebar />}
      
      <div className="flex flex-1 flex-col overflow-hidden">
        {showHeader && <Header />}
        
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto p-6"
        >
          {children}
        </main>
      </div>
      
      <ToastContainer />
    </div>
  );
}
