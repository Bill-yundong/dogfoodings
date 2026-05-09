import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { VisibilitySyncProvider } from './context/VisibilitySyncContext';
import { UrbanDesignModule } from './components/UrbanDesignModule';
import { TrafficAssessmentModule } from './components/TrafficAssessmentModule';

function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '🏛️ 城市设计模块', description: '视域分析与空间感知' },
    { path: '/traffic', label: '🚦 交通评估模块', description: '交通流预测与路网评估' }
  ];

  return (
    <div style={{ backgroundColor: '#2C3E50', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '70px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>🌆</span>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '20px',
                  color: '#FFFFFF',
                  fontWeight: 600
                }}
              >
                StreetVision
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: '11px',
                  color: '#BDC3C7'
                }}
              >
                城市街道通达性评价系统
              </p>
            </div>
          </div>

          <nav style={{ display: 'flex', gap: '8px' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    backgroundColor: isActive ? '#3498DB' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#ECF0F1',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span style={{ fontSize: '13px' }}>{item.label}</span>
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>{item.description}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F5F7FA'
      }}
    >
      <Navigation />
      <Routes>
        <Route path="/" element={<UrbanDesignModule />} />
        <Route path="/traffic" element={<TrafficAssessmentModule />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <VisibilitySyncProvider>
        <AppContent />
      </VisibilitySyncProvider>
    </BrowserRouter>
  );
}
