export * from './trip-store';
export * from './scheduler-store';
export * from './offline-store';
export * from './ui-store';

import { useEffect, useState } from 'react';
import { useTripStore, useSchedulerStore, useOfflineStore, useUIStore } from './index';

export const useInitStores = () => {
  const { loadTrips } = useTripStore();
  const { initScheduler, loadTaskHistory } = useSchedulerStore();
  const { initOfflineServices } = useOfflineStore();
  const { setThemeMode } = useUIStore();

  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined') {
        initScheduler();
        initOfflineServices();
        loadTaskHistory();
        await loadTrips();
        
        const savedTheme = localStorage.getItem('trip-nexus-theme') as 'light' | 'dark' | 'system' | null;
        if (savedTheme) {
          setThemeMode(savedTheme);
        }
      }
    };
    
    init();
    
    return () => {
      const { shutdownScheduler } = useSchedulerStore.getState();
      const { cleanupOfflineServices } = useOfflineStore.getState();
      shutdownScheduler();
      cleanupOfflineServices();
    };
  }, []);
};

export const useStoreHydration = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const checkHydration = () => {
      const tripHydrated = useTripStore.persist.hasHydrated();
      const schedulerHydrated = useSchedulerStore.persist.hasHydrated();
      return tripHydrated && schedulerHydrated;
    };

    if (checkHydration()) {
      setHydrated(true);
      return;
    }

    const timeout = setTimeout(() => setHydrated(true), 1000);
    
    const interval = setInterval(() => {
      if (checkHydration()) {
        setHydrated(true);
        clearInterval(interval);
        clearTimeout(timeout);
      }
    }, 100);

    const unsub1 = useTripStore.persist.onFinishHydration(() => {
      if (checkHydration()) {
        setHydrated(true);
        clearInterval(interval);
        clearTimeout(timeout);
      }
    });
    const unsub2 = useSchedulerStore.persist.onFinishHydration(() => {
      if (checkHydration()) {
        setHydrated(true);
        clearInterval(interval);
        clearTimeout(timeout);
      }
    });
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      unsub1();
      unsub2();
    };
  }, []);

  return hydrated;
};
