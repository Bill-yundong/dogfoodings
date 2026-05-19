import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Simulation from '@/pages/Simulation';
import Monitoring from '@/pages/Monitoring';
import Operation from '@/pages/Operation';
import DataManage from '@/pages/DataManage';
import Settings from '@/pages/Settings';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/simulation" replace />} />
        <Route element={<Layout />}>
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/operation" element={<Operation />} />
          <Route path="/data-manage" element={<DataManage />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/simulation" replace />} />
      </Routes>
    </Router>
  );
}
