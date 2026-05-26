import type { Debris } from "@/types/orbital";
import { useOrbitStore } from "@/store/orbit";
import { propagateAnalytical } from "@/orbital/twobody";
import { jdToIso } from "@/utils/constants";

function fmt(n: number, digits = 2) {
  return n.toFixed(digits);
}

export default function TargetPanel() {
  const target = useOrbitStore((s) => s.target);
  const currentJd = useOrbitStore((s) => s.currentJd);
  const dt = (currentJd - target.epochJd) * 86400;
  const sv = propagateAnalytical(target.elements, dt, { j2: true });

  const el: Debris["elements"] = target.elements;
  const rows: [string, string][] = [
    ["半长轴 a", `${fmt(el.semiMajorAxisKm, 3)} km`],
    ["偏心率 e", fmt(el.eccentricity, 5)],
    ["倾角 i", `${fmt(el.inclinationDeg, 3)}°`],
    ["升交点 Ω", `${fmt(el.raanDeg, 3)}°`],
    ["近地点幅角 ω", `${fmt(el.argPerigeeDeg, 3)}°`],
    ["真近点角 ν", `${fmt(el.trueAnomalyDeg, 3)}°`],
    ["位置 X", `${fmt(sv.positionKm[0], 3)} km`],
    ["位置 Y", `${fmt(sv.positionKm[1], 3)} km`],
    ["位置 Z", `${fmt(sv.positionKm[2], 3)} km`],
    ["速度 Vx", `${fmt(sv.velocityKmS[0], 4)} km/s`],
    ["速度 Vy", `${fmt(sv.velocityKmS[1], 4)} km/s`],
    ["速度 Vz", `${fmt(sv.velocityKmS[2], 4)} km/s`],
  ];

  return (
    <div className="glass-panel rounded-md p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulseSoft" />
        <div>
          <div className="font-display text-sm font-semibold text-space-text">
            {target.name}
          </div>
          <div className="text-[10px] text-space-dim hud-text">
            {target.noradId} · epoch {jdToIso(target.epochJd)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-space-border/40 py-1">
            <span className="text-space-dim hud-text">{k}</span>
            <span className="text-space-text hud-text">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md border border-cyan-400/20 bg-cyan-500/5 p-2 text-[10px] text-cyan-200 hud-text">
        协方差矩阵 · 3σ (0.100 km) · 已注入 J2 摄动
      </div>
    </div>
  );
}
