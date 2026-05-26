import { useEffect, useRef, useState } from "react";
import { useOrbitStore } from "@/store/orbit";
import { generateSyntheticCatalog } from "@/orbital/catalog";
import {
  countDebris,
  getAllDebris,
  setMeta,
  getMeta,
  upsertDebris,
} from "@/db/indexed";
import { currentJd as getCurrentJd, SECONDS_PER_DAY } from "@/utils/constants";
import SpaceView from "@/components/SpaceView";
import MetricsBar from "@/components/MetricsBar";
import TimeControl from "@/components/TimeControl";
import EventList from "@/components/EventList";
import TargetPanel from "@/components/TargetPanel";
import ScanButton from "@/components/ScanButton";

const CATALOG_SIZE = 1500;
const CATALOG_KEY = "catalog.v1";

export default function Home() {
  const setDebris = useOrbitStore((s) => s.setDebris);
  const setCatalogReady = useOrbitStore((s) => s.setCatalogReady);
  const setCatalogCount = useOrbitStore((s) => s.setCatalogCount);
  const debris = useOrbitStore((s) => s.debris);
  const events = useOrbitStore((s) => s.events);
  const labConfig = useOrbitStore((s) => s.labConfig);
  const tickJd = useOrbitStore((s) => s.tickJd);
  const currentJd = useOrbitStore((s) => s.currentJd);
  const selectedEventId = useOrbitStore((s) => s.selectedEventId);
  const selectEvent = useOrbitStore((s) => s.selectEvent);
  const scanThroughput = useOrbitStore((s) => s.scanThroughput);
  const scanDurationMs = useOrbitStore((s) => s.scanDurationMs);

  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(30);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(performance.now());

  useEffect(() => {
    let active = true;
    (async () => {
      const cached = await getMeta<boolean>(CATALOG_KEY);
      const n = await countDebris();
      if (!active) return;
      if (cached && n >= CATALOG_SIZE) {
        const list = await getAllDebris();
        setDebris(list);
        setCatalogCount(list.length);
        setCatalogReady(true);
        return;
      }
      const gen = generateSyntheticCatalog(CATALOG_SIZE);
      await upsertDebris(gen);
      await setMeta(CATALOG_KEY, true);
      setDebris(gen);
      setCatalogCount(gen.length);
      setCatalogReady(true);
    })();
    return () => {
      active = false;
    };
  }, [setDebris, setCatalogReady, setCatalogCount]);

  useEffect(() => {
    const step = () => {
      const now = performance.now();
      const dtRealSec = (now - lastRef.current) / 1000;
      lastRef.current = now;
      if (playing) {
        const simSeconds = dtRealSec * speed;
        tickJd(currentJd + simSeconds / SECONDS_PER_DAY);
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, speed, currentJd, tickJd]);

  const alertEvents = events.filter(
    (e) => e.collisionProbability > labConfig.pcThreshold || e.severity >= 2
  );

  return (
    <div className="h-full flex flex-col">
      <header className="px-5 py-3 border-b border-space-border bg-space-base/70 backdrop-blur-md flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold text-space-text">
            空间态势总览
          </h1>
          <p className="text-[11px] text-space-dim hud-text">
            LEO 主目标轨道 · 会合扫描 · 碰撞概率实时评估
          </p>
        </div>
        <ScanButton />
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <MetricsBar
          orbitCount={debris.length}
          eventsCount={events.length}
          alertCount={alertEvents.length}
          avgLatencyMs={scanDurationMs}
          throughput={scanThroughput}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 min-h-0">
          <div className="relative rounded-md overflow-hidden border border-space-border min-h-[480px]">
            <div className="absolute inset-0">
              <SpaceView />
            </div>
            <div className="absolute top-3 left-3 glass-panel rounded-md px-3 py-2 text-[11px] hud-text text-space-dim max-w-xs">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-cyan-200">目标航天器</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-red-300">会合碎片</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-500/60" />
                <span>LEO 参考轨道</span>
              </div>
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <TimeControl
                playing={playing}
                onToggle={() => setPlaying((p) => !p)}
                speed={speed}
                onSpeed={setSpeed}
              />
            </div>
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent animate-scan" />
          </div>

          <div className="flex flex-col gap-3 min-h-0">
            <TargetPanel />
            <div className="flex-1 min-h-[300px]">
              <EventList
                events={events}
                selectedId={selectedEventId}
                onSelect={selectEvent}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-panel rounded-md p-3 lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-sm font-semibold text-space-text">
                近期 Pc 超阈值事件
              </h3>
              <span className="text-[11px] hud-text text-space-dim">
                阈值 {labConfig.pcThreshold.toExponential(1)}
              </span>
            </div>
            <div className="space-y-1.5">
              {alertEvents.length === 0 && (
                <div className="text-center text-[11px] text-space-dim py-4 hud-text">
                  目前无超阈值事件 · 系统处于绿色态势
                </div>
              )}
              {alertEvents.slice(0, 8).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 px-2.5 py-1.5 rounded border border-red-500/20 bg-red-500/5 text-[11px] hud-text"
                >
                  <div className="w-1 h-6 rounded-full bg-red-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-red-300 truncate">{e.debrisName}</div>
                    <div className="text-space-dim">
                      miss {e.missDistanceKm.toFixed(2)} km · rel {e.relativeVelocityKmS.toFixed(1)} km/s
                    </div>
                  </div>
                  <div className="text-red-400">
                    Pc {e.collisionProbability.toExponential(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel rounded-md p-3">
            <h3 className="font-display text-sm font-semibold text-space-text mb-2">
              计算监控
            </h3>
            <div className="space-y-2 text-[11px] hud-text">
              <div className="flex justify-between border-b border-space-border/40 pb-1">
                <span className="text-space-dim">Worker 池</span>
                <span className="text-cyan-300">4 线程 × 就绪</span>
              </div>
              <div className="flex justify-between border-b border-space-border/40 pb-1">
                <span className="text-space-dim">扫描视窗</span>
                <span className="text-space-text">{labConfig.horizonHours} h</span>
              </div>
              <div className="flex justify-between border-b border-space-border/40 pb-1">
                <span className="text-space-dim">积分步长</span>
                <span className="text-space-text">{labConfig.stepSec} s</span>
              </div>
              <div className="flex justify-between border-b border-space-border/40 pb-1">
                <span className="text-space-dim">摄动模型</span>
                <span className="text-space-text">
                  J2{labConfig.j3 ? " + J3" : ""}
                </span>
              </div>
              <div className="flex justify-between border-b border-space-border/40 pb-1">
                <span className="text-space-dim">协方差缩放</span>
                <span className="text-space-text">{labConfig.covarianceScale}×</span>
              </div>
              <div className="flex justify-between">
                <span className="text-space-dim">当前 JD</span>
                <span className="text-space-text">{getCurrentJd().toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
