<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Calculator, Play, Pause, Square, Save, Clock, Zap, Target } from 'lucide-svelte';
  import ProgressBar from '@/components/ProgressBar.svelte';
  import StatCard from '@/components/StatCard.svelte';
  import CGGauge from '@/components/CGGauge.svelte';
  import Modal from '@/components/Modal.svelte';
  import { 
    cargos, 
    selectedCargoIds, 
    selectedCargos, 
    totalSelectedWeight,
    currentLoadPlan, 
    currentAircraft, 
    algorithmProgress,
    addNotification,
    savePlan,
    createSnapshot,
    loadAllData
  } from '@/stores';
  import { DEFAULT_AIRCRAFT } from '@/data/aircraft';
  import { calculateCgPercentage, generateId } from '@/utils/calculations';
  import type { LoadPlan, AlgorithmConfig, CargoPlacement, Cargo } from '@/types';

  let worker: Worker | null = null;
  let showSaveModal = $state(false);
  let comment = $state('');
  let algorithmConfig = $state<AlgorithmConfig>({
    maxIterations: 5000,
    timeLimitMs: 30000,
    optimalCgX: 30,
    cgWeight: 100,
    balanceWeight: 50,
    spaceWeight: 200,
    priorityWeight: 10
  });

  let solutions = $state<LoadPlan[]>([]);
  let selectedSolutionIndex = $state(0);

  onMount(async () => {
    await loadAllData();
    if ($cargos.length > 0 && $selectedCargoIds.size === 0) {
      const newSet = new Set($selectedCargoIds);
      $cargos.slice(0, 15).forEach(c => newSet.add(c.id));
      selectedCargoIds.set(newSet);
    }
    currentAircraft.set(DEFAULT_AIRCRAFT);
    initWorker();
  });

  onDestroy(() => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  });

  function initWorker() {
    worker = new Worker(new URL('@/workers/loadAlgorithm.worker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      
      if (type === 'progress') {
        algorithmProgress.set(payload);
        if (payload.bestSolution) {
          currentLoadPlan.set(payload.bestSolution);
        }
      } else if (type === 'result' && payload) {
        const plan = payload as LoadPlan;
        currentLoadPlan.set(plan);
        solutions = [plan, ...solutions].slice(0, 5);
        addNotification({ type: 'success', message: '算法计算完成' });
      }
    };
  }

  function startCalculation() {
    if (!$currentAircraft) return;
    if ($selectedCargos.length === 0) {
      addNotification({ type: 'warning', message: '请先选择要配载的货物' });
      return;
    }

    if (!worker) initWorker();
    if (!worker) return;

    worker.postMessage({
      type: 'config',
      payload: {
        cargos: $selectedCargos,
        aircraft: $currentAircraft,
        settings: algorithmConfig
      }
    });

    worker.postMessage({ type: 'start' });
    solutions = [];
    addNotification({ type: 'info', message: '开始配载计算...' });
  }

  function pauseCalculation() {
    worker?.postMessage({ type: 'pause' });
    addNotification({ type: 'info', message: '已暂停计算' });
  }

  function resumeCalculation() {
    worker?.postMessage({ type: 'resume' });
    addNotification({ type: 'info', message: '继续计算' });
  }

  function stopCalculation() {
    worker?.postMessage({ type: 'stop' });
    addNotification({ type: 'info', message: '已停止计算' });
  }

  async function handleSavePlan() {
    if (!$currentLoadPlan) return;
    
    const planToSave: LoadPlan = {
      ...$currentLoadPlan,
      id: generateId(),
      status: 'confirmed'
    };
    
    await savePlan(planToSave);
    if (comment.trim()) {
      await createSnapshot(planToSave.id, comment.trim());
    }
    
    showSaveModal = false;
    comment = '';
  }

  function selectSolution(index: number) {
    selectedSolutionIndex = index;
    if (solutions[index]) {
      currentLoadPlan.set(solutions[index]);
    }
  }

  let cgPercent = $derived($currentLoadPlan && $currentAircraft
    ? calculateCgPercentage($currentLoadPlan.centerOfGravity.x, $currentAircraft)
    : 30);

  let isRunning = $derived($algorithmProgress.status === 'running');
  let isPaused = $derived($algorithmProgress.status === 'paused');
  let isCompleted = $derived($algorithmProgress.status === 'completed');

  let formattedElapsed = $derived(`${Math.floor($algorithmProgress.elapsedMs / 1000)}s`);
</script>

<div class="h-full flex flex-col">
  <header class="px-6 py-4 border-b border-dark-600 bg-dark-800" style="opacity: 0.5;">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display text-2xl font-bold text-white flex items-center gap-3">
          <Calculator class="w-7 h-7 text-aviation-500" />
          配载计算
        </h1>
        <p class="text-sm text-gray-400 mt-1">异步分支定界启发式算法求解最优配载方案</p>
      </div>
      <div class="flex items-center gap-2">
        {#if !isRunning && !isPaused}
          <button onclick={startCalculation} class="btn-primary flex items-center gap-2">
            <Play class="w-4 h-4" />
            开始计算
          </button>
        {:else if isRunning}
          <button onclick={pauseCalculation} class="btn-secondary flex items-center gap-2">
            <Pause class="w-4 h-4" />
            暂停
          </button>
          <button onclick={stopCalculation} class="btn-danger flex items-center gap-2">
            <Square class="w-4 h-4" />
            停止
          </button>
        {:else if isPaused}
          <button onclick={resumeCalculation} class="btn-primary flex items-center gap-2">
            <Play class="w-4 h-4" />
            继续
          </button>
          <button onclick={stopCalculation} class="btn-danger flex items-center gap-2">
            <Square class="w-4 h-4" />
            停止
          </button>
        {/if}
        {#if $currentLoadPlan && (isCompleted || $currentLoadPlan.cargoPlacements.length > 0)}
          <button onclick={() => showSaveModal = true} class="btn-primary flex items-center gap-2">
            <Save class="w-4 h-4" />
            保存方案
          </button>
        {/if}
      </div>
    </div>
  </header>

  <div class="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
    <div class="col-span-3 flex flex-col gap-4 overflow-y-auto">
      <div class="glass-panel p-4">
        <div class="hud-text mb-3">算法参数</div>
        <div class="space-y-4">
          <div>
            <label class="hud-text block mb-1">最大迭代次数</label>
            <input 
              type="number"
              bind:value={algorithmConfig.maxIterations}
              class="input-field"
              min="1000"
              max="50000"
              step="1000"
            />
          </div>
          <div>
            <label class="hud-text block mb-1">时间限制 (秒)</label>
            <input 
              type="number"
              bind:value={algorithmConfig.timeLimitMs}
              class="input-field"
              min="5000"
              max="120000"
              step="5000"
            />
          </div>
          <div>
            <label class="hud-text block mb-1">最优目标 CG (%)</label>
            <input 
              type="number"
              bind:value={algorithmConfig.optimalCgX}
              class="input-field"
              min="10"
              max="50"
              step="1"
            />
          </div>
          <div>
            <label class="hud-text block mb-1">重心权重</label>
            <input 
              type="range"
              bind:value={algorithmConfig.cgWeight}
              min="0"
              max="500"
              class="w-full"
            />
            <div class="text-xs text-gray-500 text-right">{algorithmConfig.cgWeight}</div>
          </div>
          <div>
            <label class="hud-text block mb-1">平衡权重</label>
            <input 
              type="range"
              bind:value={algorithmConfig.balanceWeight}
              min="0"
              max="200"
              class="w-full"
            />
            <div class="text-xs text-gray-500 text-right">{algorithmConfig.balanceWeight}</div>
          </div>
          <div>
            <label class="hud-text block mb-1">空间权重</label>
            <input 
              type="range"
              bind:value={algorithmConfig.spaceWeight}
              min="0"
              max="500"
              class="w-full"
            />
            <div class="text-xs text-gray-500 text-right">{algorithmConfig.spaceWeight}</div>
          </div>
        </div>
      </div>

      <div class="glass-panel p-4">
        <div class="hud-text mb-3">已选货物</div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-gray-400">{$selectedCargos.length} 件货物</span>
          <span class="text-sm text-white font-mono">{$totalSelectedWeight.toLocaleString()} kg</span>
        </div>
        <div class="max-h-60 overflow-y-auto space-y-1">
          {#each $selectedCargos as cargo (cargo.id)}
            <div class="flex items-center justify-between p-2 bg-dark-700 rounded text-xs" style="opacity: 0.5;">
              <span class="text-white truncate flex-1">{cargo.name}</span>
              <span class="text-gray-400 ml-2">{cargo.weight}kg</span>
            </div>
          {/each}
        </div>
        <p class="text-xs text-gray-500 mt-3">在货物管理页面选择货物</p>
      </div>
    </div>

    <div class="col-span-6 flex flex-col gap-4 overflow-hidden">
      <div class="glass-panel p-4">
        <div class="hud-text mb-3 flex items-center gap-2">
          <Clock class="w-4 h-4 text-aviation-500" />
          计算进度
        </div>
        <ProgressBar 
          value={$algorithmProgress.solutionsEvaluated}
          max={algorithmConfig.maxIterations}
        />
        <div class="grid grid-cols-3 gap-4 mt-4">
          <div class="text-center">
            <div class="text-2xl font-display font-bold text-white">{$algorithmProgress.solutionsEvaluated.toLocaleString()}</div>
            <div class="text-xs text-gray-500">已评估方案</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-display font-bold text-alert-green">{formattedElapsed}</div>
            <div class="text-xs text-gray-500">耗时</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-display font-bold text-alert-orange">{$algorithmProgress.bestScore === Infinity ? '--' : $algorithmProgress.bestScore.toFixed(0)}</div>
            <div class="text-xs text-gray-500">最佳分数</div>
          </div>
        </div>
      </div>

      <div class="glass-panel p-4 flex-1 overflow-hidden flex flex-col">
        <div class="hud-text mb-3 flex items-center gap-2">
          <Zap class="w-4 h-4 text-alert-orange" />
          候选方案
        </div>
        {#if solutions.length > 0}
          <div class="grid grid-cols-1 gap-3 overflow-y-auto flex-1">
            {#each solutions as solution, index}
              <div 
                onclick={() => selectSolution(index)}
                class="p-4 rounded-lg border-2 cursor-pointer transition-all"
                class:border-aviation-500={selectedSolutionIndex === index}
                class:border-dark-600={selectedSolutionIndex !== index}
                style={selectedSolutionIndex === index ? 'background: rgba(10, 37, 64, 0.3)' : 'background: rgba(37, 37, 66, 0.5)'}
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="font-display font-semibold text-white">方案 #{index + 1}</span>
                  <span class="text-xs px-2 py-0.5 rounded text-alert-green" style="background: rgba(34, 197, 94, 0.2);">
                    分数: {solution.score.toFixed(0)}
                  </span>
                </div>
                <div class="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span class="text-gray-500">重量</span>
                    <div class="text-white font-mono">{solution.totalWeight.toLocaleString()} kg</div>
                  </div>
                  <div>
                    <span class="text-gray-500">空间</span>
                    <div class="text-white font-mono">{(solution.spaceUtilization * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <span class="text-gray-500">效率</span>
                    <div class="text-white font-mono">{(solution.fuelEfficiency * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="flex-1 flex items-center justify-center text-gray-500">
            <div class="text-center">
              <Target class="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>开始计算后将显示候选方案</p>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <div class="col-span-3 flex flex-col gap-4 overflow-y-auto">
      <div class="glass-panel p-4">
        <div class="hud-text mb-3 text-center">当前方案重心</div>
        <CGGauge 
          cgPercent={cgPercent}
          forwardLimit={$currentAircraft?.cgLimits.forward || 14}
          aftLimit={$currentAircraft?.cgLimits.aft || 46}
          size={200}
        />
      </div>

      <div class="glass-panel p-4">
        <div class="hud-text mb-3">方案指标</div>
        <div class="space-y-3">
          <StatCard 
            label="总重量" 
            value={$currentLoadPlan?.totalWeight.toLocaleString() || '0'} 
            unit="kg"
            status={$currentLoadPlan && $currentLoadPlan.totalWeight > ($currentAircraft?.maxTakeoffWeight || 0) ? 'danger' : 'normal'}
          />
          <StatCard 
            label="空间利用率" 
            value={$currentLoadPlan ? ($currentLoadPlan.spaceUtilization * 100).toFixed(1) : '0.0'} 
            unit="%"
          />
          <StatCard 
            label="燃油效率" 
            value={$currentLoadPlan ? ($currentLoadPlan.fuelEfficiency * 100).toFixed(1) : '0.0'} 
            unit="%"
            trend={$currentLoadPlan ? ($currentLoadPlan.fuelEfficiency - 0.85) * 100 : undefined}
          />
          <StatCard 
            label="货物数量" 
            value={$currentLoadPlan?.cargoPlacements.length || 0} 
            unit="件"
          />
        </div>
      </div>

      <div class="glass-panel p-4">
        <div class="hud-text mb-3">配载分区统计</div>
        <div class="space-y-2">
          {#each ['A', 'B', 'C'] as zone}
            {@const placeInZone = $currentLoadPlan?.cargoPlacements.filter(p => p.zone === zone) || []}
            {@const count = placeInZone.length}
            {@const weight = placeInZone.reduce((s, p) => {
              const c = $cargos.find(c => c.id === p.cargoId);
              return s + (c?.weight || 0);
            }, 0)}
            <div class="p-2" style="background: rgba(37, 37, 66, 0.5); border-radius: 0.375rem;">
              <div class="flex justify-between items-center">
                <span class="text-sm text-white">{zone}区</span>
                <span class="text-xs text-gray-400">{count}件 / {weight}kg</span>
              </div>
              <div class="mt-1 h-1.5" style="background: #2E2E4A; border-radius: 9999px; overflow: hidden;">
                <div 
                  class="h-full" 
                  style="background: #2A6F97; border-radius: 9999px; width: {($currentLoadPlan?.cargoPlacements.length ? count / $currentLoadPlan.cargoPlacements.length : 0) * 100}%"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<Modal 
  bind:open={showSaveModal}
  title="保存配载方案"
  size="md"
>
  <div class="space-y-4">
    <div>
      <label class="hud-text block mb-1">航班号</label>
      <input 
        type="text"
        value={$currentLoadPlan?.flightNumber || ''}
        disabled
        class="input-field bg-dark-700 cursor-not-allowed"
      />
    </div>
    <div>
      <label class="hud-text block mb-1">备注（可选）</label>
      <textarea 
        bind:value={comment}
        placeholder="添加配载备注..."
        class="input-field h-24 resize-none"
      ></textarea>
    </div>
    <div class="p-3 rounded-lg" style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3);">
      <div class="flex items-center gap-2 text-alert-green text-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        保存后将自动创建配载快照
      </div>
    </div>
  </div>
  <div slot="footer">
    <button onclick={() => showSaveModal = false} class="btn-secondary">取消</button>
    <button onclick={handleSavePlan} class="btn-primary">确认保存</button>
  </div>
</Modal>
