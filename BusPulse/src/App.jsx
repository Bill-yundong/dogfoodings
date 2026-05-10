import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Box,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  DirectionsBus,
  Storage,
  PlayCircle,
  StopCircle,
  Refresh
} from '@mui/icons-material';

import OperationAnalysis from './components/OperationAnalysis';
import SchedulingSystem from './components/SchedulingSystem';
import { defaultFitter } from './algorithms/trajectoryFitting';
import { integrationService } from './services/dataIntegration';
import { generateFullMockDataset } from './utils/mockDataGenerator';
import { 
  initDB, 
  saveStopsInBatch, 
  saveRoute, 
  saveSchedule,
  savePassengerFlowInBatch,
  getStats,
  getAllRoutes,
  getSchedulesByRoute,
  getScheduleAdjustments,
  clearAllData
} from './storage/indexedDB';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ mt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [dbStats, setDbStats] = useState({});
  const [routes, setRoutes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [trajectoryOffsets, setTrajectoryOffsets] = useState([]);
  const [passengerFlow, setPassengerFlow] = useState([]);
  const [notification, setNotification] = useState(null);

  const simulationIntervalRef = useRef(null);
  const offsetsBufferRef = useRef([]);
  const metricsBufferRef = useRef([]);
  const adjustmentsBufferRef = useRef([]);
  const dbStatsTimeoutRef = useRef(null);
  const unsubscribeRef = useRef([]);
  const isProcessingRef = useRef(false);

  const showNotification = useCallback((message, severity = 'info') => {
    setNotification({ message, severity });
  }, []);

  const updateDBStats = useCallback(async () => {
    if (dbStatsTimeoutRef.current) {
      return;
    }
    
    dbStatsTimeoutRef.current = setTimeout(async () => {
      try {
        const stats = await getStats();
        setDbStats(stats);
      } catch (error) {
        console.error('Failed to get DB stats:', error);
      } finally {
        dbStatsTimeoutRef.current = null;
      }
    }, 3000);
  }, []);

  const flushBuffers = useCallback(() => {
    if (offsetsBufferRef.current.length > 0) {
      setTrajectoryOffsets(prev => {
        const updated = [...prev, ...offsetsBufferRef.current];
        return updated.slice(-30);
      });
      offsetsBufferRef.current = [];
    }

    if (metricsBufferRef.current.length > 0) {
      setMetricsHistory(prev => {
        const updated = [...prev, ...metricsBufferRef.current];
        return updated.slice(-10);
      });
      metricsBufferRef.current = [];
    }

    if (adjustmentsBufferRef.current.length > 0) {
      setAdjustments(prev => [...prev, ...adjustmentsBufferRef.current]);
      adjustmentsBufferRef.current = [];
    }
  }, []);

  const initializeData = useCallback(async () => {
    setIsInitialized(false);
    
    try {
      await initDB();
      await clearAllData();
      
      const mockData = generateFullMockDataset();
      
      await saveStopsInBatch(mockData.stops, 100);
      
      for (const route of mockData.routes) {
        await saveRoute(route);
      }
      
      for (const schedule of mockData.schedules) {
        await saveSchedule(schedule);
      }
      
      await savePassengerFlowInBatch(mockData.passengerFlow, 100);
      
      setRoutes(mockData.routes);
      setSchedules(mockData.schedules);
      setPassengerFlow(mockData.passengerFlow);
      
      await updateDBStats();
      setIsInitialized(true);
      
      showNotification('数据初始化成功！已加载模拟数据到 IndexedDB', 'success');
    } catch (error) {
      console.error('Failed to initialize data:', error);
      showNotification('数据初始化失败', 'error');
    }
  }, [updateDBStats, showNotification]);

  const loadExistingData = useCallback(async () => {
    try {
      const loadedRoutes = await getAllRoutes();
      
      if (loadedRoutes.length > 0) {
        setRoutes(loadedRoutes);
        
        let allSchedules = [];
        let allAdjustments = [];
        
        for (const route of loadedRoutes) {
          const routeSchedules = await getSchedulesByRoute(route.id);
          allSchedules = [...allSchedules, ...routeSchedules];
          
          for (const schedule of routeSchedules) {
            const scheduleAdjustments = await getScheduleAdjustments(schedule.id);
            allAdjustments = [...allAdjustments, ...scheduleAdjustments];
          }
        }
        
        setSchedules(allSchedules);
        setAdjustments(allAdjustments);
        setIsInitialized(true);
      }
      
      await updateDBStats();
    } catch (error) {
      console.error('Failed to load existing data:', error);
    }
  }, [updateDBStats]);

  const startSimulation = useCallback(() => {
    if (routes.length === 0 || schedules.length === 0) {
      showNotification('请先初始化数据', 'warning');
      return;
    }

    if (isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;
    setIsSimulating(true);
    showNotification('开始模拟实时 GPS 数据...', 'info');

    const gpsDataMap = new Map();

    for (const schedule of schedules) {
      const route = routes.find(r => r.id === schedule.routeId);
      if (route) {
        const isDelayed = Math.random() > 0.7;
        const points = [];
        const path = route.routePath;
        const count = 8;
        
        for (let i = 0; i < count; i++) {
          const progress = i / (count - 1);
          const pathIndex = Math.min(
            Math.floor(progress * (path.length - 1)),
            path.length - 2
          );
          const pathProgress = (progress * (path.length - 1)) - pathIndex;
          
          const startPoint = path[pathIndex];
          const endPoint = path[pathIndex + 1];
          
          const lat = startPoint.lat + (endPoint.lat - startPoint.lat) * pathProgress;
          const lng = startPoint.lng + (endPoint.lng - startPoint.lng) * pathProgress;
          
          const noiseLat = (Math.random() - 0.5) * 0.002;
          const noiseLng = (Math.random() - 0.5) * 0.002;
          
          const delayOffset = isDelayed ? (Math.random() * 180 + 120) * 1000 : 0;
          
          points.push({
            timestamp: Date.now() + i * 300 + delayOffset,
            coordinate: {
              lat: lat + noiseLat,
              lng: lng + noiseLng
            },
            speed: 20 + Math.random() * 25,
            heading: Math.random() * 360
          });
        }
        
        gpsDataMap.set(schedule.busId, {
          routeId: schedule.routeId,
          route,
          stopTimes: schedule.stopTimes,
          points,
          currentIndex: 0
        });
      }
    }

    unsubscribeRef.current.forEach(unsub => unsub());
    unsubscribeRef.current = [];

    defaultFitter.setCallback((offset, fittingResult) => {
      integrationService.processTrajectoryOffset(offset, fittingResult);
      offsetsBufferRef.current.push(offset);
    });

    const metricsUnsub = integrationService.subscribe('onPunctualityUpdate', (metrics) => {
      metricsBufferRef.current.push(metrics);
    });
    unsubscribeRef.current.push(metricsUnsub);

    const adjustmentUnsub = integrationService.subscribe('onScheduleAdjustment', ({ adjustment, reason }) => {
      adjustmentsBufferRef.current.push(adjustment);
      showNotification(`排班调整: ${reason}`, 'warning');
    });
    unsubscribeRef.current.push(adjustmentUnsub);

    let flushInterval = null;

    const interval = setInterval(() => {
      let hasMoreData = false;
      
      for (const [busId, busData] of gpsDataMap) {
        if (busData.currentIndex < busData.points.length) {
          const pointsToSend = busData.points.slice(
            busData.currentIndex,
            busData.currentIndex + 2
          );
          
          defaultFitter.addGPSPoints(
            busId,
            busData.routeId,
            pointsToSend,
            busData.route,
            busData.stopTimes
          );
          
          busData.currentIndex += 2;
          hasMoreData = true;
        }
      }
      
      if (!hasMoreData) {
        clearInterval(interval);
        if (flushInterval) {
          clearInterval(flushInterval);
        }
        flushBuffers();
        updateDBStats();
        setIsSimulating(false);
        simulationIntervalRef.current = null;
        isProcessingRef.current = false;
        showNotification('模拟完成！', 'success');
      }
    }, 1500);

    flushInterval = setInterval(() => {
      flushBuffers();
      updateDBStats();
    }, 2000);

    simulationIntervalRef.current = { interval, flushInterval };
  }, [routes, schedules, showNotification, updateDBStats, flushBuffers]);

  const stopSimulation = useCallback(() => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current.interval);
      if (simulationIntervalRef.current.flushInterval) {
        clearInterval(simulationIntervalRef.current.flushInterval);
      }
      simulationIntervalRef.current = null;
    }
    
    flushBuffers();
    setIsSimulating(false);
    defaultFitter.clearAll();
    isProcessingRef.current = false;
    showNotification('模拟已停止', 'info');
  }, [flushBuffers, showNotification]);

  useEffect(() => {
    initDB();
    loadExistingData();

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current.interval);
        if (simulationIntervalRef.current.flushInterval) {
          clearInterval(simulationIntervalRef.current.flushInterval);
        }
      }
      if (dbStatsTimeoutRef.current) {
        clearTimeout(dbStatsTimeoutRef.current);
      }
      unsubscribeRef.current.forEach(unsub => unsub());
      defaultFitter.clearAll();
    };
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const dbStatsLabel = useMemo(() => {
    return `站点: ${dbStats.stops || 0} | 线路: ${dbStats.routes || 0} | 客流: ${dbStats.passengerFlow || 0}`;
  }, [dbStats]);

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="static" sx={{ bgcolor: '#1976d2' }}>
        <Toolbar>
          <DirectionsBus sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            BusPulse - 公交运营智能分析系统
          </Typography>
          
          {!isInitialized && (
            <Button
              variant="contained"
              color="success"
              onClick={initializeData}
              startIcon={<Refresh />}
              sx={{ mr: 2 }}
            >
              初始化模拟数据
            </Button>
          )}
          
          {isInitialized && !isSimulating && (
            <Button
              variant="contained"
              color="success"
              onClick={startSimulation}
              startIcon={<PlayCircle />}
              sx={{ mr: 2 }}
            >
              开始模拟
            </Button>
          )}
          
          {isSimulating && (
            <Button
              variant="contained"
              color="error"
              onClick={stopSimulation}
              startIcon={<StopCircle />}
              sx={{ mr: 2 }}
            >
              停止模拟
            </Button>
          )}
          
          <Chip
            icon={<Storage />}
            label={dbStatsLabel}
            color="primary"
            variant="outlined"
            sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
          />
        </Toolbar>
      </AppBar>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ maxWidth: 600, mx: 'auto' }}
        >
          <Tab label="运营分析" />
          <Tab label="智能排班" />
        </Tabs>
      </Box>

      {!isInitialized ? (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '60vh'
          }}
        >
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" color="text.secondary">
            正在初始化系统...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            点击上方"初始化模拟数据"按钮开始
          </Typography>
        </Box>
      ) : (
        <>
          <TabPanel value={activeTab} index={0}>
            <OperationAnalysis
              metricsHistory={metricsHistory}
              trajectoryOffsets={trajectoryOffsets}
              passengerFlow={passengerFlow}
            />
          </TabPanel>
          
          <TabPanel value={activeTab} index={1}>
            <SchedulingSystem
              schedules={schedules}
              adjustments={adjustments}
            />
          </TabPanel>
        </>
      )}

      <Snackbar
        open={notification !== null}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.severity || 'info'}
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default React.memo(App);
