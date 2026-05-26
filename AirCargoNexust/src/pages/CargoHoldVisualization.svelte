<script lang="ts">
  import { onMount } from 'svelte';
  import { PlaneTakeoff, Gauge, Scale, Box, AlertTriangle } from 'lucide-svelte';
  import CargoHold3D from '@/components/CargoHold3D.svelte';
  import CGGauge from '@/components/CGGauge.svelte';
  import StatCard from '@/components/StatCard.svelte';
  import { cargos, currentLoadPlan, currentAircraft, loadAllData, addNotification } from '@/stores';
  import { DEFAULT_AIRCRAFT } from '@/data/aircraft';
  import { initDB } from '@/db';
  import { calculateCgPercentage, isCgWithinLimits } from '@/utils/calculations';
  import type { LoadPlan } from '@/types';

  let cargoHold3D = $state<InstanceType<typeof CargoHold3D> | null>(null);
  let isDbReady = $state(false);

  async function initialize() {
    try {
      await initDB();
      isDbReady = true;
      await loadAllData();
      currentAircraft.set(DEFAULT_AIRCRAFT);
    } catch (e) {
      console.error('初始化失败:', e);
      addNotification({ type: 'error', message: '数据库初始化失败' });
    }
  }

  onMount(() => {
    initialize();
  });

  let cgPercent = $derived($currentLoadPlan && $currentAircraft 
    ? calculateCgPercentage($currentLoadPlan.centerOfGravity.x, $currentAircraft)
    : 30);

  let cgStatus = $derived($currentLoadPlan && $currentAircraft
    ? isCgWithinLimits($currentLoadPlan.centerOfGravity, $currentAircraft)
    : { isValid: true, message: '暂无数据' });

  let statusLevel: 'normal' | 'warning' | 'danger' = $derived(cgStatus.isValid ? 'normal' : 'danger');

  let totalWeight = $derived($currentLoadPlan?.totalWeight || 0);
  let spaceUtil = $derived($currentLoadPlan ? ($currentLoadPlan.spaceUtilization * 100).toFixed(1) : '0.0');
  let fuelEff = $derived($currentLoadPlan ? ($currentLoadPlan.fuelEfficiency * 100).toFixed(1) : '0.0');
  let cargoCount = $derived($currentLoadPlan?.cargoPlacements.length || 0);

  function createDemoPlan(): LoadPlan {
    const demoPlacements = [];
    const selectedCargos = $cargos.slice(0, Math.min(8, $cargos.length));
    
    let x = 50;
    let y = -200;
    let z = 0;
    
    for (let i = 0; i < selectedCargos.length; i++) {
      const cargo = selectedCargos[i];
      if (x + cargo.dimensions.length > 3000) {
        x = 50;
        y += 150;
        if (y > 150) {
          y = -200;
          z += 120;
        }
      }
      
      demoPlacements.push({
        cargoId: cargo.id,
        position: { x, y, z },
        rotation: 0,
        zone: x < 1200 ? 'A' : x < 2400 ? 'B' : 'C'
      });
      
      x += cargo.dimensions.length + 20;
    }
    
    return {
      id: 'demo-plan',
      flightNumber: 'CA' + Math.floor(Math.random() * 9000 + 1000),
      aircraftType: 'B777F',
      timestamp: Date.now(),
      cargoPlacements: demoPlacements,
      centerOfGravity: { x: 1750, y: 0, z: 80 },
      totalWeight: selectedCargos.reduce((s, c) => s + c.weight, 0) + 144000,
      spaceUtilization: 0.35,
      fuelEfficiency: 0.92,
      score: 1250,
      status: 'draft'
    };
  }

  function loadDemoData() {
    if ($cargos.length === 0) {
      addNotification({ type: 'warning', message: '请先在货物管理页面添加货物' });
      return;
    }
    const demoPlan = createDemoPlan();
    currentLoadPlan.set(demoPlan);
    addNotification({ type: 'success', message: '已加载演示配载方案' });
  }
</script>

