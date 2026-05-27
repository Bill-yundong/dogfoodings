import { createSignal } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import SafetyOverview from './pages/SafetyOverview'
import LeakMapping from './pages/LeakMapping'
import OverpressurePreview from './pages/OverpressurePreview'
import Coordination from './pages/Coordination'

const pages: Record<string, any> = {
  '/': SafetyOverview,
  '/leak-mapping': LeakMapping,
  '/overpressure': OverpressurePreview,
  '/coordination': Coordination,
}

export default function App() {
  const [currentPath, setCurrentPath] = createSignal('/')

  return (
    <div class="flex h-screen w-screen overflow-hidden bg-hydro-navy">
      <Sidebar currentPath={currentPath()} onNavigate={setCurrentPath} />
      <div class="flex-1 flex flex-col min-w-0">
        <TopBar />
        <div class="flex-1 flex min-h-0">
          <Dynamic component={pages[currentPath()] || SafetyOverview} />
        </div>
      </div>
    </div>
  )
}
