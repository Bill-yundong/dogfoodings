import { For } from 'solid-js';
import { A } from '@solidjs/router';

const navItems = [
  { href: '/', icon: '⬡', label: '效能驾驶舱' },
  { href: '/focus', icon: '◉', label: '专注力动能' },
  { href: '/matrix', icon: '⊞', label: '任务映射矩阵' },
  { href: '/atlas', icon: '◈', label: '效能图谱' },
];

export default function Sidebar() {
  return (
    <aside class="w-64 bg-[#0d1120] border-r border-[#00f0ff]/10 flex flex-col h-full">
      <div class="px-4 pt-6 pb-4">
        <h1 class="font-[Orbitron] text-lg font-bold tracking-wider text-[#00f0ff]">
          FOCUSFLOW
        </h1>
        <p class="text-xs text-gray-500 mt-1">注意力执行优化系统</p>
      </div>

      <nav class="flex-1 py-2">
        <For each={navItems}>
          {(item) => (
            <A
              href={item.href}
              class="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors"
              activeClass="bg-[#00f0ff]/10 text-[#00f0ff] border-l-2 border-[#00f0ff] hover:text-[#00f0ff] hover:bg-[#00f0ff]/10"
            >
              <span class="text-base">{item.icon}</span>
              <span class="text-sm">{item.label}</span>
            </A>
          )}
        </For>
      </nav>

      <div class="px-4 py-4 border-t border-[#00f0ff]/10">
        <p class="text-xs text-gray-600">v1.0.0</p>
        <div class="flex items-center gap-2 mt-1">
          <span class="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span class="text-xs text-gray-500">本地数据引擎</span>
        </div>
      </div>
    </aside>
  );
}
