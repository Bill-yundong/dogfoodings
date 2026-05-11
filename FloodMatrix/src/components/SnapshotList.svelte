<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let snapshots = [];

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('zh-CN');
  }

  function handleLoad(snapshot) {
    dispatch('load', snapshot);
  }

  function handleDelete(id) {
    dispatch('delete', id);
  }
</script>

<div class="snapshot-list">
  <h3>📋 历史快照</h3>

  {#if snapshots.length === 0}
    <div class="empty-state">
      <p>暂无保存的快照</p>
    </div>
  {:else}
    <div class="snapshot-items">
      {#each snapshots as snapshot}
        <div class="snapshot-item">
          <div class="snapshot-info">
            <h4>{snapshot.name}</h4>
            <p class="date">{formatDate(snapshot.timestamp)}</p>
            <p class="meta">
              降雨: {snapshot.rainfallData.intensity}mm/h |
              涝区: {snapshot.simulationResult.floodAreas.length}处
            </p>
          </div>
          <div class="snapshot-actions">
            <button class="btn-load" on:click={() => handleLoad(snapshot)}>加载</button>
            <button class="btn-delete" on:click={() => handleDelete(snapshot.id)}>删除</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .snapshot-list {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 12px;
    padding: 20px;
    color: #e2e8f0;
    border: 1px solid #334155;
    max-height: 400px;
    overflow-y: auto;
  }

  h3 {
    margin: 0 0 15px 0;
    font-size: 1.2rem;
    color: #60a5fa;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #64748b;
  }

  .snapshot-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .snapshot-item {
    background: rgba(30, 41, 59, 0.8);
    border-radius: 8px;
    padding: 15px;
    border: 1px solid #334155;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.2s ease;
  }

  .snapshot-item:hover {
    border-color: #3b82f6;
    transform: translateX(4px);
  }

  .snapshot-info h4 {
    margin: 0 0 5px 0;
    font-size: 0.95rem;
  }

  .snapshot-info .date {
    margin: 0 0 4px 0;
    font-size: 0.8rem;
    color: #94a3b8;
  }

  .snapshot-info .meta {
    margin: 0;
    font-size: 0.75rem;
    color: #64748b;
  }

  .snapshot-actions {
    display: flex;
    gap: 8px;
  }

  button {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-load {
    background: #3b82f6;
    color: white;
  }

  .btn-load:hover {
    background: #2563eb;
  }

  .btn-delete {
    background: #475569;
    color: #e2e8f0;
  }

  .btn-delete:hover {
    background: #ef4444;
  }

  .snapshot-list::-webkit-scrollbar {
    width: 6px;
  }

  .snapshot-list::-webkit-scrollbar-track {
    background: #1e293b;
  }

  .snapshot-list::-webkit-scrollbar-thumb {
    background: #475569;
    border-radius: 3px;
  }
</style>
