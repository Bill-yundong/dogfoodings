<script>
</script>

<div class="space-y-4">
  <div class="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl">
    <div class="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xl">
      ✓
    </div>
    <div class="flex-1">
      <p class="text-sm font-medium text-white">IndexedDB 缓存</p>
      <p class="text-xs text-slate-500">路网数据本地持久化</p>
    </div>
    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
  </div>

  <div class="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl">
    <div class="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xl">
      ✓
    </div>
    <div class="flex-1">
      <p class="text-sm font-medium text-white">路网切片存储</p>
      <p class="text-xs text-slate-500">瓦片式缓存策略</p>
    </div>
    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
  </div>

  <div class="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl">
    <div class="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xl">
      ✓
    </div>
    <div class="flex-1">
      <p class="text-sm font-medium text-white">多终端语义同步</p>
      <p class="text-xs text-slate-500">实时数据一致性保证</p>
    </div>
    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
  </div>

  <div class="mt-4 p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-cyan-400">💡</span>
      <p class="text-xs text-cyan-400 font-medium">同步机制</p>
    </div>
    <p class="text-xs text-slate-400 leading-relaxed">
      基于版本向量的 CRDT 算法确保调度中心与洁净室终端间数据最终一致性，支持离线操作自动合并。
    </p>
  </div>
</div>
