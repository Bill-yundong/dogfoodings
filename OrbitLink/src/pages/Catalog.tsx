import { useMemo, useState } from "react";
import { Search, Filter, Database } from "lucide-react";
import { useOrbitStore } from "@/store/orbit";
import type { Debris, OrbitClass } from "@/types/orbital";
import { jdToIso } from "@/utils/constants";

const CLASSES: OrbitClass[] = ["LEO", "MEO", "GEO", "HEO"];

export default function Catalog() {
  const debris = useOrbitStore((s) => s.debris);
  const catalogCount = useOrbitStore((s) => s.catalogCount);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<OrbitClass | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const filtered = useMemo(() => {
    return debris.filter((d) => {
      if (classFilter !== "ALL" && d.orbitClass !== classFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.noradId.toLowerCase().includes(q)
      );
    });
  }, [debris, search, classFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = page * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  const stats = useMemo(() => {
    const byClass = new Map<string, number>();
    debris.forEach((d) => {
      byClass.set(d.orbitClass, (byClass.get(d.orbitClass) ?? 0) + 1);
    });
    return byClass;
  }, [debris]);

  return (
    <div className="h-full flex flex-col">
      <header className="px-5 py-3 border-b border-space-border bg-space-base/70 backdrop-blur-md flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold text-space-text">
            编目碎片档案中心
          </h1>
          <p className="text-[11px] text-space-dim hud-text">
            基于 IndexedDB 的本地持久化 · 共 {catalogCount.toLocaleString()} 条记录
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-space-dim hud-text">
          <Database className="w-4 h-4 text-cyan-300" />
          <span>orbitlink-db</span>
          <span className="text-emerald-400">· 连接正常</span>
        </div>
      </header>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <button
            onClick={() => {
              setClassFilter("ALL");
              setPage(0);
            }}
            className={`glass-panel rounded-md px-3 py-2 text-left transition ${
              classFilter === "ALL"
                ? "border-cyan-400/60 bg-cyan-500/10"
                : ""
            }`}
          >
            <div className="text-[10px] text-space-dim hud-text">全部</div>
            <div className="font-display text-lg font-semibold text-space-text">
              {debris.length}
            </div>
          </button>
          {CLASSES.map((c) => (
            <button
              key={c}
              onClick={() => {
                setClassFilter(c);
                setPage(0);
              }}
              className={`glass-panel rounded-md px-3 py-2 text-left transition ${
                classFilter === c
                  ? "border-cyan-400/60 bg-cyan-500/10"
                  : ""
              }`}
            >
              <div className="text-[10px] text-space-dim hud-text">{c}</div>
              <div className="font-display text-lg font-semibold text-space-text">
                {stats.get(c) ?? 0}
              </div>
            </button>
          ))}
        </div>

        <div className="glass-panel rounded-md p-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-dim" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="搜索 NORAD ID / 名称..."
              className="w-full bg-space-base/80 border border-space-border rounded-md pl-9 pr-3 py-2 text-sm text-space-text placeholder:text-space-dim focus:outline-none focus:border-cyan-400/60"
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] hud-text text-space-dim">
            <Filter className="w-4 h-4" />
            <span>筛选 {filtered.length} / {debris.length}</span>
          </div>
        </div>

        <div className="glass-panel rounded-md overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-left text-[11px] hud-text">
              <thead className="bg-space-base/80 text-space-dim uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2">NORAD</th>
                  <th className="px-3 py-2">名称</th>
                  <th className="px-3 py-2">轨道类型</th>
                  <th className="px-3 py-2">a (km)</th>
                  <th className="px-3 py-2">e</th>
                  <th className="px-3 py-2">i (°)</th>
                  <th className="px-3 py-2">周期 (min)</th>
                  <th className="px-3 py-2">RCS (m²)</th>
                  <th className="px-3 py-2">Epoch</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((d: Debris) => (
                  <tr
                    key={d.noradId}
                    className="border-t border-space-border/50 hover:bg-slate-800/30"
                  >
                    <td className="px-3 py-1.5 text-cyan-300">{d.noradId}</td>
                    <td className="px-3 py-1.5 text-space-text">{d.name}</td>
                    <td className="px-3 py-1.5">
                      <span
                        className="px-1.5 py-0.5 rounded border border-slate-600/40 text-slate-300"
                        style={{ color: d.color }}
                      >
                        {d.orbitClass}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-space-text">
                      {d.elements.semiMajorAxisKm.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-space-text">
                      {d.elements.eccentricity.toFixed(5)}
                    </td>
                    <td className="px-3 py-1.5 text-space-text">
                      {d.elements.inclinationDeg.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-space-text">
                      {d.periodMin.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-space-text">
                      {d.rcsM2.toExponential(1)}
                    </td>
                    <td className="px-3 py-1.5 text-space-dim">
                      {jdToIso(d.epochJd)}
                    </td>
                  </tr>
                ))}
                {pageItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-10 text-center text-space-dim"
                    >
                      未找到匹配记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t border-space-border text-[11px] hud-text">
            <span className="text-space-dim">
              第 {page + 1} / {totalPages} 页
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2 py-1 rounded border border-space-border text-space-dim hover:text-space-text disabled:opacity-40"
              >
                上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 rounded border border-space-border text-space-dim hover:text-space-text disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
