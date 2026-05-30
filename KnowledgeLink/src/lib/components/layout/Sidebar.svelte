<script lang="ts">
import { BookOpen, FileText, Brain, Share2, BarChart3, Link, WifiOff } from 'lucide-svelte'

let { currentRoute = '' }: { currentRoute: string } = $props()

const navItems = [
  { route: '/library', label: '阅读库', icon: BookOpen },
  { route: '/notes', label: '笔记', icon: FileText },
  { route: '/review', label: '复习', icon: Brain },
  { route: '/graph', label: '知识图谱', icon: Share2 },
  { route: '/dashboard', label: '成长仪表板', icon: BarChart3 },
]

function isActive(route: string): boolean {
  if (route === '/library') {
    return currentRoute === '/library' || currentRoute.startsWith('/library/') || currentRoute === '/'
  }
  return currentRoute === route || currentRoute.startsWith(route + '/')
}

function navigate(route: string) {
  window.location.hash = route
}
</script>

<aside class="w-[240px] h-screen bg-bg flex flex-col border-r border-border shrink-0">
  <div class="px-5 py-6 flex items-center gap-2.5">
    <Link size={22} class="text-accent" />
    <span class="font-display text-xl font-bold text-accent tracking-wide">KnowledgeLink</span>
  </div>

  <nav class="flex-1 px-2 mt-2 flex flex-col gap-0.5">
    {#each navItems as item}
      {@const active = isActive(item.route)}
      <button
        class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-150 w-full text-left
          {active
            ? 'bg-surface text-accent border-l-[3px] border-accent'
            : 'text-text-secondary hover:bg-surface hover:text-text border-l-[3px] border-transparent'}"
        onclick={() => navigate(item.route)}
      >
        <item.icon size={18} />
        <span>{item.label}</span>
      </button>
    {/each}
  </nav>

  <div class="px-5 py-4 border-t border-border flex items-center gap-2 text-text-secondary text-xs">
    <WifiOff size={12} />
    <span>v1.0 · 离线模式</span>
  </div>
</aside>
