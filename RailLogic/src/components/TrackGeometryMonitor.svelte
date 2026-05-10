<script lang="ts">
  import { latestTrackParameter, trackParameters } from '../lib/stores';
  import type { TrackGeometryParameter } from '../types';

  let latestParam = $state<TrackGeometryParameter | null>(null);
  let historyParams = $state<TrackGeometryParameter[]>([]);

  $effect(() => {
    const unsub1 = latestTrackParameter.subscribe((param) => {
      latestParam = param;
    });
    const unsub2 = trackParameters.subscribe((params) => {
      historyParams = params.slice(-10);
    });
    return () => {
      unsub1();
      unsub2();
    };
  });

  function formatMileage(mileage: number): string {
    return (mileage / 1000).toFixed(2);
  }

  function getConditionColor(condition: string): string {
    switch (condition) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }

  function getConditionText(condition: string): string {
    switch (condition) {
      case 'excellent': return '优秀';
      case 'good': return '良好';
      case 'fair': return '一般';
      case 'poor': return '较差';
      default: return '未知';
    }
  }
</script>

<div class="p-4 bg-gray-900 rounded-lg shadow-lg">
  <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
    <span class="text-2xl">🛤️</span>
    轨道几何参数监测
  </h3>

  {#if latestParam}
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">轨距</div>
        <div class="text-xl font-bold text-cyan-400">
          {latestParam.gauge.toFixed(2)}
          <span class="text-sm font-normal">mm</span>
        </div>
        <div class="text-xs text-gray-500">
          偏差: {(latestParam.gauge - 1435).toFixed(2)} mm
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">方向</div>
        <div class="text-xl font-bold text-purple-400">
          {latestParam.alignment.toFixed(2)}
          <span class="text-sm font-normal">mm</span>
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">高低</div>
        <div class="text-xl font-bold text-pink-400">
          {latestParam.profile.toFixed(2)}
          <span class="text-sm font-normal">mm</span>
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">扭曲</div>
        <div class="text-xl font-bold text-orange-400">
          {latestParam.twist.toFixed(2)}
          <span class="text-sm font-normal">mm</span>
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">超高</div>
        <div class="text-xl font-bold text-blue-400">
          {latestParam.cant.toFixed(1)}
          <span class="text-sm font-normal">mm</span>
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">欠超高</div>
        <div class="text-xl font-bold text-green-400">
          {latestParam.cantDeficiency.toFixed(1)}
          <span class="text-sm font-normal">mm</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">里程位置</div>
        <div class="text-lg font-bold text-white">
          K{formatMileage(latestParam.mileage)}
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">限速</div>
        <div class="text-lg font-bold text-yellow-400">
          {latestParam.speedLimit.toFixed(0)}
          <span class="text-sm font-normal">km/h</span>
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">轨道状况</div>
        <div class="text-lg font-bold {getConditionColor(latestParam.condition)}">
          {getConditionText(latestParam.condition)}
        </div>
      </div>
    </div>
  {:else}
    <div class="text-gray-400 text-center py-8">
      等待轨道参数数据...
    </div>
  {/if}

  {#if historyParams.length > 0}
    <div class="mt-4 border-t border-gray-700 pt-4">
      <h4 class="text-gray-300 font-semibold mb-2">历史轨道参数</h4>
      <div class="grid grid-cols-5 gap-2 text-sm">
        <div class="text-gray-400">里程</div>
        <div class="text-gray-400 text-right">轨距</div>
        <div class="text-gray-400 text-right">方向</div>
        <div class="text-gray-400 text-right">高低</div>
        <div class="text-gray-400 text-right">状况</div>

        {#each historyParams as param (param.id)}
          <div class="text-gray-300">K{formatMileage(param.mileage)}</div>
          <div class="text-cyan-400 text-right">{param.gauge.toFixed(1)} mm</div>
          <div class="text-purple-400 text-right">{param.alignment.toFixed(1)} mm</div>
          <div class="text-pink-400 text-right">{param.profile.toFixed(1)} mm</div>
          <div class="text-right {getConditionColor(param.condition)}">
            {getConditionText(param.condition)}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
