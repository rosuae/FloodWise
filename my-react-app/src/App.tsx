import './App.css'
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import RiskMap from '../components/RiskMap'
import Landing from '../components/Landing'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200',
  ].join(' ')

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-dvh flex-col bg-slate-100 text-slate-900">
        <nav className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <strong className="mr-2 text-base font-bold">FloodWise</strong>
          <NavLink to="/" className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/map" className={navLinkClass}>
            Risk Map
          </NavLink>
        </nav>

        <div className="min-h-0 flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/map" element={<RiskMap />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
function NotFoundPage() {
  return (
    <main className="px-6 py-8">
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Pagina nu există</h1>
      <p className="text-slate-700">
        Mergi la{' '}
        <NavLink className="font-semibold text-blue-700 hover:text-blue-800" to="/map">
          Risk Map
        </NavLink>
        .
      </p>
    </main>
  )
}

export default App
