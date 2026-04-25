import React, { useMemo } from 'react';
import { 
  Droplets, 
  CloudRain, 
  Mountain, 
  AlertTriangle, 
  TrendingUp, 
  Leaf,
  Waves,
  Calendar,
  Map as MapIcon,
  Info
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  
  const area = queryParams.get('area');
  const risk = queryParams.get('risk');
  const crop = queryParams.get('crop');
  const loss = queryParams.get('loss');

  // Mock data conform cerințelor
  const stats = {
    soilHumidity: 38,
    floodRisk: risk ? parseInt(risk) : 65, // procent
    plantationRisk: 42, // procent
    rainfall7Days: "42.5 mm",
    terrainSlope: "4.8°",
    // Umiditatea solului pe ultimele 6 luni
    humidityHistory: [
      { month: 'Nov', value: 32 },
      { month: 'Dec', value: 45 },
      { month: 'Jan', value: 58 },
      { month: 'Feb', value: 52 },
      { month: 'Mar', value: 40 },
      { month: 'Apr', value: 38 },
    ]
  };

  // Helper pentru desenarea graficului SVG
  const chartHeight = 120;
  const chartWidth = 500;
  const points = stats.humidityHistory.map((h, i) => {
    const x = (i / (stats.humidityHistory.length - 1)) * chartWidth;
    const y = chartHeight - (h.value / 100) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="min-h-full bg-fw-bg p-6 md:p-10 text-fw-text">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">
              Analytical <span className="text-fw-primary underline decoration-4 decoration-fw-accent">Dashboard</span>
            </h1>
            <p className="text-fw-text font-black uppercase text-xs tracking-widest bg-fw-primary/10 inline-block px-2 py-1 rounded">
              Agricultural Risk Monitoring System
            </p>
          </div>
          <div className="flex gap-4">
            <Link 
              to="/map" 
              className="flex items-center gap-2 bg-fw-primary text-fw-bg px-6 py-3 rounded-xl font-black uppercase text-sm shadow-lg shadow-fw-primary/30 hover:scale-105 transition-transform"
            >
              <MapIcon size={18} />
              Open Risk Map
            </Link>
            <div className="flex items-center gap-2 bg-white border-4 border-fw-primary px-4 py-2 rounded-xl">
              <Calendar size={16} className="text-fw-primary" />
              <span className="text-xs font-black uppercase text-black">April 2026</span>
            </div>
          </div>
        </header>

        {area && (
          <div className="mb-8 bg-fw-accent/20 border-l-8 border-fw-accent p-6 rounded-r-2xl flex items-center gap-6 animate-in fade-in slide-in-from-left duration-500">
            <div className="bg-fw-accent p-3 rounded-full text-black">
              <Info size={24} />
            </div>
            <div>
              <h4 className="font-black uppercase text-sm text-black">Selected Zone Analysis</h4>
              <p className="text-xs font-bold text-black/70">
                Analyzing an area of <span className="font-black text-black">{area} ha</span> with <span className="font-black text-black">{crop}</span> crop. 
                Estimated calculated loss: <span className="font-black text-red-600">{parseInt(loss || "0").toLocaleString()} EUR</span>.
              </p>
            </div>
          </div>
        )}

        {/* Risc Principal Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Riscul de Inundații */}
          <div className="bg-white border-4 border-blue-600 p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Waves size={160} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/40">
                  <Waves size={32} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-black">Flood Risk</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-7xl font-black text-blue-600">{stats.floodRisk}%</span>
                <span className="text-xs font-black text-black uppercase tracking-widest border-b-2 border-blue-600">Alert Level</span>
              </div>
              <div className="w-full bg-blue-100 h-6 rounded-full overflow-hidden mb-6 border-2 border-blue-600">
                <div 
                  className="bg-blue-600 h-full transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.5)]" 
                  style={{ width: `${stats.floodRisk}%` }}
                />
              </div>
              <p className="text-sm font-black leading-tight text-black/80 uppercase tracking-tighter">
                {stats.floodRisk > 70 ? 'Critical Alert! Imminent flood probability.' : 'High discharge probability in the selected area. Monitoring secondary dikes recommended.'}
              </p>
            </div>
          </div>

          {/* Riscul pentru Plantații */}
          <div className="bg-white border-4 border-fw-secondary p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-fw-secondary">
              <Leaf size={160} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-4 bg-fw-secondary text-white rounded-2xl shadow-lg shadow-fw-secondary/40">
                  <Leaf size={32} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-black">{crop || 'Crops'} Impact</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-7xl font-black text-fw-secondary">{stats.plantationRisk}%</span>
                <span className="text-xs font-black text-black uppercase tracking-widest border-b-2 border-fw-secondary">Vulnerability</span>
              </div>
              <div className="w-full bg-fw-secondary/10 h-6 rounded-full overflow-hidden mb-6 border-2 border-fw-secondary">
                <div 
                  className="bg-fw-secondary h-full transition-all duration-1000 shadow-[0_0_20px_rgba(145,164,54,0.5)]" 
                  style={{ width: `${stats.plantationRisk}%` }}
                />
              </div>
              <p className="text-sm font-black leading-tight text-black/80 uppercase tracking-tighter">
                {crop ? `${crop} crops are in the direct impact zone.` : 'Wheat and rapeseed crops are in the impact zone.'} Vulnerability is moderate due to favorable terrain slope.
              </p>
            </div>
          </div>
        </div>

        {/* Grafic Umiditate */}
        <div className="bg-white border-4 border-fw-primary p-8 rounded-3xl shadow-xl mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30">
                <Droplets size={24} />
              </div>
              <h3 className="font-black uppercase tracking-tighter text-xl text-black">Soil Humidity Evolution</h3>
            </div>
            <div className="flex items-center gap-2 bg-fw-accent text-black px-4 py-1.5 rounded-full font-black text-xs uppercase shadow-sm">
              <TrendingUp size={16} /> 
              <span>Active Satellite Monitoring</span>
            </div>
          </div>
          
          <div className="relative h-[220px] w-full mt-4 pb-12">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Grila */}
              {[0, 25, 50, 75, 100].map(level => (
                <line 
                  key={level}
                  x1="0" y1={chartHeight - (level / 100) * chartHeight} 
                  x2={chartWidth} y2={chartHeight - (level / 100) * chartHeight}
                  stroke="#000"
                  strokeOpacity="0.1"
                  strokeWidth="1"
                />
              ))}
              
              {/* Linia de grafic */}
              <polyline
                fill="none"
                stroke="var(--theme-primary)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="drop-shadow-lg"
              />
              
              {/* Punctele de date */}
              {stats.humidityHistory.map((h, i) => {
                const x = (i / (stats.humidityHistory.length - 1)) * chartWidth;
                const y = chartHeight - (h.value / 100) * chartHeight;
                return (
                  <circle 
                    key={i} 
                    cx={x} cy={y} r="6" 
                    fill="white" 
                    stroke="var(--theme-primary)" 
                    strokeWidth="4" 
                  />
                );
              })}
            </svg>
            
            {/* Label-uri luni */}
            <div className="flex justify-between mt-6 border-t-2 border-fw-neutral/10 pt-4 px-2">
              {stats.humidityHistory.map((h, i) => (
                <span key={i} className="text-xs font-black uppercase text-fw-text underline decoration-fw-primary decoration-2">{h.month}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Statistici Suplimentare */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-fw-primary text-fw-bg p-8 rounded-2xl flex items-center justify-between shadow-2xl shadow-fw-primary/40 border-b-8 border-fw-primary-hover">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-fw-bg/20 rounded-2xl">
                <CloudRain size={32} />
              </div>
              <div>
                <p className="text-xs font-black uppercase opacity-70 tracking-widest">Rainfall (Weekly)</p>
                <p className="text-4xl font-black">{stats.rainfall7Days}</p>
              </div>
            </div>
            <AlertTriangle size={32} className="text-fw-accent animate-pulse" />
          </div>

          <div className="bg-fw-text text-fw-bg p-8 rounded-2xl flex items-center justify-between shadow-2xl shadow-fw-text/40 border-b-8 border-black">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-fw-bg/20 rounded-2xl">
                <Mountain size={32} />
              </div>
              <div>
                <p className="text-xs font-black uppercase opacity-70 tracking-widest">Average Terrain Slope</p>
                <p className="text-4xl font-black">{stats.terrainSlope}</p>
              </div>
            </div>
            <div className="bg-fw-accent text-black px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg shadow-fw-accent/20">Status: Optimal</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
