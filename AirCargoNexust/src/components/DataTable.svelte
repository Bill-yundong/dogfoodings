<script lang="ts">
  import { ChevronUp, ChevronDown } from 'lucide-svelte';

  let {
    columns,
    data,
    selectable = false,
    selectedIds = $bindable(new Set<string>())
  }: {
    columns: Array<{
      key: string;
      label: string;
      sortable?: boolean;
      width?: string;
      render?: (value: unknown, row: Record<string, unknown>) => unknown;
    }>;
    data: Record<string, unknown>[];
    selectable?: boolean;
    selectedIds?: Set<string>;
  } = $props();
  
  let sortKey = $state<string | null>(null);
  let sortDirection = $state<'asc' | 'desc'>('asc');

  function handleSort(key: string) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDirection = 'asc';
    }
  }

  function toggleSelectAll() {
    if (!selectable) return;
    if (_selectedIds.size === data.length) {
      _selectedIds.clear();
    } else {
      data.forEach(row => {
        _selectedIds.add(row.id as string);
      });
    }
    _selectedIds = new Set(_selectedIds);
  }

  function toggleSelect(id: string) {
    if (!selectable) return;
    const newSet = new Set(_selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    _selectedIds = newSet;
  }

  let sortedData = $derived([...data].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    const aStr = String(aVal ?? '');
    const bStr = String(bVal ?? '');
    return sortDirection === 'asc' 
      ? aStr.localeCompare(bStr) 
      : bStr.localeCompare(aStr);
  }));
</script>

<div class="overflow-x-auto">
  <table class="w-full border-collapse">
    <thead>
      <tr class="bg-dark-700" style="opacity: 0.5;">
        {#if selectable}
          <th class="px-4 py-3 text-left">
            <input 
              type="checkbox"
              checked={_selectedIds.size === data.length && data.length > 0}
              onchange={toggleSelectAll}
              class="w-4 h-4 rounded border-dark-500 bg-dark-800 text-aviation-600 focus:ring-aviation-500"
            />
          </th>
        {/if}
        {#each columns as col}
          <th 
            class="px-4 py-3 text-left hud-text whitespace-nowrap"
            style={col.width ? `width: ${col.width}` : ''}
          >
            <div 
              class="flex items-center gap-1"
              class:cursor-pointer={col.sortable}
              onclick={col.sortable ? () => handleSort(col.key) : undefined}
            >
              {col.label}
              {#if col.sortable}
                <span class="text-gray-500">
                  {#if sortKey === col.key}
                    {#if sortDirection === 'asc'}
                      <ChevronUp class="w-4 h-4" />
                    {:else}
                      <ChevronDown class="w-4 h-4" />
                    {/if}
                  {/if}
                </span>
              {/if}
            </div>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody class="divide-y divide-dark-600">
      {#each sortedData as row (row.id)}
        <tr 
          class="transition-colors"
          style={selectable && selectedIds.has(row.id as string) ? 'background: rgba(10, 37, 64, 0.3)' : ''}
          onmouseenter={(e) => (e.currentTarget.style.background = 'rgba(37, 37, 66, 0.3)')}
          onmouseleave={(e) => (e.currentTarget.style.background = selectable && selectedIds.has(row.id as string) ? 'rgba(10, 37, 64, 0.3)' : '')}
        >
          {#if selectable}
            <td class="px-4 py-3">
              <input 
                type="checkbox"
                checked={_selectedIds.has(row.id as string)}
                onchange={() => toggleSelect(row.id as string)}
                onclick={(e) => e.stopPropagation()}
                class="w-4 h-4 rounded border-dark-500 bg-dark-800 text-aviation-600 focus:ring-aviation-500"
              />
            </td>
          {/if}
          {#each columns as col}
            <td class="px-4 py-3 text-sm text-gray-300">
              {#if col.render}
                {@const value = col.render(row[col.key], row)}
                {#if typeof value === 'string'}
                  {value}
                {:else}
                  {@html value as string}
                {/if}
              {:else}
                {row[col.key]}
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
      {#if data.length === 0}
        <tr>
          <td 
            colspan={columns.length + (selectable ? 1 : 0)} 
            class="px-4 py-12 text-center text-gray-500"
          >
            暂无数据
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
