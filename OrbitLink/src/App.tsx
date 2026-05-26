import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import Lab from "@/pages/Lab";

export default function App() {
  return (
    <Router>
      <div className="h-screen w-screen flex bg-space-void starfield">
        <Sidebar />
        <main className="flex-1 min-w-0 h-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/lab" element={<Lab />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
