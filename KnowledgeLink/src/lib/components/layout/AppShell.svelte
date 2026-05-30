<script lang="ts">
import Sidebar from './Sidebar.svelte'
import { Search } from 'lucide-svelte'

import Library from '$components/library/Library.svelte'
import LibraryDetail from '$components/library/LibraryDetail.svelte'
import Notes from '$components/notes/Notes.svelte'
import NoteEditor from '$components/notes/NoteEditor.svelte'
import Review from '$components/review/Review.svelte'
import ReviewSession from '$components/review/ReviewSession.svelte'
import MemoryCurves from '$components/review/MemoryCurves.svelte'
import Graph from '$components/graph/Graph.svelte'
import Dashboard from '$components/dashboard/Dashboard.svelte'

let currentRoute = $state('/library')

const sectionNames: Record<string, string> = {
  '/library': '阅读库',
  '/notes': '笔记',
  '/review': '复习',
  '/graph': '知识图谱',
  '/dashboard': '仪表板',
}

let currentSection = $derived.by(() => {
  for (const key of Object.keys(sectionNames)) {
    if (currentRoute === key || currentRoute.startsWith(key + '/')) {
      return sectionNames[key]
    }
  }
  return 'KnowledgeLink'
})

$effect(() => {
  function onHashChange() {
    currentRoute = window.location.hash.slice(1) || '/library'
  }
  currentRoute = window.location.hash.slice(1) || '/library'
  window.addEventListener('hashchange', onHashChange)
  return () => window.removeEventListener('hashchange', onHashChange)
})

function matchRoute(route: string) {
  if (route === '/' || route === '') return Library
  if (route === '/library') return Library
  if (route.startsWith('/library/')) return LibraryDetail
  if (route === '/notes') return Notes
  if (route.startsWith('/notes/')) return NoteEditor
  if (route === '/review/session') return ReviewSession
  if (route === '/review/curves') return MemoryCurves
  if (route === '/review') return Review
  if (route === '/graph') return Graph
  if (route === '/dashboard') return Dashboard
  return Library
}
</script>

<div class="flex h-screen w-screen overflow-hidden">
  <Sidebar {currentRoute} />

  <div class="flex-1 flex flex-col min-w-0">
    <header class="h-12 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
      <span class="text-sm text-text-secondary font-medium">{currentSection}</span>
      <button class="text-text-secondary hover:text-text transition-colors">
        <Search size={18} />
      </button>
    </header>

    <main class="flex-1 overflow-y-auto">
      {#key currentRoute}
        {@const Component = matchRoute(currentRoute)}
        <Component />
      {/key}
    </main>
  </div>
</div>