<div class="h-full flex flex-col">
  <header class="px-6 py-4 border-b border-dark-600 bg-dark-800" style="opacity: 0.5;">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display text-2xl font-bold text-white flex items-center gap-3">
          <Box class="w-7 h-7 text-aviation-500" />
          货舱可视化
        </h1>
        <p class="text-sm text-gray-400 mt-1">实时三维货舱模型与重心监控</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-3 py-2 bg-dark-700 rounded-lg">
          <PlaneTakeoff class="w-4 h-4 text-aviation-500" />
          <span class="text-sm text-white font-mono">{$currentAircraft?.type || 'B777F'}</span>
        </div>
        <button onclick={loadDemoData} class="btn-primary">
          加载演示方案
        </button>
      </div>
    </div>
  </header>

  <div class="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
    <div class="col-span-8 flex flex-col gap-4 overflow-hidden">
      <div class="flex-1 glass-panel overflow-hidden">
        {#if isDbReady && $currentAircraft}
          <CargoHold3D 
            bind:this={cargoHold3D}
            placements={$currentLoadPlan?.cargoPlacements || []}
            cargos={$cargos}
            aircraft={$currentAircraft}
          />
        {:else}
          <div class="h-full flex items-center justify-center text-gray-500">
            正在初始化...
          </div>
        {/if}
      </div>

      <div class="glass-panel p-4">
        <div class="hud-text mb-3">装载状态监控</div>
        <div class="grid grid-cols-4 gap-4">
          <StatCard 
            label="总重量" 
            value={totalWeight.toLocaleString()} 
            unit="kg"
            status={totalWeight > ($currentAircraft?.maxTakeoffWeight || 0) ? 'danger' : 'normal'}
          />
          <StatCard 
            label="空间利用率" 
            value={spaceUtil} 
            unit="%"
            trend={Number(spaceUtil) - 30}
          />
          <StatCard 
            label="燃油效率" 
            value={fuelEff} 
            unit="%"
            trend={Number(fuelEff) - 85}
          />
          <StatCard 
            label="货物数量" 
            value={cargoCount} 
            unit="件"
          />
        </div>
      </div>
    </div>

    <div class="col-span-4 flex flex-col gap-4 overflow-y-auto">
      <div class="glass-panel p-6">
        <div class="hud-text mb-4 text-center">重心指示器</div>
        <CGGauge 
          cgPercent={cgPercent}
          forwardLimit={$currentAircraft?.cgLimits.forward || 14}
          aftLimit={$currentAircraft?.cgLimits.aft || 46}
          size={220}
        />
        <div class="mt-4 text-center">
          <div class="flex items-center justify-center gap-2">
            <div 
              class="status-indicator"
              class:status-normal={cgStatus.isValid}
              class:status-danger={!cgStatus.isValid}
            ></div>
            <span class="text-sm" class:text-alert-green={cgStatus.isValid} class:text-alert-red={!cgStatus.isValid}>
              {cgStatus.message}
            </span>
          </div>
        </div>
      </div>

      <div class="glass-panel p-4">
        <div class="hud-text mb-3">重心坐标</div>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">纵向 (X)</span>
            <span class="text-white font-mono">{$currentLoadPlan?.centerOfGravity.x.toFixed(1) || '--'} cm</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">横向 (Y)</span>
            <span class="text-white font-mono">{$currentLoadPlan?.centerOfGravity.y.toFixed(1) || '--'} cm</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">垂直 (Z)</span>
            <span class="text-white font-mono">{$currentLoadPlan?.centerOfGravity.z.toFixed(1) || '--'} cm</span>
          </div>
        </div>
      </div>

      <div class="glass-panel p-4">
        <div class="hud-text mb-3">货舱分区</div>
        <div class="space-y-2">
          {#each $currentAircraft?.cargoZones || [] as zone}
            <div class="flex items-center justify-between p-2 bg-dark-700 rounded" style="opacity: 0.5;">
              <div class="flex items-center gap-2">
                <span 
                  class="w-3 h-3 rounded"
                  style="background: {zone.code === 'A' ? '#2a6f97' : zone.code === 'B' ? '#16537e' : '#0f3460'}"
                ></span>
                <span class="text-sm text-white">{zone.name}</span>
              </div>
              <span class="text-xs text-gray-400">{zone.code}</span>
            </div>
          {/each}
        </div>
      </div>

      <div class="glass-panel p-4">
        <div class="hud-text mb-3 flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 text-alert-orange" />
          操作提示
        </div>
        <ul class="text-xs text-gray-400 space-y-1">
          <li>• 拖拽旋转货舱视角</li>
          <li>• 滚轮缩放视图</li>
          <li>• 点击视角按钮快速切换</li>
          <li>• 前往配载计算页面优化方案</li>
        </ul>
      </div>
    </div>
  </div>
</div>
