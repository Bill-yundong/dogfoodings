import { useState } from "react";
import { PlayCircle, Loader2, Clock, Zap } from "lucide-react";
import { useOrbitStore, defaultScanConfig } from "@/store/orbit";
import { scanPool } from "@/workers/pool";
import { upsertEvents } from "@/db/indexed";

export default function ScanButton() {
  const target = useOrbitStore((s) => s.target);
  const debris = useOrbitStore((s) => s.debris);
  const labConfig = useOrbitStore((s) => s.labConfig);
  const currentJd = useOrbitStore((s) => s.currentJd);
  const scanInProgress = useOrbitStore((s) => s.scanInProgress);
  const setScanInProgress = useOrbitStore((s) => s.setScanInProgress);
  const setScanProgress = useOrbitStore((s) => s.setScanProgress);
  const setScanThroughput = useOrbitStore((s) => s.setScanThroughput);
  const setScanDurationMs = useOrbitStore((s) => s.setScanDurationMs);
  const setLastScanAt = useOrbitStore((s) => s.setLastScanAt);
  const setEvents = useOrbitStore((s) => s.setEvents);

  const [progress, setProgress] = useState(0);
  const [throughput, setThroughput] = useState(0);
  const [duration, setDuration] = useState(0);

  const startScan = async () => {
    if (scanInProgress) return;
    setScanInProgress(true);
    setProgress(0);
    const handle = scanPool.submitScan({
      target,
      debris,
      startJd: currentJd,
      endJd: currentJd + labConfig.horizonHours / 24,
      stepSec: labConfig.stepSec,
      config: defaultScanConfig(labConfig),
      j2: labConfig.j2,
      j3: labConfig.j3,
    });
    handle.onProgress((p) => {
      const prog = p.chunksTotal > 0 ? p.chunksDone / p.chunksTotal : 0;
      setProgress(prog * 100);
      setThroughput(p.throughput);
      setDuration(p.durationMs);
      setScanProgress(prog * 100);
      setScanThroughput(p.throughput);
      setScanDurationMs(p.durationMs);
      if (p.events.length > 0) {
        setEvents(p.events.slice(-200));
      }
    });
    try {
      const events = await handle.promise;
      setEvents(events);
      setProgress(100);
      setScanProgress(100);
      setLastScanAt(Date.now());
      upsertEvents(events.slice(0, 500)).catch(() => {});
    } finally {
      setScanInProgress(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={startScan}
        disabled={scanInProgress || debris.length === 0}
        className="relative inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-cyan-500/80 to-sky-500/80 hover:from-cyan-400 hover:to-sky-400 text-slate-900 font-semibold text-sm shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {scanInProgress ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <PlayCircle className="w-4 h-4" />
        )}
        <span>{scanInProgress ? "扫描进行中…" : "启动近距离会合扫描"}</span>
      </button>
      <div className="flex items-center gap-4 text-[11px] hud-text text-space-dim">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>视窗 {labConfig.horizonHours}h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" />
          <span>步长 {labConfig.stepSec}s</span>
        </div>
      </div>
      {scanInProgress && (
        <div className="flex items-center gap-2 min-w-[180px]">
          <div className="flex-1 h-1.5 bg-space-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-sky-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] hud-text text-cyan-300">
            {progress.toFixed(0)}%
          </span>
          <span className="text-[10px] hud-text text-space-dim">
            {throughput.toFixed(0)} e/s · {duration.toFixed(0)}ms
          </span>
        </div>
      )}
    </div>
  );
}
