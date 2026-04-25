import { Shield, Map, Zap, Database, Satellite, Bell } from 'lucide-react';

const FloodWiseLanding = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
      
      {/* Background Decor - Râul șerpuind pe toată înălțimea */}
      <svg
        className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10"
        preserveAspectRatio="none"
        viewBox="0 0 100 1000"
      >
        <path
          d="M 30 0 Q 70 150 20 300 T 50 600 T 30 900 T 60 1000"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.5"
        />
      </svg>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="text-white" size={24} />
          </div>
          <span className="text-2xl font-bold tracking-tight">Flood<span className="text-blue-600">Wise</span></span>
        </div>
        <div className="hidden md:flex gap-8 font-medium text-slate-600">
          <a href="#features" className="hover:text-blue-600 transition">Features</a>
          <a href="#data" className="hover:text-blue-600 transition">Data Sources</a>
          <a href="#api" className="hover:text-blue-600 transition">API</a>
        </div>
        <a href="/map" className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-semibold hover:bg-slate-800 transition shadow-lg shadow-slate-200">
          Open Dashboard
        </a>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 pt-20 pb-32 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold">
          ESA / EU Space Hackathon Challenge #3
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
          Predict. Warn. <span className="text-blue-600">Protect.</span>
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto mb-10">
          AI-powered flood prediction and early warning platform using European space data. 
          Monitor soil moisture and precipitation levels before disasters strike.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-200">
            Get Started
          </button>
          <button className="px-8 py-4 bg-white border border-slate-200 rounded-xl font-bold text-lg hover:border-blue-400 transition">
            View Docs
          </button>
        </div>
      </header>

      {/* Stats/Badges */}
      <section className="relative z-10 border-y border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto py-12 flex flex-wrap justify-center gap-12 opacity-70">
          <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-slate-500">
            <Database size={18} /> Copernicus Data
          </div>
          <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-slate-500">
             <Satellite size={18} /> Galileo GNSS-R
          </div>
          <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-slate-500">
             Open Source MIT
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
          <p className="text-slate-500">Built for communities, municipalities, and emergency responders.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              icon: <Map className="text-blue-600" />, 
              title: "Risk Mapping", 
              desc: "Per-area risk scores updated on ingestion of new satellite data." 
            },
            { 
              icon: <Bell className="text-blue-600" />, 
              title: "Early Warnings", 
              desc: "Configurable threshold triggers via webhooks, email, or SMS." 
            },
            { 
              icon: <Zap className="text-blue-600" />, 
              title: "Real-time Dashboard", 
              desc: "React-based UI with risk overlays and time-series charts." 
            }
          ].map((feature, i) => (
            <div key={i} className="p-8 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Overview Section */}
      <section className="relative z-10 py-24 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6 text-white">Full Stack Reliability</h2>
            <p className="text-slate-400 mb-8 text-lg">
              Combining Sentinel-1 SAR and Sentinel-2 MSI data with high-fidelity 
              weather reanalysis to create the most accurate flood prediction engine.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-slate-300">FastAPI backend with PostgreSQL storage</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-slate-300">Machine Learning prediction engine (Python)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-slate-300">Automated Alembic migration workflow</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 font-mono text-sm shadow-2xl">
            <div className="flex gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <p className="text-blue-400">GET /alerts</p>
            <pre className="text-slate-300 mt-2">
{`{
  "region": "RO-IF-001",
  "risk_score": 0.82,
  "level": "high",
  "drivers": [
    "soil_moisture",
    "precipitation"
  ]
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 max-w-7xl mx-auto border-t border-slate-200 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-600" size={20} />
            <span className="font-bold">FloodWise</span>
          </div>
          <div className="text-slate-500 text-sm">
            © 2026 FloodWise Contributors. Built for ESA Disaster Monitoring.
          </div>
          <div className="flex gap-6">
            <span className="text-slate-400">License: MIT</span>
            <span className="text-slate-400">v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FloodWiseLanding;