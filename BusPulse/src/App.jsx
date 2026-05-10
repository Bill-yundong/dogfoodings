import React, { useState, useEffect, useCallback } from 'react';
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
  const [simulationInterval, setSimulationInterval] = useState(null);

  const showNotification = useCallback((message, severity = 'info') => {
    setNotification({ message, severity });
  }, []);

  const updateDBStats = useCallback(async () => {
    try {
      const stats = await getStats();
      setDbStats(stats);
    } catch (error) {
      console.error('Failed to get DB stats:', error);
    }
  }, []);

  const initializeData = useCallback(async () => {
    setIsInitialized(false);
    
    try {
      await initDB();
      await clearAllData();
      
      const mockData = generateFullMockDataset();
      
      await saveStopsInBatch(mockData.stops);
      
      for (const route of mockData.routes) {
        await saveRoute(route);
      }
      
      for (const schedule of mockData.schedules) {
        await saveSchedule(schedule);
      }
      
      await savePassengerFlowInBatch(mockData.passengerFlow);
      
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

    setIsSimulating(true);
    showNotification('开始模拟实时 GPS 数据...', 'info');

    let gpsDataIndex = 0;
    const gpsDataMap = new Map();

    for (const schedule of schedules) {
      const route = routes.find(r => r.id === schedule.routeId);
      if (route) {
        const isDelayed = Math.random() > 0.7;
        const startTime = schedule.startTime;
        
        const points = [];
        const path = route.routePath;
        const count = 15;
        const interval = 30000;
        
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
            timestamp: Date.now() + i * 500 + delayOffset,
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

    defaultFitter.setCallback((offset, fittingResult) => {
      integrationService.processTrajectoryOffset(offset, fittingResult);
      
      setTrajectoryOffsets(prev => {
        const updated = [...prev, offset];
        return updated.slice(-50);
      });
    });

    integrationService.subscribe('onPunctualityUpdate', (metrics) => {
      setMetricsHistory(prev => {
        const updated = [...prev, metrics];
        return updated.slice(-20);
      });
    });

    integrationService.subscribe('onScheduleAdjustment', ({ adjustment, reason }) => {
      setAdjustments(prev => [...prev, adjustment]);
      showNotification(`排班调整: ${reason}`, 'warning');
    });

    const interval = setInterval(() => {
      let hasMoreData = false;
      
      for (const [busId, busData] of gpsDataMap) {
        if (busData.currentIndex < busData.points.length) {
          const pointsToSend = busData.points.slice(
            busData.currentIndex,
            busData.currentIndex + 3
          );
          
          defaultFitter.addGPSPoints(
            busId,
            busData.routeId,
            pointsToSend,
            busData.route,
            busData.stopTimes
          );
          
          busData.currentIndex += 3;
          hasMoreData = true;
        }
      }
      
      updateDBStats();
      
      if (!hasMoreData) {
        clearInterval(interval);
        setIsSimulating(false);
        setSimulationInterval(null);
        showNotification('模拟完成！', 'success');
      }
    }, 1000);

    setSimulationInterval(interval);
  }, [routes, schedules, showNotification, updateDBStats]);

  const stopSimulation = useCallback(() => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      setSimulationInterval(null);
    }
    setIsSimulating(false);
    defaultFitter.clearAll();
    showNotification('模拟已停止', 'info');
  }, [simulationInterval, showNotification]);

  useEffect(() => {
    initDB();
    loadExistingData();

    return () => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
      defaultFitter.clearAll();
    };
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

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
            label={`站点: ${dbStats.stops || 0} | 线路: ${dbStats.routes || 0} | 客流: ${dbStats.passengerFlow || 0}`}
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

export default App;
