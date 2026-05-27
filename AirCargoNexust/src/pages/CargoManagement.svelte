<script lang="ts">
  import { onMount } from 'svelte';
  import { Plus, Search, Trash2, Edit2, Filter, RefreshCw, Package } from 'lucide-svelte';
  import DataTable from '@/components/DataTable.svelte';
  import Modal from '@/components/Modal.svelte';
  import { cargos, addCargo, updateCargo, removeCargo, addNotification, loadAllData } from '@/stores';
  import { generateMockCargos } from '@/data/mockData';
  import * as db from '@/db';
  import { calculateCargoVolume } from '@/utils/calculations';
  import type { Cargo } from '@/types';

  let searchQuery = $state('');
  let localSelectedIds = $state(new Set<string>());

  let showAddModal = $state(false);
  let editingCargo = $state<Cargo | null>(null);
  let formData = $state({
    name: '',
    weight: 100,
    length: 100,
    width: 80,
    height: 60,
    priority: 5,
    isDangerous: false,
    preferredZone: '',
    forbiddenZones: [] as string[],
    maxStacking: 3
  });

  const columns = [
    { key: 'name', label: '货物名称', sortable: true },
    { 
      key: 'weight', 
      label: '重量', 
      sortable: true,
      render: (val: unknown) => `${val} kg`
    },
    { 
      key: 'dimensions', 
      label: '尺寸 (L×W×H)',
      render: (_: unknown, row: Record<string, unknown>) => {
        const dims = (row as Cargo).dimensions;
        return `${dims.length} × ${dims.width} × ${dims.height} cm`;
      }
    },
    { 
      key: 'volume', 
      label: '体积',
      render: (_: unknown, row: Record<string, unknown>) => {
        const volume = calculateCargoVolume(row as Cargo);
        return `${(volume / 1000000).toFixed(3)} m³`;
      }
    },
    { 
      key: 'priority', 
      label: '优先级', 
      sortable: true,
      render: (val: unknown) => {
        const p = val as number;
        let color = 'text-gray-400';
        if (p >= 8) color = 'text-alert-red';
        else if (p >= 5) color = 'text-alert-orange';
        return `<span class="${color} font-medium">${p}/10</span>`;
      }
    },
    { 
      key: 'isDangerous', 
      label: '危险品',
      render: (val: unknown) => {
        return val 
          ? '<span class="px-2 py-0.5 text-xs rounded bg-alert-orange/20 text-alert-orange">是</span>'
          : '<span class="px-2 py-0.5 text-xs rounded bg-dark-600 text-gray-400">否</span>';
      }
    },
    { 
      key: 'createdAt', 
      label: '创建时间', 
      sortable: true,
      render: (val: unknown) => new Date(val as number).toLocaleString('zh-CN')
    },
    {
      key: 'actions',
      label: '操作',
      render: (_: unknown, row: Record<string, unknown>) => {
        return `
          <button class="p-1 hover:bg-dark-600 rounded mr-1" data-action="edit" data-id="${row.id}">
            <svg class="w-4 h-4 text-aviation-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="p-1 hover:bg-dark-600 rounded" data-action="delete" data-id="${row.id}">
            <svg class="w-4 h-4 text-alert-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        `;
      }
    }
  ];

  let filteredCargos = $derived($cargos.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  ));

  let tableData = $derived(filteredCargos.map(c => ({
    ...c,
    id: c.id
  })));

  let totalWeight = $derived(filteredCargos.reduce((s, c) => s + c.weight, 0));
  let totalVolume = $derived(filteredCargos.reduce((s, c) => s + calculateCargoVolume(c), 0));

  onMount(async () => {
    await loadAllData();
    if ($cargos.length === 0) {
      await generateDemoData();
    }
  });

  async function generateDemoData() {
    const mockCargos = generateMockCargos(30);
    await db.saveCargosBatch(mockCargos);
    await loadAllData();
    addNotification({ type: 'success', message: `已生成 ${mockCargos.length} 条演示数据` });
  }

  function openAddModal() {
    editingCargo = null;
    formData = {
      name: '',
      weight: 100,
      length: 100,
      width: 80,
      height: 60,
      priority: 5,
      isDangerous: false,
      preferredZone: '',
      forbiddenZones: [],
      maxStacking: 3
    };
    showAddModal = true;
  }

  function openEditModal(cargo: Cargo) {
    editingCargo = cargo;
    formData = {
      name: cargo.name,
      weight: cargo.weight,
      length: cargo.dimensions.length,
      width: cargo.dimensions.width,
      height: cargo.dimensions.height,
      priority: cargo.priority,
      isDangerous: cargo.isDangerous,
      preferredZone: cargo.constraints?.preferredZone || '',
      forbiddenZones: cargo.constraints?.forbiddenZones || [],
      maxStacking: cargo.constraints?.maxStacking || 3
    };
    showAddModal = true;
  }

  async function handleSubmit() {
    if (!formData.name.trim()) {
      addNotification({ type: 'warning', message: '请输入货物名称' });
      return;
    }

    const cargoData = {
      name: formData.name.trim(),
      weight: formData.weight,
      dimensions: {
        length: formData.length,
        width: formData.width,
        height: formData.height
      },
      priority: formData.priority,
      isDangerous: formData.isDangerous,
      constraints: {
        preferredZone: formData.preferredZone || undefined,
        forbiddenZones: formData.forbiddenZones.length > 0 ? formData.forbiddenZones : undefined,
        maxStacking: formData.maxStacking
      }
    };

    if (editingCargo) {
      await updateCargo({ ...editingCargo, ...cargoData });
    } else {
      await addCargo(cargoData);
    }

    showAddModal = false;
  }

  async function handleDelete(id: string) {
    if (confirm('确定要删除该货物吗？')) {
      await removeCargo(id);
    }
  }

  function handleTableClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const actionBtn = target.closest('[data-action]') as HTMLElement;
    if (!actionBtn) return;

    const action = actionBtn.getAttribute('data-action');
    const id = actionBtn.getAttribute('data-id');
    
    if (action === 'edit' && id) {
      const cargo = $cargos.find(c => c.id === id);
      if (cargo) openEditModal(cargo);
    } else if (action === 'delete' && id) {
      handleDelete(id);
    }
  }

  async function deleteSelected() {
    if (localSelectedIds.size === 0) return;
    if (confirm(`确定要删除选中的 ${localSelectedIds.size} 条货物吗？`)) {
      for (const id of Array.from(localSelectedIds)) {
        await db.deleteCargo(id);
      }
      await loadAllData();
      localSelectedIds = new Set();
      addNotification({ type: 'success', message: '已删除选中货物' });
    }
  }
