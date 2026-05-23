'use client';

import { useLayoutEffect, useRef } from 'react';
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

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      history.scrollRestoration = 'manual';
    } catch (e) {}
    
    const root = document.documentElement;
    const originalScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    
    const forceTop = () => {
      window.scrollTo(0, 0);
      root.scrollTop = 0;
      document.body.scrollTop = 0;
      if (mainRef.current) {
        mainRef.current.scrollTop = 0;
      }
    };
    
    forceTop();
    
    const timeouts = [0, 10, 50, 100, 200, 300].map(delay => 
      setTimeout(forceTop, delay)
    );
    
    const restoreTimeout = setTimeout(() => {
      root.style.scrollBehavior = originalScrollBehavior;
    }, 400);
    
    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(restoreTimeout);
      root.style.scrollBehavior = originalScrollBehavior;
    };
  }, [pathname]);

  return (
    <div className="page-container min-h-screen">
      {showSidebar && <Sidebar />}
      
      <div className={`${showSidebar ? 'lg:ml-64' : ''} transition-all duration-300`}>
        {showHeader && <Header />}
        
        <main
          ref={mainRef}
          className="p-6 pt-20"
        >
          {children}
        </main>
      </div>
      
      <ToastContainer />
    </div>
  );
}
