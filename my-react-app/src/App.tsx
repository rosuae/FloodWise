import './App.css'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import RiskMap from '../components/RiskMap'
import Dashboard from '../components/Dashboard'
import Landing from '../components/Landing'
import Login from '../components/Login'
import Register from '../components/Register'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LogOut, User as UserIcon, Shield, LayoutDashboard, Bell, MapIcon } from 'lucide-react'
import { useState } from 'react'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-bold transition-all',
    isActive ? 'bg-fw-primary text-fw-bg shadow-sm shadow-fw-primary/20 scale-105' : 'text-fw-text hover:bg-fw-secondary/30',
  ].join(' ')

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">Încărcare...</div>;
  if (!token) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showAlerts, setShowAlerts] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const alerts = [
    { id: 1, title: 'Early Warning: Precipitații Extreme', time: 'Acum 2h', severity: 'high' },
    { id: 2, title: 'Alertă Saturație Sol', time: 'Acum 5h', severity: 'medium' }
  ];

  return (
    <nav className="flex items-center gap-6 border-b border-fw-neutral/30 bg-fw-bg px-6 py-4 shadow-sm relative z-50">
      <NavLink to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
        <div className="w-8 h-8 bg-fw-primary rounded-lg flex items-center justify-center shadow-sm">
          <Shield className="text-fw-bg" size={18} />
        </div>
        <span className="text-xl font-bold tracking-tight text-fw-text">Flood<span className="text-fw-primary">Wise</span></span>
      </NavLink>
      
      <div className="flex flex-1 gap-2 border-l border-fw-neutral/20 pl-6">
        <NavLink to="/dashboard" className={navLinkClass}>
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>
        <NavLink to="/map" className={navLinkClass}>
          <MapIcon size={16} />
          Risk Map
        </NavLink>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setShowAlerts(!showAlerts)}
                className="p-2 text-fw-text hover:bg-fw-secondary/30 rounded-full transition-colors relative"
              >
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-fw-bg"></span>
              </button>

              {showAlerts && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-fw-neutral/20 rounded-xl shadow-2xl p-4 z-[100]">
                  <h4 className="text-xs font-black uppercase text-fw-text/50 mb-3 tracking-widest">Alerte Recente</h4>
                  <div className="space-y-3">
                    {alerts.map(alert => (
                      <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${alert.severity === 'high' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'}`}>
                        <div className="text-xs font-bold text-fw-text">{alert.title}</div>
                        <div className="text-[10px] text-fw-text/60 mt-1">{alert.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm font-bold text-fw-text border-l border-fw-neutral/20 pl-4">
              <UserIcon className="h-4 w-4 text-fw-primary" />
              <span>{user.full_name || user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <NavLink to="/login" className={navLinkClass}>
              Login
            </NavLink>
            <NavLink
              to="/register"
              className="rounded-md bg-fw-primary px-3 py-1.5 text-sm font-bold text-fw-bg hover:bg-fw-primary-hover transition-colors shadow-sm shadow-fw-primary/20"
            >
              Register
            </NavLink>
          </div>
        )}
      </div>
    </nav>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex h-dvh flex-col bg-fw-bg text-fw-text">
          <Navbar />
          <main className="flex-1 overflow-y-auto flex flex-col">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/map"
                element={
                  <ProtectedRoute>
                    <RiskMap />
                  </ProtectedRoute>
                }
              />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

function NotFoundPage() {
  return (
    <main className="px-6 py-8">
      <h1 className="mb-2 text-2xl font-semibold text-fw-text uppercase font-black">Pagina nu există</h1>
      <p className="text-fw-text opacity-80 font-bold">
        Mergi la{' '}
        <NavLink className="font-black text-fw-primary hover:text-fw-primary-hover" to="/">
          Pagina Principală
        </NavLink>
        .
      </p>
    </main>
  )
}

export default App