</script>

<div class="h-full flex flex-col">
  <header class="px-6 py-4 border-b border-dark-600 bg-dark-800" style="opacity: 0.5;">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display text-2xl font-bold text-white flex items-center gap-3">
          <Package class="w-7 h-7 text-aviation-500" />
          货物管理
        </h1>
        <p class="text-sm text-gray-400 mt-1">管理待装载货物信息与约束条件</p>
      </div>
      <div class="flex items-center gap-3">
        <button onclick={generateDemoData} class="btn-secondary flex items-center gap-2">
          <RefreshCw class="w-4 h-4" />
          生成演示数据
        </button>
        <button onclick={openAddModal} class="btn-primary flex items-center gap-2">
          <Plus class="w-4 h-4" />
          添加货物
        </button>
      </div>
    </div>
  </header>

  <div class="p-4 flex flex-col gap-4 flex-1 overflow-hidden">
    <div class="grid grid-cols-4 gap-4">
      <div class="glass-panel p-4">
        <div class="hud-text">货物总数</div>
        <div class="font-display text-2xl font-bold text-white mt-1">{$cargos.length}</div>
      </div>
      <div class="glass-panel p-4">
        <div class="hud-text">总重量</div>
        <div class="font-display text-2xl font-bold text-white mt-1">{totalWeight.toLocaleString()} kg</div>
      </div>
      <div class="glass-panel p-4">
        <div class="hud-text">总体积</div>
        <div class="font-display text-2xl font-bold text-white mt-1">{(totalVolume / 1000000).toFixed(2)} m³</div>
      </div>
      <div class="glass-panel p-4">
        <div class="hud-text">危险品</div>
        <div class="font-display text-2xl font-bold text-alert-orange mt-1">
          {$cargos.filter(c => c.isDangerous).length}
        </div>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <div class="flex-1 relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input 
          type="text"
          bind:value={searchQuery}
          placeholder="搜索货物名称..."
          class="input-field pl-10"
        />
      </div>
      <button class="btn-secondary flex items-center gap-2">
        <Filter class="w-4 h-4" />
        筛选
      </button>
      {#if localSelectedIds.size > 0}
        <button onclick={deleteSelected} class="btn-danger flex items-center gap-2">
          <Trash2 class="w-4 h-4" />
          删除选中 ({localSelectedIds.size})
        </button>
      {/if}
    </div>

    <div class="flex-1 glass-panel overflow-hidden" onclick={handleTableClick}>
      <DataTable 
        {columns}
        data={tableData as Record<string, unknown>[]}
        selectable={true}
        bind:selectedIds={localSelectedIds}
      />
    </div>
  </div>
</div>

<Modal 
  bind:open={showAddModal}
  title={editingCargo ? '编辑货物' : '添加货物'}
  size="lg"
>
  <div class="grid grid-cols-2 gap-4">
    <div class="col-span-2">
      <label class="hud-text block mb-1">货物名称</label>
      <input 
        type="text"
        bind:value={formData.name}
        class="input-field"
        placeholder="例如：电子产品箱-A001"
      />
    </div>
    <div>
      <label class="hud-text block mb-1">重量 (kg)</label>
      <input 
        type="number"
        bind:value={formData.weight}
        class="input-field"
        min="1"
      />
    </div>
    <div>
      <label class="hud-text block mb-1">优先级 (1-10)</label>
      <input 
        type="number"
        bind:value={formData.priority}
        class="input-field"
        min="1"
        max="10"
      />
    </div>
    <div class="col-span-2">
      <label class="hud-text block mb-2">尺寸 (cm)</label>
      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="text-xs text-gray-500">长</label>
          <input type="number" bind:value={formData.length} class="input-field mt-1" min="1" />
        </div>
        <div>
          <label class="text-xs text-gray-500">宽</label>
          <input type="number" bind:value={formData.width} class="input-field mt-1" min="1" />
        </div>
        <div>
          <label class="text-xs text-gray-500">高</label>
          <input type="number" bind:value={formData.height} class="input-field mt-1" min="1" />
        </div>
      </div>
    </div>
    <div>
      <label class="hud-text block mb-1">最大堆叠层数</label>
      <input 
        type="number"
        bind:value={formData.maxStacking}
        class="input-field"
        min="1"
        max="10"
      />
    </div>
    <div class="flex items-end">
      <label class="flex items-center gap-2 cursor-pointer">
        <input 
          type="checkbox"
          bind:checked={formData.isDangerous}
          class="w-4 h-4 rounded border-dark-500 bg-dark-800 text-alert-orange focus:ring-alert-orange"
        />
        <span class="text-sm text-alert-orange">危险品</span>
      </label>
    </div>
    <div>
      <label class="hud-text block mb-1">优先区域</label>
      <select bind:value={formData.preferredZone} class="input-field">
        <option value="">无偏好</option>
        <option value="A">A区 - 前货舱</option>
        <option value="B">B区 - 中货舱</option>
        <option value="C">C区 - 后货舱</option>
      </select>
    </div>
    <div>
      <label class="hud-text block mb-1">禁止区域</label>
      <div class="flex gap-2">
        {#each ['A', 'B', 'C'] as zone}
          <label class="flex items-center gap-1 cursor-pointer">
            <input 
              type="checkbox"
              checked={formData.forbiddenZones.includes(zone)}
              onchange={() => {
                if (formData.forbiddenZones.includes(zone)) {
                  formData.forbiddenZones = formData.forbiddenZones.filter(z => z !== zone);
                } else {
                  formData.forbiddenZones = [...formData.forbiddenZones, zone];
                }
              }}
              class="w-4 h-4 rounded border-dark-500 bg-dark-800 text-alert-red focus:ring-alert-red"
            />
            <span class="text-sm text-gray-300">{zone}区</span>
          </label>
        {/each}
      </div>
    </div>
  </div>
  <div slot="footer">
    <button onclick={() => showAddModal = false} class="btn-secondary">取消</button>
    <button onclick={handleSubmit} class="btn-primary">
      {editingCargo ? '保存修改' : '添加货物'}
    </button>
  </div>
</Modal>
