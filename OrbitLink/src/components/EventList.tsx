import { AlertTriangle, ChevronRight, Radar } from "lucide-react";
import type { ConjunctionEvent } from "@/types/orbital";
import { jdToIso } from "@/utils/constants";

function severityColor(s: number) {
  switch (s) {
    case 3:
      return "text-red-400 border-red-500/50 bg-red-500/10";
    case 2:
      return "text-amber-400 border-amber-500/40 bg-amber-500/10";
    case 1:
      return "text-cyan-300 border-cyan-500/30 bg-cyan-500/5";
    default:
      return "text-slate-300 border-slate-600/30 bg-slate-800/30";
  }
}

function formatPc(pc: number) {
  if (pc <= 0) return "0";
  if (pc < 1e-6) return pc.toExponential(1);
  return pc.toExponential(2);
}

export default function EventList({
  events,
  selectedId,
  onSelect,
}: {
  events: ConjunctionEvent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const sorted = [...events].sort(
    (a, b) => b.collisionProbability - a.collisionProbability
  );
  return (
    <div className="glass-panel rounded-md p-3 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Radar className="w-4 h-4 text-cyan-300" />
          <h3 className="font-display text-sm font-semibold text-space-text">
            近距离会合扫描
          </h3>
          <span className="text-[11px] text-space-dim hud-text">
            {events.length} 条
          </span>
        </div>
        <div className="text-[11px] text-space-dim hud-text">TCA 未来 24h</div>
      </div>
      <div className="flex-1 overflow-auto pr-1 space-y-1">
        {sorted.length === 0 && (
          <div className="text-center text-xs text-space-dim py-8 hud-text">
            暂无限定阈值内的会合事件
          </div>
        )}
        {sorted.map((e) => {
          const selected = e.id === selectedId;
          return (
            <button
              key={e.id}
              onClick={() => onSelect(selected ? null : e.id)}
              className={`w-full text-left px-2.5 py-2 rounded border transition group ${
                selected
                  ? "bg-cyan-500/10 border-cyan-400/60"
                  : "border-transparent hover:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] hud-text px-1.5 py-0.5 rounded border ${severityColor(
                    e.severity
                  )}`}
                >
                  {e.severity >= 2 && <AlertTriangle className="w-3 h-3" />}
                  L{e.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-space-text truncate">
                    {e.debrisName}
                  </div>
                  <div className="text-[10px] text-space-dim hud-text">
                    NORAD {e.debrisNorad} · TCA {jdToIso(e.tcaEpochJd)}
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-space-dim opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1 text-[10px] hud-text">
                <div>
                  <div className="text-space-dim">距离</div>
                  <div className="text-space-text">
                    {e.missDistanceKm.toFixed(3)} km
                  </div>
                </div>
                <div>
                  <div className="text-space-dim">相对速度</div>
                  <div className="text-space-text">
                    {e.relativeVelocityKmS.toFixed(2)} km/s
                  </div>
                </div>
                <div>
                  <div className="text-space-dim">Pc</div>
                  <div
                    className={
                      e.collisionProbability > 1e-4
                        ? "text-red-400"
                        : "text-space-text"
                    }
                  >
                    {formatPc(e.collisionProbability)}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
