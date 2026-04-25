import './App.css'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import RiskMap from '../components/RiskMap'
import Landing from '../components/Landing'
import Login from '../components/Login'
import Register from '../components/Register'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LogOut, User as UserIcon } from 'lucide-react'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-fw-primary text-fw-bg' : 'text-fw-text hover:bg-fw-secondary/30',
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="flex items-center gap-3 border-b border-fw-neutral/30 bg-fw-bg px-4 py-3 shadow-sm">
      <strong className="mr-2 text-base font-bold text-fw-primary">FloodWise</strong>
      <div className="flex flex-1 gap-2">
        <NavLink to="/" className={navLinkClass}>
          Home
        </NavLink>
        <NavLink to="/map" className={navLinkClass}>
          Risk Map
        </NavLink>
      </div>
      
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-fw-text">
              <UserIcon className="h-4 w-4" />
              <span>{user.full_name || user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
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
              className="rounded-md bg-fw-primary px-3 py-1.5 text-sm font-medium text-fw-bg hover:bg-fw-primary-hover transition-colors shadow-sm shadow-fw-primary/20"
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
      <h1 className="mb-2 text-2xl font-semibold text-fw-text">Pagina nu există</h1>
      <p className="text-fw-text opacity-80">
        Mergi la{' '}
        <NavLink className="font-semibold text-fw-primary hover:text-fw-primary-hover" to="/">
          Pagina Principală
        </NavLink>
        .
      </p>
    </main>
  )
}

export default App
