import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ControlTowerPage from './pages/ControlTower';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ControlTowerPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
