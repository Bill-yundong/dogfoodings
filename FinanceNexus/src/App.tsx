import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Transactions } from '@/pages/Transactions';
import { Tax } from '@/pages/Tax';
import { Finance } from '@/pages/Finance';
import { Simulation } from '@/pages/Simulation';
import { Settings } from '@/pages/Settings';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuthStore } from '@/store/useAuthStore';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [hasLocalAuth, setHasLocalAuth] = useState(false);

  useEffect(() => {
    setHasLocalAuth(localStorage.getItem('auth_user') !== null);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary-950 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-500 to-amber-500 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary-950 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-slate-400">加载中...</p>
        </div>
      </div>
    );
  }

  const isAuth = isAuthenticated || hasLocalAuth;
  return isAuth ? <>{children}</> : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <MainLayout title="财务仪表盘">
                <Dashboard />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <PrivateRoute>
              <MainLayout title="记账中心">
                <Transactions />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/tax"
          element={
            <PrivateRoute>
              <MainLayout title="税务规划">
                <Tax />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/finance"
          element={
            <PrivateRoute>
              <MainLayout title="理财辅助">
                <Finance />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/simulation"
          element={
            <PrivateRoute>
              <MainLayout title="模拟引擎">
                <Simulation />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <MainLayout title="系统设置">
                <Settings />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
