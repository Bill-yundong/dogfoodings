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
  let pantographInterval: ReturnType<typeof setInterval> | null = null;
  let trackInterval: ReturnType<typeof setInterval> | null = null;
  let trajectoryInterval: ReturnType<typeof setInterval> | null = null;
  let visualInterval: ReturnType<typeof setInterval> | null = null;
  let mileage = $state(0);

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
    }, 500);
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

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
  <header class="bg-gray-900 border-b border-gray-700 shadow-lg">
    <div class="max-w-7xl mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="text-4xl">🚄</div>
          <div>
            <h1 class="text-2xl font-bold text-white">RailLogic</h1>
            <p class="text-gray-400 text-sm">高铁弓网交互监测与行车保障系统</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-right">
            <div class="text-gray-400 text-xs">当前列车</div>
            <div class="text-white font-semibold">{trainId}</div>
          </div>
          <div class="text-right">
            <div class="text-gray-400 text-xs">当前时间</div>
            <div class="text-white font-mono">
              {new Date().toLocaleString('zh-CN')}
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 py-6">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <PantographMonitor />
        <TrackGeometryMonitor />
        <TrajectoryVisualizer />
      </div>

      <div class="space-y-6">
        <ControlPanel />
        <SystemStatus />
        <AlertPanel />
      </div>
    </div>
  </main>

  <footer class="bg-gray-900 border-t border-gray-700 mt-8">
    <div class="max-w-7xl mx-auto px-4 py-4">
      <div class="flex items-center justify-between text-sm text-gray-500">
        <div>RailLogic v1.0.0 - 高铁弓网交互监测系统</div>
        <div>
          基于 Svelte 5 + TypeScript + IndexedDB 构建
        </div>
      </div>
    </div>
  </footer>
</div>
