import { Play, Pause, SkipForward, SkipBack, Settings2 } from "lucide-react";
import { useOrbitStore } from "@/store/orbit";

export default function TimeControl({
  playing,
  onToggle,
  speed,
  onSpeed,
}: {
  playing: boolean;
  onToggle: () => void;
  speed: number;
  onSpeed: (s: number) => void;
}) {
  const currentJd = useOrbitStore((s) => s.currentJd);
  const tickJd = useOrbitStore((s) => s.tickJd);

  const unix = (currentJd - 2440587.5) * 86400 * 1000;
  const dateStr = new Date(unix).toISOString().replace("T", " ").slice(0, 19);

  return (
    <div className="glass-panel rounded-md px-3 py-2 flex items-center gap-3">
      <button
        onClick={onToggle}
        className="w-8 h-8 rounded-full bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center hover:bg-cyan-500/25 transition"
      >
        {playing ? (
          <Pause className="w-4 h-4 text-cyan-200" />
        ) : (
          <Play className="w-4 h-4 text-cyan-200 ml-0.5" />
        )}
      </button>
      <button
        onClick={() => tickJd(currentJd - 1 / 24)}
        className="w-8 h-8 rounded-full bg-slate-700/30 border border-slate-600/40 flex items-center justify-center hover:bg-slate-700/50"
      >
        <SkipBack className="w-3.5 h-3.5 text-slate-300" />
      </button>
      <button
        onClick={() => tickJd(currentJd + 1 / 24)}
        className="w-8 h-8 rounded-full bg-slate-700/30 border border-slate-600/40 flex items-center justify-center hover:bg-slate-700/50"
      >
        <SkipForward className="w-3.5 h-3.5 text-slate-300" />
      </button>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 text-[11px] text-space-dim hud-text">
          <Settings2 className="w-3 h-3" />
          <span>JD {currentJd.toFixed(4)}</span>
          <span className="text-cyan-300">· {dateStr} UTC</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={200}
          step={0.5}
          value={speed}
          onChange={(e) => onSpeed(parseFloat(e.target.value))}
          className="w-full accent-cyan-400 h-1"
        />
      </div>
      <div className="text-[11px] hud-text text-cyan-300 w-20 text-right">
        ×{speed.toFixed(1)}
      </div>
    </div>
  );
}
