import { For } from 'solid-js'
import { A } from '@solidjs/router'

const navItems = [
  { href: '/', icon: '◈', label: '效能驾驶舱', description: '概览与统计' },
  { href: '/focus', icon: '◉', label: '专注力动能', description: '实时专注追踪' },
  { href: '/matrix', icon: '◧', label: '任务映射矩阵', description: '优先级管理' },
  { href: '/atlas', icon: '⬡', label: '效能图谱', description: '长周期分析' },
]

export default function Sidebar() {
  return (
    <aside class="w-64 bg-[#0f172a] border-r border-[rgba(148,163,184,0.08)] flex flex-col h-full">
      <div class="px-6 pt-8 pb-6">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-[#6366f1]/20">
            <span class="text-white text-lg font-bold">F</span>
          </div>
          <div>
            <h1 class="text-base font-semibold tracking-tight text-white">
              FocusFlow
            </h1>
            <p class="text-[11px] text-slate-500">效能管理系统</p>
          </div>
        </div>
      </div>

      <nav class="flex-1 px-3 py-2">
        <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2 mb-1">
          功能模块
        </div>
        <For each={navItems}>
          {(item) => (
            <A
              href={item.href}
              class="block px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-200 group"
              activeClass="bg-[#6366f1]/10 text-[#6366f1]"
              inactiveClass="text-slate-400 hover:bg-[#334155]/30 hover:text-slate-200"
              end={item.href === '/'}
            >
              <div class="flex items-center gap-3">
                <span class="w-7 h-7 rounded-md flex items-center justify-center text-base group-[.active]:bg-[#6366f1]/20">
                  {item.icon}
                </span>
                <div>
                  <div class="text-sm font-medium">{item.label}</div>
                  <div class="text-[11px] text-slate-500 group-hover:text-slate-400 transition-colors">
                    {item.description}
                  </div>
                </div>
              </div>
            </A>
          )}
        </For>
      </nav>

      <div class="px-3 py-4 border-t border-[rgba(148,163,184,0.08)]">
        <div class="px-3 py-3 rounded-lg bg-[#1e293b]/50">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span class="text-[11px] text-slate-400 font-medium">本地数据引擎</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-slate-500">v1.0.0</span>
            <span class="text-[11px] text-slate-500">已就绪</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
