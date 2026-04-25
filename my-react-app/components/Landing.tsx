import { Shield, Map, Zap, Database, Satellite, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

const FloodWiseLanding = () => {
  return (
    <div className="min-h-screen bg-fw-bg text-fw-text font-sans relative transition-colors duration-300">
      
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
          <div className="w-10 h-10 bg-fw-primary rounded-lg flex items-center justify-center">
            <Shield className="text-fw-bg" size={24} />
          </div>
          <span className="text-2xl font-bold tracking-tight text-fw-text">Flood<span className="text-fw-primary">Wise</span></span>
        </div>
        <div className="hidden md:flex gap-8 font-medium text-fw-text opacity-80">
          <a href="#features" className="hover:text-fw-primary transition">Features</a>
          <a href="#data" className="hover:text-fw-primary transition">Data Sources</a>
          <a href="#api" className="hover:text-fw-primary transition">API</a>
        </div>
        <Link to="/map" className="bg-fw-text text-fw-bg px-5 py-2.5 rounded-full font-semibold hover:opacity-90 transition shadow-lg shadow-fw-primary/20">
          Open Dashboard
        </Link>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 pt-20 pb-32 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-fw-secondary/30 border border-fw-secondary text-fw-primary font-bold text-sm">
          ESA / EU Space Hackathon Challenge #3
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-fw-text">
          Predict. Warn. <span className="text-fw-primary">Protect.</span>
        </h1>
        <div className='flex justify-center'>
            <p className="text-xl text-fw-text opacity-75 leading-relaxed max-w-3xl mx-auto mb-10">
          AI-powered flood prediction and early warning platform using European space data. 
          Monitor soil moisture and precipitation levels before disasters strike.
        </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register" className="px-8 py-4 bg-fw-primary text-fw-bg rounded-xl font-bold text-lg hover:bg-fw-primary-hover transition shadow-xl shadow-fw-primary/20 text-center">
            Get Started
          </Link>
          <button className="px-8 py-4 bg-transparent border border-fw-neutral rounded-xl font-bold text-lg hover:border-fw-primary transition text-fw-text">
            View Docs
          </button>
        </div>
      </header>

      {/* Stats/Badges */}
      <section className="relative z-10 border-y border-fw-neutral/20 bg-fw-bg/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto py-12 flex flex-wrap justify-center gap-12 opacity-80">
          <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-fw-text">
            <Database size={18} /> Copernicus Data
          </div>
          <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-fw-text">
             <Satellite size={18} /> Galileo GNSS-R
          </div>
          <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-fw-text">
             Open Source MIT
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl font-bold mb-4 text-fw-text">Powerful Features</h2>
          <p className="text-fw-text opacity-70">Built for communities, municipalities, and emergency responders.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              icon: <Map className="text-fw-primary" />, 
              title: "Risk Mapping", 
              desc: "Per-area risk scores updated on ingestion of new satellite data." 
            },
            { 
              icon: <Bell className="text-fw-primary" />, 
              title: "Early Warnings", 
              desc: "Configurable threshold triggers via webhooks, email, or SMS." 
            },
            { 
              icon: <Zap className="text-fw-primary" />, 
              title: "Real-time Dashboard", 
              desc: "React-based UI with risk overlays and time-series charts." 
            }
          ].map((feature, i) => (
            <div key={i} className="p-8 bg-fw-bg border border-fw-neutral/30 rounded-2xl shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 bg-fw-secondary/20 rounded-lg flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-fw-text">{feature.title}</h3>
              <p className="text-fw-text opacity-80 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Overview Section */}
      <section className="relative z-10 py-24 border-y border-fw-primary/20 bg-[#1a240f] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="text-left">
            <h2 className="text-4xl font-black mb-6 text-[#FBF5DB] leading-tight">Full Stack Reliability</h2>
            <p className="text-[#C0B6AC] mb-8 text-lg leading-relaxed font-bold">
              Combining Sentinel-1 SAR and Sentinel-2 MSI data with high-fidelity 
              weather reanalysis to create the most accurate flood prediction engine.
            </p>
            <div className="space-y-4">
              {[
                "FastAPI backend with PostgreSQL storage",
                "Machine Learning prediction engine (Python)",
                "Automated Alembic migration workflow",
                "Sentinel-1/2 data processing with GDAL/Rasterio",
                "Real-time WebSocket alerts for critical events"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#f8d856]" />
                  <span className="text-[#FBF5DB] font-bold text-sm tracking-tight">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-[#2d3a1d] p-1 rounded-2xl shadow-2xl overflow-hidden border-2 border-[#FBF5DB]/20">
            <div className="bg-[#1a240f]/40 px-5 py-4 border-b border-[#FBF5DB]/10 flex justify-between items-center">
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/40" />
              </div>
              <span className="text-[11px] font-mono font-black tracking-widest text-[#f8d856] uppercase px-2 py-0.5 bg-white/5 rounded">API Explorer</span>
            </div>
            <div className="p-8 text-left bg-[#1a240f]/20">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-mono font-black text-[#1a240f] bg-[#f8d856] px-3 py-1.5 rounded shadow-sm">GET</span>
                <span className="text-sm font-mono font-bold text-[#C0B6AC]">/api/v1/alerts</span>
              </div>
              <pre className="font-mono text-sm leading-relaxed text-[#C0B6AC] font-bold">
{`{
  "`}<span className="text-[#f8d856]">region</span>{`": "RO-IF-001",
  "`}<span className="text-[#f8d856]">risk_level</span>{`": "high",
  "`}<span className="text-[#f8d856]">score</span>{`": 0.82,
  "`}<span className="text-[#f8d856]">coordinates</span>{`": { 
    "lat": 44.4325, 
    "lon": 26.1025 
  },
  "`}<span className="text-[#f8d856]">status</span>{`": "active"
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 max-w-7xl mx-auto border-t border-fw-neutral/30 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 text-fw-text">
            <Shield className="text-fw-primary" size={20} />
            <span className="font-bold">FloodWise</span>
          </div>
          <div className="text-fw-text opacity-60 text-sm">
            © 2026 FloodWise Contributors. Built for ESA Disaster Monitoring.
          </div>
          <div className="flex gap-6 text-fw-text opacity-60">
            <span>License: MIT</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FloodWiseLanding;