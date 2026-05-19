<script lang="ts">
  import { onMount } from 'svelte';
  import { getRecentSnapshots, updateSnapshotTags, updateSnapshotNotes, deleteSnapshot } from '$lib/db/snapshot';
  import WaveformViewer from '$lib/components/charts/WaveformViewer.svelte';
  import type { WaveformSnapshot } from '$lib/types';

  let snapshots = $state<WaveformSnapshot[]>([]);
  let selectedSnapshot = $state<WaveformSnapshot | null>(null);
  let editingTags = $state<string | null>(null);
  let tagInput = $state('');
  let editingNotes = $state<string | null>(null);
  let notesInput = $state('');

  const loadSnapshots = async () => {
    snapshots = await getRecentSnapshots(50);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const duration = (start: number, end: number) => {
    return ((end - start) / 1000).toFixed(1) + 's';
  };

  const triggerTypeLabels: Record<string, string> = {
    oxygen_low: '氧含量过低',
    oxygen_high: '氧含量过高',
    oxygen_rapid_change: '氧含量突变',
    oxygen_drift: '氧含量漂移',
    efficiency_low: '效率过低',
    fan_mismatch: '风机转速偏差'
  };

  const startEditTags = (snapshot: WaveformSnapshot) => {
    editingTags = snapshot.id;
    tagInput = snapshot.tags.join(', ');
  };

  const saveTags = async (snapshot: WaveformSnapshot) => {
    const tags = tagInput.split(',').map((t) => t.trim()).filter((t) => t);
    await updateSnapshotTags(snapshot.id, tags);
    snapshot.tags = tags;
    editingTags = null;
  };

  const startEditNotes = (snapshot: WaveformSnapshot) => {
    editingNotes = snapshot.id;
    notesInput = snapshot.notes;
  };

  const saveNotes = async (snapshot: WaveformSnapshot) => {
    await updateSnapshotNotes(snapshot.id, notesInput);
    snapshot.notes = notesInput;
    editingNotes = null;
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除此快照吗？')) {
      await deleteSnapshot(id);
      if (selectedSnapshot?.id === id) {
        selectedSnapshot = null;
      }
      loadSnapshots();
    }
  };

  onMount(() => {
    loadSnapshots();
  });
</script>

