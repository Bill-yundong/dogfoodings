'use client';

import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Settings, Eye, EyeOff } from 'lucide-react';
import { useSimulationStore } from '@/lib/state/simulation-store';
import { PASSENGER_TYPE_COLORS } from '@/types';
import type { PassengerType, AgentStatus } from '@/types';

const STATUS_LABELS: Record<AgentStatus, string> = {
  arriving: '抵达',
  in_checkin_queue: '值机排队',
  at_checkin: '值机中',
  in_security_queue: '安检排队',
  at_security: '安检中',
  walking: '行走',
  shopping: '购物',
  waiting_gate: '等待登机',
  boarding: '登机中',
  exited: '已离开',
};

const TYPE_LABELS: Record<PassengerType, string> = {
  business: '商务客',
  tourist: '旅游客',
  transfer: '中转客',
  special: '特殊需求',
};

export const ControlPanel: React.FC = () => {
  const {
    isRunning,
    isPaused,
    speedMultiplier,
    setRunning,
    setPaused,
    setSpeed,
    reset,
    showVectors,
    showHeatmap,
    showTrails,
    setShowVectors,
    setShowHeatmap,
    setShowTrails,
    filterTypes,
    filterStatuses,
    toggleFilterType,
    toggleFilterStatus,
    socialForceParams,
    setSocialForceParams,
    worker,
  } = useSimulationStore();

  const handleStart = () => {
    if (!worker) return;
    if (!isRunning) {
      worker.postMessage({ type: 'start' });
      setRunning(true);
      setPaused(false);
    } else if (isPaused) {
      worker.postMessage({ type: 'start' });
      setPaused(false);
    } else {
      worker.postMessage({ type: 'pause' });
      setPaused(true);
    }
  };

  const handleReset = () => {
    reset();
  };

  const speeds = [0.5, 1, 2, 4, 8];

  return (
    <div className="space-y-4">
      <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
        <h3 className="text-cyber-blue text-sm font-mono mb-3">仿真控制</h3>

        <div className="flex gap-2 mb-4">
          <button
            onClick={handleStart}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-mono text-sm transition-all ${
              isRunning && !isPaused
                ? 'bg-alert-amber/20 text-alert-amber border border-alert-amber/50 hover:bg-alert-amber/30'
                : 'bg-safe-green/20 text-safe-green border border-safe-green/50 hover:bg-safe-green/30'
            }`}
          >
            {isRunning && !isPaused ? (
              <><Pause className="w-4 h-4" /> 暂停</>
            ) : (
              <><Play className="w-4 h-4" /> {isRunning ? '继续' : '开始'}</>
            )}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-deep-space-dark text-gray-400 border border-gray-600 hover:bg-deep-space hover:text-gray-200 transition-all font-mono text-sm"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-2 block">仿真速度</label>
          <div className="flex gap-1">
            {speeds.map((speed) => (
              <button
                key={speed}
                onClick={() => setSpeed(speed)}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-mono transition-all ${
                  speedMultiplier === speed
                    ? 'bg-cyber-blue/30 text-cyber-blue border border-cyber-blue/50'
                    : 'bg-deep-space-dark text-gray-500 border border-transparent hover:bg-deep-space'
                }`}
              >
                <FastForward className="w-3 h-3 inline mr-1" />
                {speed}x
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs text-gray-400 flex items-center gap-2">
            <Settings className="w-3 h-3" />
            显示选项
          </h4>

          <ToggleButton
            label="速度矢量"
            checked={showVectors}
            onChange={setShowVectors}
            icon={<Eye className="w-3 h-3" />}
          />
          <ToggleButton
            label="热力图"
            checked={showHeatmap}
            onChange={setShowHeatmap}
            icon={<Eye className="w-3 h-3" />}
          />
          <ToggleButton
            label="运动轨迹"
            checked={showTrails}
            onChange={setShowTrails}
            icon={<Eye className="w-3 h-3" />}
          />
        </div>
      </div>

      <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
        <h3 className="text-cyber-blue text-sm font-mono mb-3">旅客类型过滤</h3>
        <div className="space-y-2">
          {(Object.keys(TYPE_LABELS) as PassengerType[]).map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterTypes.includes(type)}
                onChange={() => toggleFilterType(type)}
                className="w-4 h-4 rounded border-gray-600 bg-deep-space-dark text-cyber-blue focus:ring-cyber-blue"
              />
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: PASSENGER_TYPE_COLORS[type] }}
              />
              <span className="text-xs text-gray-300">{TYPE_LABELS[type]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
        <h3 className="text-cyber-blue text-sm font-mono mb-3">状态过滤</h3>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {(Object.keys(STATUS_LABELS) as AgentStatus[]).map((status) => (
            <label key={status} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterStatuses.includes(status)}
                onChange={() => toggleFilterStatus(status)}
                className="w-3.5 h-3.5 rounded border-gray-600 bg-deep-space-dark text-cyber-blue focus:ring-cyber-blue"
              />
              <span className="text-xs text-gray-300">{STATUS_LABELS[status]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
        <h3 className="text-cyber-blue text-sm font-mono mb-3">社会力参数</h3>
        <div className="space-y-3">
          <ParamSlider
            label="自驱动力"
            value={socialForceParams.selfDrivingCoeff}
            onChange={(v) => setSocialForceParams({ selfDrivingCoeff: v })}
            min={0.1}
            max={5}
            step={0.1}
          />
          <ParamSlider
            label="人际排斥"
            value={socialForceParams.socialRepulsionCoeff}
            onChange={(v) => setSocialForceParams({ socialRepulsionCoeff: v })}
            min={5}
            max={30}
            step={0.5}
          />
          <ParamSlider
            label="排斥范围"
            value={socialForceParams.socialRepulsionRange}
            onChange={(v) => setSocialForceParams({ socialRepulsionRange: v })}
            min={1}
            max={5}
            step={0.1}
          />
          <ParamSlider
            label="边界排斥"
            value={socialForceParams.boundaryRepulsionCoeff}
            onChange={(v) => setSocialForceParams({ boundaryRepulsionCoeff: v })}
            min={1}
            max={20}
            step={0.5}
          />
          <ParamSlider
            label="最大速度"
            value={socialForceParams.maxSpeed}
            onChange={(v) => setSocialForceParams({ maxSpeed: v })}
            min={1}
            max={5}
            step={0.1}
          />
        </div>
      </div>
    </div>
  );
};

interface ToggleButtonProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ label, checked, onChange, icon }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-full flex items-center justify-between py-1.5 px-3 rounded text-xs transition-all ${
      checked
        ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30'
        : 'bg-deep-space-dark text-gray-500 border border-transparent'
    }`}
  >
    <span className="flex items-center gap-2">
      {checked ? icon : <EyeOff className="w-3 h-3" />}
      {label}
    </span>
    <div className={`w-8 h-4 rounded-full transition-all ${checked ? 'bg-cyber-blue/50' : 'bg-gray-700'}`}>
      <div
        className={`w-3 h-3 rounded-full bg-white transition-all mt-0.5 ${checked ? 'ml-4' : 'ml-0.5'}`}
      />
    </div>
  </button>
);

interface ParamSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}

const ParamSlider: React.FC<ParamSliderProps> = ({ label, value, onChange, min, max, step }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-mono text-cyber-blue">{value.toFixed(1)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-deep-space-dark rounded-full appearance-none cursor-pointer accent-cyber-blue"
    />
  </div>
);
