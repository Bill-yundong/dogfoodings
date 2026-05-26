import { Activity, Cpu, Sliders, Workflow, Layers, Database } from "lucide-react";
import { useOrbitStore, defaultLabConfig } from "@/store/orbit";
import ScanButton from "@/components/ScanButton";

function Toggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-center justify-between py-2 border-b border-space-border/50">
      <div>
        <div className="text-sm text-space-text">{label}</div>
        {hint && <div className="text-[10px] text-space-dim hud-text">{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full border transition ${
          value
            ? "bg-cyan-500/30 border-cyan-400/60"
            : "bg-space-base border-space-border"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
            value
              ? "left-5 bg-cyan-300"
              : "left-0.5 bg-space-muted"
          }`}
        />
      </button>
    </label>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="py-2 border-b border-space-border/50">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-space-text">{label}</div>
          {hint && <div className="text-[10px] text-space-dim hud-text">{hint}</div>}
        </div>
        <div className="text-sm hud-text text-cyan-300">
          {value}
          {unit ? ` ${unit}` : ""}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-400 h-1 mt-1"
      />
    </div>
  );
}

export default function Lab() {
  const labConfig = useOrbitStore((s) => s.labConfig);
  const setLabConfig = useOrbitStore((s) => s.setLabConfig);
  const scanThroughput = useOrbitStore((s) => s.scanThroughput);
  const scanDurationMs = useOrbitStore((s) => s.scanDurationMs);
  const scanProgress = useOrbitStore((s) => s.scanProgress);
  const scanInProgress = useOrbitStore((s) => s.scanInProgress);
  const events = useOrbitStore((s) => s.events);

  const reset = () => setLabConfig(defaultLabConfig);

  const threads = [0, 1, 2, 3];

  return (
    <div className="h-full flex flex-col">
      <header className="px-5 py-3 border-b border-space-border bg-space-base/70 backdrop-blur-md flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold text-space-text">
            仿真实验室
          </h1>
          <p className="text-[11px] text-space-dim hud-text">
            动力学参数 · 扫描阈值 · 协方差配置
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-md border border-space-border text-xs text-space-dim hover:text-space-text hover:bg-slate-800/40"
          >
            恢复默认
          </button>
          <ScanButton />
        </div>
      </header>
      <div className="flex-1 overflow-auto p-4 grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
          <div className="glass-panel rounded-md p-4 relative corner-bracket">
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="w-4 h-4 text-cyan-300" />
              <h3 className="font-display text-sm font-semibold text-space-text">
                动力学参数
              </h3>
            </div>
            <Slider
              label="积分步长"
              value={labConfig.stepSec}
              min={10}
              max={300}
              step={10}
              onChange={(v) => setLabConfig({ stepSec: v })}
              unit="s"
              hint="越小越精确，但计算量越大"
            />
            <Slider
              label="预测视窗"
              value={labConfig.horizonHours}
              min={1}
              max={48}
              step={1}
              onChange={(v) => setLabConfig({ horizonHours: v })}
              unit="h"
              hint="从当前 JD 起的扫描时长"
            />
            <Toggle
              label="J2 地球扁率摄动"
              value={labConfig.j2}
              onChange={(v) => setLabConfig({ j2: v })}
              hint="包含节点退行与近地点进动"
            />
            <Toggle
              label="J3 三阶带谐项"
              value={labConfig.j3}
              onChange={(v) => setLabConfig({ j3: v })}
              hint="高阶修正，计算量增加"
            />
          </div>

          <div className="glass-panel rounded-md p-4 relative corner-bracket">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-amber-300" />
              <h3 className="font-display text-sm font-semibold text-space-text">
                扫描与阈值
              </h3>
            </div>
            <Slider
              label="近距离阈值"
              value={labConfig.thresholdKm}
              min={0.5}
              max={50}
              step={0.5}
              onChange={(v) => setLabConfig({ thresholdKm: v })}
              unit="km"
              hint="输出距离小于该值的事件"
            />
            <Slider
              label="Pc 阈值"
              value={labConfig.pcThreshold}
              min={1e-7}
              max={1e-2}
              step={1e-6}
              onChange={(v) => setLabConfig({ pcThreshold: v })}
              hint="超过该概率视为告警"
            />
            <Slider
              label="联合碰撞半径"
              value={labConfig.combinedRadiusM}
              min={5}
              max={100}
              step={1}
              onChange={(v) => setLabConfig({ combinedRadiusM: v })}
              unit="m"
              hint="目标 + 碎片的物理包络"
            />
            <Slider
              label="协方差缩放"
              value={labConfig.covarianceScale}
              min={0.5}
              max={5}
              step={0.1}
              onChange={(v) => setLabConfig({ covarianceScale: v })}
              unit="×"
              hint="保守估计的膨胀系数"
            />
          </div>

          <div className="glass-panel rounded-md p-4 md:col-span-2 relative corner-bracket">
            <div className="flex items-center gap-2 mb-3">
              <Workflow className="w-4 h-4 text-cyan-300" />
              <h3 className="font-display text-sm font-semibold text-space-text">
                流水线语义对齐
              </h3>
              <span className="text-[10px] text-space-dim hud-text ml-auto">
                科研分析 ⇄ 航天器控制
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[11px] hud-text">
              <div className="rounded-md border border-cyan-400/30 bg-cyan-500/5 p-2">
                <div className="flex items-center gap-1 text-cyan-300 mb-1">
                  <Database className="w-3 h-3" /> 01 档案
                </div>
                <div className="text-space-dim">IndexedDB 编目碎片</div>
              </div>
              <div className="rounded-md border border-sky-400/30 bg-sky-500/5 p-2">
                <div className="flex items-center gap-1 text-sky-300 mb-1">
                  <Cpu className="w-3 h-3" /> 02 推演
                </div>
                <div className="text-space-dim">Worker 池并行积分</div>
              </div>
              <div className="rounded-md border border-amber-400/30 bg-amber-500/5 p-2">
                <div className="flex items-center gap-1 text-amber-300 mb-1">
                  <Activity className="w-3 h-3" /> 03 扫描
                </div>
                <div className="text-space-dim">TCA / 最小距离</div>
              </div>
              <div className="rounded-md border border-red-400/30 bg-red-500/5 p-2">
                <div className="flex items-center gap-1 text-red-300 mb-1">
                  <Layers className="w-3 h-3" /> 04 决策
                </div>
                <div className="text-space-dim">Pc / GNC 指令</div>
              </div>
            </div>
            <div className="mt-3 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
            <div className="mt-3 grid grid-cols-3 gap-3 text-[11px] hud-text">
              <div>
                <div className="text-space-dim">目标航天器输入</div>
                <div className="text-space-text">6 根数 + 协方差</div>
              </div>
              <div>
                <div className="text-space-dim">GNC 输出</div>
                <div className="text-space-text">规避机动 Δv 建议</div>
              </div>
              <div>
                <div className="text-space-dim">事件输出</div>
                <div className="text-space-text">{events.length} 条</div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-md p-4 relative corner-bracket h-fit">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-cyan-300" />
            <h3 className="font-display text-sm font-semibold text-space-text">
              计算监控
            </h3>
            <span className="ml-auto text-[10px] text-emerald-400 hud-text">
              {scanInProgress ? "RUNNING" : "IDLE"}
            </span>
          </div>
          <div className="space-y-3 text-[11px] hud-text">
            <div className="flex justify-between border-b border-space-border/50 pb-1">
              <span className="text-space-dim">总吞吐</span>
              <span className="text-cyan-300">{scanThroughput.toFixed(0)} ephem/s</span>
            </div>
            <div className="flex justify-between border-b border-space-border/50 pb-1">
              <span className="text-space-dim">批次耗时</span>
              <span className="text-space-text">{scanDurationMs.toFixed(0)} ms</span>
            </div>
            <div className="flex justify-between border-b border-space-border/50 pb-1">
              <span className="text-space-dim">进度</span>
              <span className="text-space-text">{scanProgress.toFixed(0)} %</span>
            </div>
            <div>
              <div className="text-space-dim mb-1.5">Worker 池 (4)</div>
              <div className="grid grid-cols-4 gap-2">
                {threads.map((i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-md border flex items-center justify-center text-xs hud-text ${
                      scanInProgress
                        ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-300 animate-pulseSoft"
                        : "border-space-border bg-space-base text-space-dim"
                    }`}
                  >
                    W{i}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-space-dim mb-1.5">吞吐历史</div>
              <div className="h-20 bg-space-base/60 rounded border border-space-border flex items-end gap-0.5 p-1">
                {Array.from({ length: 40 }).map((_, i) => {
                  const h = Math.max(
                    4,
                    Math.min(64, (Math.sin(i / 3 + Date.now() / 2000) * 0.5 + 0.5) * (scanThroughput / 50 + 20) * 2)
                  );
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-cyan-500/20 to-cyan-300/80 rounded-sm"
                      style={{ height: `${h}px` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