<div class="p-6 h-full flex gap-6 overflow-hidden">
  <div class="w-96 flex-shrink-0 flex flex-col gap-4 overflow-hidden">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold text-white">异常波形快照</h2>
      <button
        class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all"
        onclick={loadSnapshots}
      >
        刷新
      </button>
    </div>

    <div class="flex-1 overflow-y-auto space-y-3 pr-2">
      {#if snapshots.length === 0}
        <div class="flex flex-col items-center justify-center h-64 text-slate-500">
          <div class="text-5xl mb-3">📸</div>
          <div class="text-lg">暂无快照数据</div>
          <div class="text-sm mt-1">启动系统后，异常事件将自动捕获</div>
        </div>
      {:else}
        {#each snapshots as snapshot (snapshot.id)}
          <button
            type="button"
            class={`p-4 rounded-xl border cursor-pointer transition-all text-left w-full ${
              selectedSnapshot?.id === snapshot.id
                ? 'bg-blue-600/20 border-blue-500/50'
                : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
            }`}
            onclick={() => (selectedSnapshot = snapshot)}
          >
            <div class="flex items-start justify-between mb-2">
              <div>
                <div class="text-sm font-medium text-slate-200">
                  {triggerTypeLabels[snapshot.triggerType] || snapshot.triggerType}
                </div>
                <div class="text-xs text-slate-500 font-mono mt-1">
                  {formatTime(snapshot.startTime)}
                </div>
              </div>
              <span class="text-xs text-slate-500">
                {duration(snapshot.startTime, snapshot.endTime)}
              </span>
            </div>

            <div class="flex items-center gap-2 text-xs">
              <span class="px-2 py-0.5 bg-slate-700/50 rounded text-slate-400">
                {snapshot.channels.length} 通道
              </span>
              {#if snapshot.tags.length > 0}
                <span class="px-2 py-0.5 bg-blue-600/20 rounded text-blue-400">
                  {snapshot.tags.length} 标签
                </span>
              {/if}
            </div>

            {#if snapshot.tags.length > 0}
              <div class="flex flex-wrap gap-1 mt-2">
                {#each snapshot.tags as tag}
                  <span class="px-2 py-0.5 bg-slate-700/30 rounded text-xs text-slate-400">{tag}</span>
                {/each}
              </div>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  </div>

  <div class="flex-1 overflow-y-auto space-y-4">
    {#if selectedSnapshot}
      <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-white">
              {triggerTypeLabels[selectedSnapshot.triggerType] || selectedSnapshot.triggerType}
            </h3>
            <p class="text-sm text-slate-500 mt-1">
              {formatTime(selectedSnapshot.startTime)} - {formatTime(selectedSnapshot.endTime)}
              <span class="mx-2">·</span>
              持续 {duration(selectedSnapshot.startTime, selectedSnapshot.endTime)}
            </p>
          </div>
          <button
            class="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium transition-all"
            onclick={() => handleDelete(selectedSnapshot.id)}
          >
            删除
          </button>
        </div>

        <WaveformViewer snapshot={selectedSnapshot} />

        <div class="mt-6 grid grid-cols-2 gap-6">
          <div>
            <div class="flex items-center justify-between mb-2">
              <label for="tagInput" class="text-sm font-medium text-slate-300">标签</label>
              {#if editingTags !== selectedSnapshot.id}
                <button
                  class="text-xs text-blue-400 hover:text-blue-300"
                  onclick={() => startEditTags(selectedSnapshot)}
                >
                  编辑
                </button>
              {/if}
            </div>
            {#if editingTags === selectedSnapshot.id}
              <div class="flex gap-2">
                <input
                  id="tagInput"
                  bind:value={tagInput}
                  class="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="用逗号分隔多个标签"
                />
                <button
                  class="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                  onclick={() => saveTags(selectedSnapshot)}
                >
                  保存
                </button>
                <button
                  class="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium"
                  onclick={() => (editingTags = null)}
                >
                  取消
                </button>
              </div>
            {:else}
              <div class="flex flex-wrap gap-2">
                {#if selectedSnapshot.tags.length === 0}
                  <span class="text-sm text-slate-500">暂无标签</span>
                {:else}
                  {#each selectedSnapshot.tags as tag}
                    <span class="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-sm text-blue-400">
                      {tag}
                    </span>
                  {/each}
                {/if}
              </div>
            {/if}
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label for="notesInput" class="text-sm font-medium text-slate-300">备注</label>
              {#if editingNotes !== selectedSnapshot.id}
                <button
                  class="text-xs text-blue-400 hover:text-blue-300"
                  onclick={() => startEditNotes(selectedSnapshot)}
                >
                  编辑
                </button>
              {/if}
            </div>
            {#if editingNotes === selectedSnapshot.id}
              <div class="flex flex-col gap-2">
                <textarea
                  id="notesInput"
                  bind:value={notesInput}
                  class="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 min-h-[80px]"
                  placeholder="添加备注信息..."
                ></textarea>
                <div class="flex gap-2 justify-end">
                  <button
                    class="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium"
                    onclick={() => (editingNotes = null)}
                  >
                    取消
                  </button>
                  <button
                    class="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                    onclick={() => saveNotes(selectedSnapshot)}
                  >
                    保存
                  </button>
                </div>
              </div>
            {:else}
              <p class="text-sm text-slate-400">
                {selectedSnapshot.notes || '暂无备注'}
              </p>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center h-64 text-slate-500">
        <div class="text-5xl mb-3">👈</div>
        <div class="text-lg">选择一个快照查看详情</div>
      </div>
    {/if}
  </div>
</div>
