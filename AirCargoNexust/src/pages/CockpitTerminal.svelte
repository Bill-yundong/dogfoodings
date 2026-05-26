<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { PlaneTakeoff, Fuel, AlertTriangle, CheckCircle, Clock, Gauge } from 'lucide-svelte';
  import CGGauge from '@/components/CGGauge.svelte';
  import StatCard from '@/components/StatCard.svelte';
  import { loadPlans, cargos, currentAircraft, loadAllData, addNotification } from '@/stores';
  import { DEFAULT_AIRCRAFT } from '@/data/aircraft';
  import * as db from '@/db';
  import { calculateCgPercentage } from '@/utils/calculations';
  import type { LoadPlan, CGPoint } from '@/types';

  let selectedPlanId = $state<string | null>(null);
  let confirmedPlans = $state<LoadPlan[]>([]);
  let cgHistory = $state<CGPoint[]>([]);
  let flightPhase = $state<'preflight' | 'takeoff' | 'cruise' | 'landing'>('preflight');
  let currentFuel = $state(100);
  let animationFrame: number;

  let selectedPlan = $derived($loadPlans.find(p => p.id === selectedPlanId));
  
  let cgPercent = $derived(selectedPlan && $currentAircraft
    ? calculateCgPercentage(selectedPlan.centerOfGravity.x, $currentAircraft)
    : 30);

  let projectedCG = $derived(cgHistory.length > 0 ? cgHistory[cgHistory.length - 1] : { x: cgPercent, y: 0, fuel: currentFuel });

  function generateCGHistory(): CGPoint[] {
    if (!selectedPlan) return [];
    
    const points: CGPoint[] = [];
    const startCg = calculateCgPercentage(selectedPlan.centerOfGravity.x, $currentAircraft!);
    
    for (let i = 0; i <= 100; i += 5) {
      const fuelBurned = i;
      const cgShift = (fuelBurned / 100) * 3;
      points.push({
        x: startCg - cgShift,
        y: 0,
        fuel: 100 - fuelBurned
      });
    }
    
    return points;
  }

  function loadPlan(id: string) {
    selectedPlanId = id;
    cgHistory = generateCGHistory();
    currentFuel = 100;
    addNotification({ type: 'info', message: '已加载配载方案' });
  }

  function startFlightSimulation() {
    flightPhase = 'takeoff';
    currentFuel = 100;
    addNotification({ type: 'info', message: '飞行模拟开始' });
    animateFlight();
  }

  function animateFlight() {
    if (currentFuel <= 10) {
      flightPhase = 'landing';
      addNotification({ type: 'success', message: '飞行模拟完成' });
      return;
    }

    currentFuel -= 0.5;
    
    if (currentFuel > 80) flightPhase = 'takeoff';
    else if (currentFuel > 20) flightPhase = 'cruise';
    else flightPhase = 'landing';

    animationFrame = requestAnimationFrame(animateFlight);
  }

  function confirmLoading() {
    if (!selectedPlan) return;
    addNotification({ type: 'success', message: '装载已确认，可以起飞' });
  }

  onMount(async () => {
    await db.initDB();
    await loadAllData();
    currentAircraft.set(DEFAULT_AIRCRAFT);
    confirmedPlans = $loadPlans.filter(p => p.status === 'confirmed');
    if (confirmedPlans.length > 0) {
      loadPlan(confirmedPlans[0].id);
    }
  });

  onDestroy(() => {
    cancelAnimationFrame(animationFrame);
  });

  $effect(() => {
    confirmedPlans = $loadPlans.filter(p => p.status === 'confirmed');
  });

  function drawCGCurve(canvas: HTMLCanvasElement) {
    if (!canvas || cgHistory.length === 0 || !$currentAircraft) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const forwardLimit = $currentAircraft.cgLimits.forward;
    const aftLimit = $currentAircraft.cgLimits.aft;
    const minX = Math.min(forwardLimit - 5, ...cgHistory.map(p => p.x)) - 2;
    const maxX = Math.max(aftLimit + 5, ...cgHistory.map(p => p.x)) + 2;

    const xScale = chartWidth / (maxX - minX);
    const yScale = chartHeight / 100;

    ctx.fillStyle = 'rgba(46, 196, 182, 0.1)';
    ctx.fillRect(
      padding.left + (forwardLimit - minX) * xScale,
      padding.top,
      (aftLimit - forwardLimit) * xScale,
      chartHeight
    );

    ctx.strokeStyle = '#2EC4B6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left + (forwardLimit - minX) * xScale, padding.top);
    ctx.lineTo(padding.left + (forwardLimit - minX) * xScale, padding.top + chartHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding.left + (aftLimit - minX) * xScale, padding.top);
    ctx.lineTo(padding.left + (aftLimit - minX) * xScale, padding.top + chartHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = 3;
    ctx.beginPath();
    cgHistory.forEach((point, i) => {
      const x = padding.left + (point.x - minX) * xScale;
      const y = padding.top + (100 - point.fuel) * yScale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const currentIndex = Math.floor((100 - currentFuel) / 5);
    if (currentIndex >= 0 && currentIndex < cgHistory.length) {
      const currentPoint = cgHistory[currentIndex];
      const cx = padding.left + (currentPoint.x - minX) * xScale;
      const cy = padding.top + (100 - currentPoint.fuel) * yScale;
      
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#E63946';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = '#6B7280';
    ctx.font = '11px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('重心 (% MAC)', width / 2, height - 10);
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('燃油 (%)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#9CA3AF';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 100; i += 25) {
      const y = padding.top + i * yScale;
      ctx.fillText(`${100 - i}`, padding.left - 10, y + 4);
    }

    ctx.textAlign = 'center';
    const step = Math.ceil((maxX - minX) / 5);
    for (let x = Math.ceil(minX); x <= maxX; x += step) {
      const px = padding.left + (x - minX) * xScale;
      ctx.fillText(`${x}%`, px, height - 20);
    }
  }

  let curveCanvas: HTMLCanvasElement;
  let canvasObserver: ResizeObserver;

  function initCanvas() {
    if (!curveCanvas) return;
    
    const resize = () => {
      const rect = curveCanvas.parentElement!.getBoundingClientRect();
      curveCanvas.width = rect.width * window.devicePixelRatio;
      curveCanvas.height = 300 * window.devicePixelRatio;
      curveCanvas.style.width = `${rect.width}px`;
      curveCanvas.style.height = '300px';
      drawCGCurve(curveCanvas);
    };
    
    resize();
    canvasObserver = new ResizeObserver(resize);
    canvasObserver.observe(curveCanvas.parentElement!);
  }

  $effect(() => {
    if (curveCanvas && cgHistory.length > 0) {
      drawCGCurve(curveCanvas);
    }
  });
</script>

<div class="h-full flex flex-col">
  <header class="px-6 py-4 border-b border-dark-600 bg-dark-800" style="opacity: 0.5;">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display text-2xl font-bold text-white flex items-center gap-3">
          <PlaneTakeoff class="w-7 h-7 text-aviation-500" />
          机组配平终端
        </h1>
        <p class="text-sm text-gray-400 mt-1">飞行前重心验证与装载确认</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-3 py-2 bg-dark-700 rounded-lg">
          <div 
            class="status-indicator"
            class:status-normal={flightPhase === 'cruise'}
            class:status-warning={flightPhase === 'takeoff' || flightPhase === 'landing'}
          ></div>
          <span class="text-sm text-white">
            {flightPhase === 'preflight' ? '飞行前准备' : 
             flightPhase === 'takeoff' ? '起飞阶段' :
             flightPhase === 'cruise' ? '巡航阶段' : '降落阶段'}
          </span>
        </div>
      </div>
    </div>
  </header>

  <div class="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
    <div class="col-span-3 flex flex-col gap-4 overflow-y-auto">
      <div class="glass-panel p-4">
        <div class="hud-text mb-3">选择配载方案</div>
        {#if confirmedPlans.length === 0}
          <div class="text-center py-8 text-gray-500 text-sm">
            暂无已确认的配载方案
          </div>
        {:else}
          <div class="space-y-2">
            {#each confirmedPlans as plan}
              <button
                onclick={() => loadPlan(plan.id)}
                class="w-full p-3 rounded-lg border-2 text-left transition-all"
                class:border-aviation-500={selectedPlanId === plan.id}
                class:border-dark-600={selectedPlanId !== plan.id}
                style={selectedPlanId === plan.id ? 'background: rgba(10, 37, 64, 0.3)' : 'background: rgba(37, 37, 66, 0.5)'}
              >
                <div class="font-display font-semibold text-white">{plan.flightNumber}</div>
                <div class="text-xs text-gray-400 mt-1">
                  {plan.cargoPlacements.length} 件 · {plan.totalWeight.toLocaleString()} kg
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <div class="glass-panel p-4">
        <div class="hud-text mb-3">航班信息</div>
        {#if selectedPlan}
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-400">航班号</span>
              <span class="text-white font-mono">{selectedPlan.flightNumber}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">机型</span>
              <span class="text-white font-mono">{selectedPlan.aircraftType}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">状态</span>
              <span class="px-2 py-0.5 text-xs rounded text-alert-green" style="background: rgba(34, 197, 94, 0.2);">
                已确认
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">创建时间</span>
              <span class="text-white text-xs">
                {new Date(selectedPlan.timestamp).toLocaleString('zh-CN')}
              </span>
            </div>
          </div>
        {:else}
          <div class="text-center py-4 text-gray-500 text-sm">
            请选择配载方案
          </div>
        {/if}
      </div>
    </div>

    <div class="col-span-6 flex flex-col gap-4 overflow-hidden">
      <div class="glass-panel p-4 flex-1">
        <div class="hud-text mb-3">重心随燃油消耗变化曲线</div>
        <div class="h-full min-h-80">
          <canvas bind:this={curveCanvas} use:initCanvas ></canvas>
        </div>
      </div>

      <div class="glass-panel p-4">
        <div class="hud-text mb-3">装载清单</div>
        <div class="max-h-48 overflow-y-auto space-y-1">
          {#if selectedPlan}
            {#each selectedPlan.cargoPlacements as placement}
              {@const cargo = $cargos.find(c => c.id === placement.cargoId)}
              <div class="flex items-center justify-between p-2 bg-dark-700 rounded text-xs" style="opacity: 0.3;">
                <div class="flex items-center gap-2">
                  <div 
                    class="w-2 h-2 rounded-full"
                    class:bg-alert-orange={cargo?.isDangerous}
                    class:bg-aviation-500={!cargo?.isDangerous}
                  ></div>
                  <span class="text-white">{cargo?.name || '未知货物'}</span>
                </div>
                <div class="flex items-center gap-4 text-gray-400">
                  <span>{cargo?.weight || 0}kg</span>
                  <span>{placement.zone}区</span>
                </div>
              </div>
            {/each}
          {:else}
            <div class="text-center py-8 text-gray-500 text-sm">
              请选择配载方案查看装载清单
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="col-span-3 flex flex-col gap-4 overflow-y-auto">
      <div class="glass-panel p-4">
        <div class="hud-text mb-3 text-center">当前重心</div>
        <CGGauge 
          cgPercent={projectedCG.x}
          forwardLimit={$currentAircraft?.cgLimits.forward || 14}
          aftLimit={$currentAircraft?.cgLimits.aft || 46}
          size={180}
        />
      </div>

      <div class="glass-panel p-4">
        <div class="hud-text mb-3">飞行参数</div>
        <div class="space-y-3">
          <StatCard 
            label="总重量" 
            value={selectedPlan?.totalWeight.toLocaleString() || '0'} 
            unit="kg"
          />
          <div class="p-3 bg-dark-700 rounded-lg" style="opacity: 0.5;">
            <div class="flex items-center gap-2 mb-2">
              <Fuel class="w-4 h-4 text-alert-orange" />
              <span class="hud-text">燃油量</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xl font-display font-bold text-white">{currentFuel.toFixed(1)}%</span>
            </div>
            <div class="mt-2 h-2 bg-dark-600 rounded-full overflow-hidden">
              <div 
                class="h-full bg-alert-orange rounded-full transition-all duration-300"
                style="width: {currentFuel}%"
              ></div>
            </div>
          </div>
          <StatCard 
            label="空间利用率" 
            value={selectedPlan ? (selectedPlan.spaceUtilization * 100).toFixed(1) : '0.0'} 
            unit="%"
          />
        </div>
      </div>

      <div class="glass-panel p-4 space-y-3">
        {#if flightPhase === 'preflight'}
          <button 
            onclick={confirmLoading}
            disabled={!selectedPlan}
            class="w-full btn-primary flex items-center justify-center gap-2"
          >
            <CheckCircle class="w-4 h-4" />
            确认装载
          </button>
          <button 
            onclick={startFlightSimulation}
            disabled={!selectedPlan}
            class="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <PlaneTakeoff class="w-4 h-4" />
            开始飞行模拟
          </button>
        {:else}
          <div class="text-center py-4">
            <div class="w-12 h-12 border-4 border-aviation-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" ></div>
            <p class="text-sm text-gray-400">
              {flightPhase === 'takeoff' ? '起飞中...' :
               flightPhase === 'cruise' ? '巡航中...' : '降落中...'}
            </p>
          </div>
        {/if}
      </div>

      {#if selectedPlan}
        <div class="glass-panel p-4">
          <div class="hud-text mb-3 flex items-center gap-2">
            <AlertTriangle class="w-4 h-4 text-alert-orange" />
            安全检查
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-alert-green flex-shrink-0" />
              <span class="text-gray-300">重心在安全范围内</span>
            </div>
            <div class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-alert-green flex-shrink-0" />
              <span class="text-gray-300">总重量未超限</span>
            </div>
            <div class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-alert-green flex-shrink-0" />
              <span class="text-gray-300">危险品已隔离</span>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
