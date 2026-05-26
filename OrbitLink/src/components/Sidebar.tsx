import { NavLink } from "react-router-dom";
import { Orbit, Database, Cpu, Satellite, GitBranch } from "lucide-react";

const items = [
  { to: "/", label: "态势总览", icon: Orbit },
  { to: "/catalog", label: "碎片档案", icon: Database },
  { to: "/lab", label: "仿真实验室", icon: Cpu },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 h-full border-r border-space-border bg-space-base/60 backdrop-blur-md flex flex-col">
      <div className="h-16 px-5 flex items-center gap-2 border-b border-space-border">
        <div className="w-9 h-9 rounded-md bg-gradient-to-br from-cyan-400 to-sky-600 flex items-center justify-center shadow-glow">
          <Satellite className="w-5 h-5 text-slate-900" />
        </div>
        <div className="leading-tight">
          <div className="font-display font-bold text-space-text text-sm tracking-wider">
            ORBIT<span className="text-cyan-300">LINK</span>
          </div>
          <div className="text-[10px] text-space-dim hud-text tracking-widest">
            CONJUNCTION · SSA
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-200 border border-cyan-400/30"
                  : "text-space-dim hover:text-space-text hover:bg-slate-800/40 border border-transparent"
              }`
            }
          >
            <it.icon className="w-4 h-4" />
            <span>{it.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-space-border text-[10px] text-space-dim hud-text">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3 h-3" />
          <span>v0.1.0 · build 2026.05</span>
        </div>
        <div className="mt-1">Status: <span className="text-emerald-400">ONLINE</span></div>
      </div>
    </aside>
  );
}
