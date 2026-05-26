<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { Camera, Search, Filter, Clock, User, FileText, Eye } from 'lucide-svelte';
  import DataTable from '@/components/DataTable.svelte';
  import { snapshots, loadPlans, loadAllData, addNotification } from '@/stores';
  import * as db from '@/db';
  import type { LoadSnapshot, LoadPlan } from '@/types';

  let searchQuery = $state('');

  const columns = [
    { key: 'flightNumber', label: '航班号', sortable: true },
    { key: 'aircraftType', label: '机型', sortable: true },
    { 
      key: 'version', 
      label: '版本',
      render: (val: unknown) => `v${val}`
    },
    { 
      key: 'cargoCount', 
      label: '货物数量',
      render: (_: unknown, row: Record<string, unknown>) => {
        const snapshot = row as unknown as LoadSnapshot;
        return `${snapshot.payload.cargoPlacements.length} 件`;
      }
    },
    { 
      key: 'totalWeight', 
      label: '总重量',
      render: (_: unknown, row: Record<string, unknown>) => {
        const snapshot = row as unknown as LoadSnapshot;
        return `${snapshot.payload.totalWeight.toLocaleString()} kg`;
      }
    },
    { 
      key: 'cgPercent', 
      label: '重心',
      render: (_: unknown, row: Record<string, unknown>) => {
        const snapshot = row as unknown as LoadSnapshot;
        return `${((snapshot.payload.centerOfGravity.x / 3556) * 100).toFixed(1)}% MAC`;
      }
    },
    { 
      key: 'createdBy', 
      label: '创建人',
      render: (_: unknown, row: Record<string, unknown>) => {
        const snapshot = row as unknown as LoadSnapshot;
        return snapshot.metadata.createdBy;
      }
    },
    { 
      key: 'timestamp', 
      label: '创建时间', 
      sortable: true,
      render: (val: unknown) => new Date(val as number).toLocaleString('zh-CN')
    },
    {
      key: 'actions',
      label: '操作',
      render: (_: unknown, row: Record<string, unknown>) => {
        return `
          <button class="p-1 hover:bg-dark-600 rounded" data-action="view" data-id="${row.id}">
            <svg class="w-4 h-4 text-aviation-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </button>
        `;
      }
    }
  ];

  let filteredSnapshots = $derived($snapshots.filter(s => {
    const plan = $loadPlans.find(p => p.id === s.planId);
    const flightNumber = plan?.flightNumber || '';
    return flightNumber.toLowerCase().includes(searchQuery.toLowerCase());
  }));

  let tableData = $derived(filteredSnapshots.map(s => ({
    ...s,
    id: s.id,
    flightNumber: $loadPlans.find(p => p.id === s.planId)?.flightNumber || 'N/A',
    aircraftType: s.payload.aircraftType
  })));

  onMount(async () => {
    await loadAllData();
  });

  function handleTableClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const actionBtn = target.closest('[data-action]') as HTMLElement;
    if (!actionBtn) return;

    const action = actionBtn.getAttribute('data-action');
    const id = actionBtn.getAttribute('data-id');
    
    if (action === 'view' && id) {
      navigate(`/snapshot/${id}`);
    }
  }
</script>

<div class="h-full flex flex-col">
  <header class="px-6 py-4 border-b border-dark-600 bg-dark-800" style="opacity: 0.5;">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display text-2xl font-bold text-white flex items-center gap-3">
          <Camera class="w-7 h-7 text-aviation-500" />
          配载快照
        </h1>
        <p class="text-sm text-gray-400 mt-1">历史配载方案的时空快照记录</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-sm text-gray-400">
          共 {$snapshots.length} 条快照记录
        </div>
      </div>
    </div>
  </header>

  <div class="p-4 flex flex-col gap-4 flex-1 overflow-hidden">
    <div class="grid grid-cols-4 gap-4">
      <div class="glass-panel p-4">
        <div class="hud-text">快照总数</div>
        <div class="font-display text-2xl font-bold text-white mt-1">{$snapshots.length}</div>
      </div>
      <div class="glass-panel p-4">
        <div class="hud-text">配载方案</div>
        <div class="font-display text-2xl font-bold text-aviation-500 mt-1">{$loadPlans.length}</div>
      </div>
      <div class="glass-panel p-4">
        <div class="hud-text">已确认方案</div>
        <div class="font-display text-2xl font-bold text-alert-green mt-1">
          {$loadPlans.filter(p => p.status === 'confirmed').length}
        </div>
      </div>
      <div class="glass-panel p-4">
        <div class="hud-text">最新快照</div>
        <div class="text-sm text-white mt-1">
          {$snapshots.length > 0 
            ? new Date(Math.max(...$snapshots.map(s => s.timestamp))).toLocaleDateString('zh-CN')
            : '暂无'}
        </div>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <div class="flex-1 relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input 
          type="text"
          bind:value={searchQuery}
          placeholder="搜索航班号..."
          class="input-field pl-10"
        />
      </div>
      <button class="btn-secondary flex items-center gap-2">
        <Filter class="w-4 h-4" />
        筛选
      </button>
    </div>

    <div class="flex-1 glass-panel overflow-hidden" onclick={handleTableClick}>
      <DataTable 
        {columns}
        data={tableData as Record<string, unknown>[]}
      />
    </div>
  </div>
</div>
