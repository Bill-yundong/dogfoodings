import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Keypoints from "@/pages/Keypoints";
import History from "@/pages/History";

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-[#0A0E1A] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/keypoints" element={<Keypoints />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
