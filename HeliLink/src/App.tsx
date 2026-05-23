import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import RoutePlanning from "@/pages/RoutePlanning";
import SemanticSync from "@/pages/SemanticSync";
import OfflineManagement from "@/pages/OfflineManagement";
import SystemManagement from "@/pages/SystemManagement";

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#1B998B",
          colorInfo: "#1B998B",
          colorSuccess: "#1B998B",
          colorWarning: "#F46036",
          colorError: "#EF4444",
          colorBgBase: "#0a0e17",
          colorBgContainer: "#0f141f",
          colorBgElevated: "#1f2937",
          colorBorder: "#1f2937",
          colorText: "#f1f5f9",
          colorTextSecondary: "#94a3b8",
          borderRadius: 8,
        },
        components: {
          Menu: {
            itemBg: "transparent",
            itemSelectedBg: "#1B998B20",
            itemSelectedColor: "#1B998B",
            itemHoverBg: "#1f2937",
            itemHoverColor: "#f1f5f9",
          },
          Button: {
            colorPrimary: "#1B998B",
            colorPrimaryHover: "#0d5c53",
            colorPrimaryActive: "#0a4a42",
          },
          Input: {
            colorBgContainer: "#1f2937",
            colorBorder: "#374151",
            colorText: "#f1f5f9",
          },
          Select: {
            colorBgContainer: "#1f2937",
            colorBorder: "#374151",
            colorText: "#f1f5f9",
          },
          Card: {
            colorBgContainer: "#0f141f",
            colorBorder: "#1f2937",
          },
          Table: {
            colorBgContainer: "#0f141f",
            colorBgElevated: "#1f2937",
            colorBorderSecondary: "#1f2937",
            colorText: "#f1f5f9",
          },
          Modal: {
            colorBgElevated: "#0f141f",
            colorIcon: "#94a3b8",
          },
          Slider: {
            colorPrimary: "#1B998B",
            colorBgElevated: "#374151",
          },
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/route"
              element={
                <ProtectedRoute permission="route:create">
                  <RoutePlanning />
                </ProtectedRoute>
              }
            />
            <Route
              path="/semantic"
              element={
                <ProtectedRoute permission="sync:configure">
                  <SemanticSync />
                </ProtectedRoute>
              }
            />
            <Route
              path="/offline"
              element={
                <ProtectedRoute permission="offline:access">
                  <OfflineManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/system"
              element={
                <ProtectedRoute permission="*">
                  <SystemManagement />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}
