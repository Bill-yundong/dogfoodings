import { Component, onMount, onCleanup } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import { Navbar } from '@/components/layout/Navbar';
import { Dashboard } from '@/pages/Dashboard';
import { Sensors } from '@/pages/Sensors';
import { Alarms } from '@/pages/Alarms';
import { Analysis } from '@/pages/Analysis';
import { Settings } from '@/pages/Settings';
import { initDB } from '@/db';
import { DatabaseOperations } from '@/db/operations';
import { sensorState, setSensors, addSensorDataBatch, setStreaming } from '@/stores/sensorStore';
import { setCurrentBeltState, setTensionAnalysis } from '@/stores/beltStore';
import { addAlarm, alarmState } from '@/stores/alarmStore';
import { createDefaultSensors, generateSensorData, interpolateTemperatureProfile } from '@/services/sensorService';
import { analyzeTension } from '@/services/tensionAnalysis';
import { detectAlarms, deduplicateAlarms } from '@/services/anomalyDetection';
import { semanticSync } from '@/services/semanticSync';
import { settings, initSettings } from '@/stores/settingsStore';

let dbOps: DatabaseOperations | null = null;
let dataInterval: number;

const Layout: Component<{ children: any }> = (props) => (
  <div class="w-full h-full bg-industrial-900 flex">
    <Navbar />
    <main class="flex-1 ml-20 h-full overflow-hidden">
      {props.children}
    </main>
  </div>
);

const App: Component = () => {
  async function initializeSystem() {
    try {
      const db = await initDB();
      dbOps = new DatabaseOperations(db);
      
      const existingSensors = await dbOps.getSensors();
      if (existingSensors.length === 0) {
        const defaultSensors = createDefaultSensors();
        for (const sensor of defaultSensors) {
          await dbOps.addSensor(sensor);
        }
        setSensors(defaultSensors);
      } else {
        setSensors(existingSensors);
      }
      
      setCurrentBeltState({
        id: 'belt_001',
        length: 100,
        speed: 4.2,
        load: 75,
        tensionProfile: new Array(100).fill(50),
        temperatureProfile: new Array(100).fill(45),
        wearProfile: new Array(100).fill(3),
        isRunning: true,
        healthScore: 85,
      });
      
      startDataStreaming();
    } catch (error) {
      console.error('Failed to initialize system:', error);
    }
  }

  function startDataStreaming() {
    setStreaming(true);
    
    const processData = () => {
      if (!settings.autoRefresh) return;
      
      const sensorData = generateSensorData(sensorState.sensors);
      addSensorDataBatch(sensorData);
      
      semanticSync.publishBatch('sensor/data', sensorData);
      
      const analysis = analyzeTension(sensorData);
      setTensionAnalysis(analysis);
      
      const tempProfile = interpolateTemperatureProfile(sensorData, 100);
      setCurrentBeltState({
        id: 'belt_001',
        length: 100,
        speed: 4.2 + Math.random() * 0.2,
        load: 70 + Math.random() * 15,
        tensionProfile: analysis.profile,
        temperatureProfile: tempProfile,
        wearProfile: new Array(100).fill(3).map((v, i) => v + Math.sin(i * 0.1) * 1.5),
        isRunning: true,
        healthScore: analysis.healthScore,
      });
      
      const newAlarms = detectAlarms(sensorData, alarmState.thresholds);
      const uniqueAlarms = deduplicateAlarms(newAlarms, alarmState.alarms);
      uniqueAlarms.forEach((alarm) => addAlarm(alarm));
    };
    
    processData();
    dataInterval = window.setInterval(processData, settings.refreshInterval);
  }

  function stopDataStreaming() {
    if (dataInterval) {
      clearInterval(dataInterval);
    }
    setStreaming(false);
  }

  onMount(() => {
    initSettings();
    initializeSystem();
  });

  onCleanup(() => {
    stopDataStreaming();
    semanticSync.clear();
  });

  return (
    <Router>
      <Route path="/" component={() => <Layout><Dashboard /></Layout>} />
      <Route path="/sensors" component={() => <Layout><Sensors /></Layout>} />
      <Route path="/alarms" component={() => <Layout><Alarms /></Layout>} />
      <Route path="/analysis" component={() => <Layout><Analysis /></Layout>} />
      <Route path="/settings" component={() => <Layout><Settings /></Layout>} />
    </Router>
  );
};

export default App;
