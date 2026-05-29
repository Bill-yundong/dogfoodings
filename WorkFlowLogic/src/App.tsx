import { Route } from '@solidjs/router'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import FocusKinetics from './pages/FocusKinetics'
import TaskMatrix from './pages/TaskMatrix'
import EfficiencyAtlas from './pages/EfficiencyAtlas'

export default function App() {
  return (
    <Route path="/" component={Layout}>
      <Route path="/" component={Dashboard} />
      <Route path="/focus" component={FocusKinetics} />
      <Route path="/matrix" component={TaskMatrix} />
      <Route path="/atlas" component={EfficiencyAtlas} />
    </Route>
  )
}
