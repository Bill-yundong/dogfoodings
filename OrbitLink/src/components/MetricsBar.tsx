import { Activity, Radar, AlertTriangle, Gauge } from "lucide-react";

interface Stat {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <div className="relative corner-bracket glass-panel px-4 py-3 rounded-md">
      <div className="flex items-start gap-3">
        <div
          className={`w-8 h-8 rounded-md flex items-center justify-center ${stat.color}`}
        >
          {stat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-space-dim">
            {stat.label}
          </div>
          <div className="font-display text-xl font-semibold text-space-text leading-tight">
            {stat.value}
          </div>
          {stat.sub && (
            <div className="text-[11px] text-space-dim mt-0.5 hud-text">{stat.sub}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MetricsBar({
  orbitCount,
  eventsCount,
  alertCount,
  avgLatencyMs,
  throughput,
}: {
  orbitCount: number;
  eventsCount: number;
  alertCount: number;
  avgLatencyMs: number;
  throughput: number;
}) {
  const stats: Stat[] = [
    {
      label: "活动轨道数",
      value: orbitCount.toLocaleString(),
      sub: "IndexedDB 已加载",
      icon: <Radar className="w-4 h-4 text-cyan-300" />,
      color: "bg-cyan-500/10 border border-cyan-500/30",
    },
    {
      label: "会合事件",
      value: eventsCount.toLocaleString(),
      sub: "TCA 未来 24h 内",
      icon: <Activity className="w-4 h-4 text-cyan-300" />,
      color: "bg-sky-500/10 border border-sky-500/30",
    },
    {
      label: "Pc 超阈值",
      value: alertCount.toLocaleString(),
      sub: "红线事件",
      icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
      color: "bg-red-500/10 border border-red-500/30",
    },
    {
      label: "计算吞吐",
      value: `${throughput.toFixed(0)} ephem/s`,
      sub: `延迟 ${avgLatencyMs.toFixed(0)} ms`,
      icon: <Gauge className="w-4 h-4 text-amber-300" />,
      color: "bg-amber-500/10 border border-amber-500/30",
    },
  ];
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <StatCard key={i} stat={s} />
      ))}
    </div>
  );
}
