<script lang="ts">
  import PantographMonitor from './components/PantographMonitor.svelte';
  import TrackGeometryMonitor from './components/TrackGeometryMonitor.svelte';
  import TrajectoryVisualizer from './components/TrajectoryVisualizer.svelte';
  import AlertPanel from './components/AlertPanel.svelte';
  import SystemStatus from './components/SystemStatus.svelte';
  import ControlPanel from './components/ControlPanel.svelte';
  import { isMonitoring, currentTrainId } from './lib/stores';
  import { pantographStates, trackParameters, trajectoryPoints, alerts } from './lib/stores';
  import {
    generatePantographState,
    generateTrackGeometryParameter,
    generateTrajectoryPoint,
    generateVisualFrame
  } from './lib/mockDataGenerator';
  import { disparityAlgorithm } from './lib/disparityAlgorithm';
  import { systemCoordination } from './lib/systemCoordination';

  let monitoring = $state(false);
  let trainId = $state('TRAIN-001');
  let currentTime = $state(new Date().toLocaleString('zh-CN'));
  let mileage = $state(0);

  let pantographInterval: ReturnType<typeof setInterval> | null = null;
  let trackInterval: ReturnType<typeof setInterval> | null = null;
  let trajectoryInterval: ReturnType<typeof setInterval> | null = null;
  let visualInterval: ReturnType<typeof setInterval> | null = null;

  $effect(() => {
    const unsub1 = isMonitoring.subscribe((m) => {
      monitoring = m;
    });
    const unsub2 = currentTrainId.subscribe((t) => {
      trainId = t;
    });
    return () => {
      unsub1();
      unsub2();
    };
  });

  $effect(() => {
    const timeInterval = setInterval(() => {
      currentTime = new Date().toLocaleString('zh-CN');
    }, 1000);
    return () => clearInterval(timeInterval);
  });

  $effect(() => {
    if (monitoring) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  });

  $effect(() => {
    disparityAlgorithm.onTrajectoryUpdate = async (point) => {
      await trajectoryPoints.add(point);
    };

    systemCoordination.onAlert = (alert) => {
      alerts.add(alert);
    };
  });

  function startMonitoring(): void {
    mileage = 0;

    pantographInterval = setInterval(async () => {
      const state = generatePantographState(trainId, 'PANTO-01', mileage);
      await pantographStates.add(state);

      if (state.status === 'warning' || state.status === 'critical') {
        await systemCoordination.createAlert(
          state.status === 'critical' ? 'critical' : 'warning',
          'pantograph',
          `受电弓状态异常: ${state.status === 'critical' ? '危急' : '警告'}`,
          state.trainId,
          mileage
        );
      }

      mileage += state.speed * 1000 / 3600;
    }, 1000);

    trackInterval = setInterval(async () => {
      const param = generateTrackGeometryParameter(
        `SEG-${Math.floor(mileage / 1000).toString().padStart(3, '0')}`,
        mileage
      );
      await trackParameters.add(param);

      if (param.condition === 'poor') {
        await systemCoordination.createAlert(
          'warning',
          'track',
          '轨道状况较差，建议减速',
          trainId,
          mileage
        );
      }
    }, 5000);

    trajectoryInterval = setInterval(async () => {
      const point = generateTrajectoryPoint(mileage, 300);
      await trajectoryPoints.add(point);
    }, 2000);

    visualInterval = setInterval(() => {
      const frame = generateVisualFrame(trainId, 'CAM-01');
      disparityAlgorithm.addFrame(frame);
    }, 4000);
  }

  function stopMonitoring(): void {
    if (pantographInterval) {
      clearInterval(pantographInterval);
      pantographInterval = null;
    }
    if (trackInterval) {
      clearInterval(trackInterval);
      trackInterval = null;
    }
    if (trajectoryInterval) {
      clearInterval(trajectoryInterval);
      trajectoryInterval = null;
    }
    if (visualInterval) {
      clearInterval(visualInterval);
      visualInterval = null;
    }
  }
</script>

<header class="header">
  <div class="header-content">
    <div class="header-title">
      <span class="header-logo">🚄</span>
      <div class="header-text">
        <h1>RailLogic</h1>
        <p>高铁弓网交互监测与行车保障系统</p>
      </div>
    </div>
    <div class="header-info">
      <div class="header-info-item">
        <span class="header-info-label">当前列车</span>
        <span class="header-info-value">{trainId}</span>
      </div>
      <div class="header-info-item">
        <span class="header-info-label">当前时间</span>
        <span class="header-info-value">{currentTime}</span>
      </div>
    </div>
  </div>
</header>

<main class="main">
  <div class="dashboard">
    <div class="dashboard-main">
      <PantographMonitor />
      <TrackGeometryMonitor />
      <TrajectoryVisualizer />
    </div>
    <div class="dashboard-sidebar">
      <ControlPanel />
      <SystemStatus />
      <AlertPanel />
    </div>
  </div>
</main>

<footer class="footer">
  <div class="footer-content">
    <span>RailLogic v1.0.0 - 高铁弓网交互监测系统</span>
    <span>基于 Svelte 5 + TypeScript + IndexedDB 构建</span>
  </div>
</footer>
