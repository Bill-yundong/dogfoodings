<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { ArrowLeft, Download, Clock, User, FileText, PlaneTakeoff } from 'lucide-svelte';
  import CargoHold3D from '@/components/CargoHold3D.svelte';
  import CGGauge from '@/components/CGGauge.svelte';
  import StatCard from '@/components/StatCard.svelte';
  import { cargos, currentAircraft, loadAllData } from '@/stores';
  import { DEFAULT_AIRCRAFT } from '@/data/aircraft';
  import * as db from '@/db';
  import type { LoadSnapshot } from '@/types';

  let { id } = $props();
  let snapshot = $state<LoadSnapshot | null>(null);
  let isLoading = $state(true);
  let isDbReady = $state(false);

  async function loadSnapshot() {
    isLoading = true;
    try {
      snapshot = await db.getSnapshotById(id) || null;
    } finally {
      isLoading = false;
    }
  }

  onMount(async () => {
    await db.initDB();
    isDbReady = true;
    await loadAllData();
    currentAircraft.set(DEFAULT_AIRCRAFT);
    loadSnapshot();
  });

  function goBack() {
    navigate('/snapshots');
  }

  function exportSnapshot() {
    if (!snapshot) return;
    const dataStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snapshot-${snapshot.planId}-v${snapshot.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="h-full flex flex-col">
  <header class="px-6 py-4 border-b border-dark-600 bg-dark-800" style="opacity: 0.5;">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button 
          onclick={goBack}
          class="p-2 hover:bg-dark-600 rounded-lg transition-colors"
        >
          <ArrowLeft class="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h1 class="font-display text-2xl font-bold text-white flex items-center gap-3">
            <FileText class="w-7 h-7 text-aviation-500" />
            快照详情
          </h1>
          <p class="text-sm text-gray-400 mt-1">
            航班 {snapshot?.payload.flightNumber || '加载中...'} · 版本 v{snapshot?.version || '-'}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick={exportSnapshot} class="btn-secondary flex items-center gap-2">
          <Download class="w-4 h-4" />
          导出 JSON
        </button>
      </div>
    </div>
  </header>

  {#if isLoading}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center text-gray-500">
        <div class="w-12 h-12 border-4 border-aviation-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" ></div>
        <p>正在加载快照数据...</p>
      </div>
    </div>
  {:else if !snapshot}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center text-gray-500">
        <FileText class="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p>快照不存在或已被删除</p>
        <button onclick={goBack} class="btn-primary mt-4">返回列表</button>
      </div>
    </div>
  {:else}
    <div class="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
      <div class="col-span-8 flex flex-col gap-4 overflow-hidden">
        <div class="glass-panel p-4">
          <div class="hud-text mb-3">基本信息</div>
          <div class="grid grid-cols-4 gap-4">
            <div>
              <div class="text-xs text-gray-500">航班号</div>
              <div class="text-white font-mono mt-1">{snapshot.payload.flightNumber}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500">机型</div>
              <div class="text-white font-mono mt-1 flex items-center gap-1">
                <PlaneTakeoff class="w-4 h-4 text-aviation-500" />
                {snapshot.payload.aircraftType}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500">创建时间</div>
              <div class="text-white font-mono mt-1 flex items-center gap-1">
                <Clock class="w-4 h-4 text-gray-400" />
                {new Date(snapshot.timestamp).toLocaleString('zh-CN')}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500">创建人</div>
              <div class="text-white font-mono mt-1 flex items-center gap-1">
                <User class="w-4 h-4 text-gray-400" />
                {snapshot.metadata.createdBy}
              </div>
            </div>
          </div>
          {#if snapshot.metadata.comment}
            <div class="mt-4 p-3 bg-dark-700 rounded-lg" style="opacity: 0.5;">
              <div class="text-xs text-gray-500 mb-1">备注</div>
              <div class="text-sm text-gray-300">{snapshot.metadata.comment}</div>
            </div>
          {/if}
        </div>

        <div class="flex-1 glass-panel overflow-hidden">
          {#if isDbReady && $currentAircraft}
            <CargoHold3D 
              placements={snapshot.payload.cargoPlacements}
              cargos={$cargos}
              aircraft={$currentAircraft}
            />
          {/if}
        </div>
      </div>

      <div class="col-span-4 flex flex-col gap-4 overflow-y-auto">
        <div class="glass-panel p-4">
          <div class="hud-text mb-3 text-center">重心状态</div>
          <CGGauge 
            cgPercent={((snapshot.payload.centerOfGravity.x / 3556) * 100)}
            forwardLimit={$currentAircraft?.cgLimits.forward || 14}
            aftLimit={$currentAircraft?.cgLimits.aft || 46}
            size={180}
          />
        </div>

        <div class="glass-panel p-4">
          <div class="hud-text mb-3">配载指标</div>
          <div class="space-y-3">
            <StatCard 
              label="总重量" 
              value={snapshot.payload.totalWeight.toLocaleString()} 
              unit="kg"
            />
            <StatCard 
              label="空间利用率" 
              value={(snapshot.payload.spaceUtilization * 100).toFixed(1)} 
              unit="%"
            />
            <StatCard 
              label="燃油效率" 
              value={(snapshot.payload.fuelEfficiency * 100).toFixed(1)} 
              unit="%"
            />
            <StatCard 
              label="货物数量" 
              value={snapshot.payload.cargoPlacements.length} 
              unit="件"
            />
            <StatCard 
              label="算法分数" 
              value={snapshot.payload.score.toFixed(0)} 
              unit="pts"
            />
          </div>
        </div>

        <div class="glass-panel p-4">
          <div class="hud-text mb-3">重心坐标</div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-400">纵向 (X)</span>
              <span class="text-white font-mono">{snapshot.payload.centerOfGravity.x.toFixed(1)} cm</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">横向 (Y)</span>
              <span class="text-white font-mono">{snapshot.payload.centerOfGravity.y.toFixed(1)} cm</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">垂直 (Z)</span>
              <span class="text-white font-mono">{snapshot.payload.centerOfGravity.z.toFixed(1)} cm</span>
            </div>
          </div>
        </div>

        <div class="glass-panel p-4">
          <div class="hud-text mb-3">货物清单</div>
          <div class="max-h-60 overflow-y-auto space-y-2">
            {#each snapshot.payload.cargoPlacements as placement}
              {@const cargo = $cargos.find(c => c.id === placement.cargoId)}
              <div class="p-2 bg-dark-700 rounded text-xs" style="opacity: 0.5;">
                <div class="flex justify-between items-center">
                  <span class="text-white truncate">{cargo?.name || placement.cargoId}</span>
                  <span class="text-gray-400 ml-2">{cargo?.weight || 0}kg</span>
                </div>
                <div class="text-gray-500 mt-1">
                  {placement.zone}区 · ({placement.position.x.toFixed(0)}, {placement.position.y.toFixed(0)}, {placement.position.z.toFixed(0)})
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
