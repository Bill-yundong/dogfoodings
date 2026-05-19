<script lang="ts">
  import type { FanControl, ControlMode } from '$lib/types';
  import { boilerStore } from '$lib/stores/boiler';

  let {
    controlMode,
    onModeChange,
    onControlChange
  } = $props<{
    controlMode: ControlMode;
    onModeChange: (mode: ControlMode) => void;
    onControlChange: (control: Partial<FanControl>) => void;
  }>();

  let fdSpeed = $state(75);
  let idSpeed = $state(72);
  let damperOpening = $state(65);
  let oxygenSetpoint = $state(3.5);

  const handleFDSpeedChange = (e: Event) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    fdSpeed = value;
    if (controlMode === 'manual') {
      onControlChange({ forcedDraftSpeed: value });
    }
  };

  const handleIDSpeedChange = (e: Event) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    idSpeed = value;
    if (controlMode === 'manual') {
      onControlChange({ inducedDraftSpeed: value });
    }
  };

  const handleDamperChange = (e: Event) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    damperOpening = value;
    if (controlMode === 'manual') {
      onControlChange({ damperOpening: value });
    }
  };

  const handleSetpointChange = (e: Event) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    oxygenSetpoint = value;
    onControlChange({ oxygenSetpoint: value });
  };

  $effect(() => {
    const unsub = boilerStore.currentFanControl.subscribe((current) => {
      if (current) {
        fdSpeed = current.forcedDraftSpeed;
        idSpeed = current.inducedDraftSpeed;
        damperOpening = current.damperOpening;
        oxygenSetpoint = current.oxygenSetpoint;
      }
    });
    return () => unsub();
  });
</script>

<div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
  <div class="flex items-center justify-between mb-5">
    <h3 class="text-lg font-semibold text-slate-100">风机控制</h3>
    <div class="flex gap-2">
      <button
        class={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
          controlMode === 'manual'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
        }`}
        onclick={() => onModeChange('manual')}
      >
        手动
      </button>
      <button
        class={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
          controlMode === 'auto'
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
        }`}
        onclick={() => onModeChange('auto')}
      >
        自动 (MPC)
      </button>
    </div>
  </div>

  <div class="space-y-5">
    <div>
      <div class="flex justify-between mb-2">
        <label for="fdSpeed" class="text-sm text-slate-400">送风机转速</label>
        <span class="text-sm font-mono text-blue-400">{fdSpeed.toFixed(1)}%</span>
      </div>
      <input
        id="fdSpeed"
        type="range"
        min="30"
        max="100"
        step="0.1"
        value={fdSpeed}
        disabled={controlMode === 'auto'}
        oninput={handleFDSpeedChange}
        class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-blue-500"
      />
    </div>

    <div>
      <div class="flex justify-between mb-2">
        <label for="idSpeed" class="text-sm text-slate-400">引风机转速</label>
        <span class="text-sm font-mono text-blue-400">{idSpeed.toFixed(1)}%</span>
      </div>
      <input
        id="idSpeed"
        type="range"
        min="30"
        max="100"
        step="0.1"
        value={idSpeed}
        disabled={controlMode === 'auto'}
        oninput={handleIDSpeedChange}
        class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-blue-500"
      />
    </div>

    <div>
      <div class="flex justify-between mb-2">
        <label for="damper" class="text-sm text-slate-400">风门开度</label>
        <span class="text-sm font-mono text-blue-400">{damperOpening.toFixed(1)}%</span>
      </div>
      <input
        id="damper"
        type="range"
        min="20"
        max="100"
        step="0.1"
        value={damperOpening}
        disabled={controlMode === 'auto'}
        oninput={handleDamperChange}
        class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-blue-500"
      />
    </div>

    <div class="pt-3 border-t border-slate-700/50">
      <div class="flex justify-between mb-2">
        <label for="setpoint" class="text-sm text-slate-400">氧含量设定值</label>
        <span class="text-sm font-mono text-emerald-400">{oxygenSetpoint.toFixed(2)}%</span>
      </div>
      <input
        id="setpoint"
        type="range"
        min="1.5"
        max="6"
        step="0.1"
        value={oxygenSetpoint}
        oninput={handleSetpointChange}
        class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
      />
    </div>
  </div>
</div>
