'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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

  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    
    scrollToTop();
    
    const timeoutId = setTimeout(scrollToTop, 50);
    
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return (
    <div className="page-container min-h-screen">
      {showSidebar && <Sidebar />}
      
      <div className={`${showSidebar ? 'lg:ml-64' : ''} transition-all duration-300`}>
        {showHeader && <Header />}
        
        <motion.main
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="p-6"
        >
          {children}
        </motion.main>
      </div>
      
      <ToastContainer />
    </div>
  );
}
