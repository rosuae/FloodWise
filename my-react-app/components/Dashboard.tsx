import React, { useState } from 'react';
import { 
  Droplets, 
  CloudRain, 
  AlertTriangle, 
  TrendingUp, 
  Leaf,
  Waves,
  Satellite,
  Navigation,
  Bell,
  Thermometer,
  Wind,
  Info
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const [activeAlerts] = useState([
    { id: 1, title: 'Early Warning: Precipitații Extreme', time: 'Acum 2h', coords: '44.4391° N, 26.0950° E', severity: 'high' },
    { id: 2, title: 'Alertă Saturație Sol', time: 'Acum 5h', coords: 'Galileo Precision Active', severity: 'medium' }
  ]);

  const stats = {
    soilMoisture: 42, // Sentinel-1
    ndvi: 0.78,      // Sentinel-2
    saturationHistory: [30, 45, 58, 52, 40, 42],
    weather: {
      temp: 22,
      condition: 'Senin',
      precip: '2mm',
      wind: '14 km/h'
    }
  };

  const chartWidth = 500;
  const chartHeight = 100;
  const points = stats.saturationHistory.map((val, i) => {
    const x = (i / (stats.saturationHistory.length - 1)) * chartWidth;
    const y = chartHeight - (val / 100) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="min-h-full bg-fw-bg p-6 md:p-8 text-fw-text font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TOP HEADER & ALERTS */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-2">
            <h1 className="text-4xl font-black tracking-tight uppercase">
              Control <span className="text-fw-primary">Satelitar</span>
            </h1>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-60">
              <span className="flex items-center gap-1"><Satellite size={12}/> Sentinel-1/2 Active</span>
              <span className="flex items-center gap-1 text-fw-primary"><Navigation size={12}/> Galileo Precision: 0.1m</span>
            </div>
          </div>

          {/* EARLY WARNING PUSH ALERTS */}
          <div className="lg:w-96 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase mb-2">
              <Bell size={16} className="text-red-500 animate-bounce" />
              Early Warning (Push)
            </div>
            {activeAlerts.map(alert => (
              <div key={alert.id} className={`p-3 rounded-xl border-l-4 shadow-sm bg-white/50 flex items-start gap-3 ${
                alert.severity === 'high' ? 'border-red-500' : 'border-amber-500'
              }`}>
                <AlertTriangle size={18} className={alert.severity === 'high' ? 'text-red-500' : 'text-amber-500'} />
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-tight">{alert.title}</h4>
                  <p className="text-[10px] opacity-60 font-medium">{alert.coords} • {alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LIVE PARAMETERS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Soil Moisture (Sentinel-1) */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-fw-neutral/10 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Droplets size={120} />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Droplets size={24} />
              </div>
              <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded-full uppercase">Sentinel-1 Live</span>
            </div>
            <p className="text-xs font-bold opacity-50 uppercase mb-1">Umiditate Sol</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black text-fw-text">{stats.soilMoisture}%</h2>
              <TrendingUp size={16} className="text-green-500" />
            </div>
            <div className="mt-4 w-full bg-blue-50 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${stats.soilMoisture}%` }} />
            </div>
          </div>

          {/* NDVI (Sentinel-2) */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-fw-neutral/10 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity text-fw-primary">
              <Leaf size={120} />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-fw-primary/10 text-fw-primary rounded-2xl">
                <Leaf size={24} />
              </div>
              <span className="text-[9px] font-black bg-fw-primary/10 text-fw-primary px-2 py-1 rounded-full uppercase">Sentinel-2 Live</span>
            </div>
            <p className="text-xs font-bold opacity-50 uppercase mb-1">Sănătate Vegetație (NDVI)</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black text-fw-text">{stats.ndvi}</h2>
              <span className="text-xs font-black text-fw-primary uppercase">Optim</span>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-2 rounded-full ${i <= 4 ? 'bg-fw-primary' : 'bg-fw-neutral/10'}`} />
              ))}
            </div>
          </div>

          {/* Weather Forecast */}
          <div className="bg-fw-primary text-white rounded-3xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CloudRain size={120} />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Thermometer size={24} />
              </div>
              <span className="text-[9px] font-black bg-white/20 px-2 py-1 rounded-full uppercase">Hiper-Local</span>
            </div>
            <p className="text-xs font-bold opacity-70 uppercase mb-1">Prognoză Fermă</p>
            <h2 className="text-4xl font-black mb-1">{stats.weather.temp}°C</h2>
            <div className="flex gap-4 mt-4 text-[10px] font-black uppercase opacity-80">
              <span className="flex items-center gap-1"><CloudRain size={12}/> {stats.weather.precip}</span>
              <span className="flex items-center gap-1"><Wind size={12}/> {stats.weather.wind}</span>
            </div>
          </div>

        </div>

        {/* SATURATION HISTORY CHART */}
        <div className="bg-white border-2 border-fw-neutral/10 p-8 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <Waves size={18} className="text-blue-500" />
                Evoluție Saturație Sol
              </h3>
              <p className="text-[10px] font-bold opacity-40 uppercase">Analiză istorică pe ultimele luni</p>
            </div>
            <button className="text-[10px] font-black uppercase text-fw-primary flex items-center gap-1 border-b-2 border-fw-primary/20 pb-1">
              Exportă Date CSV
            </button>
          </div>
          
          <div className="relative h-[150px] w-full mt-4">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--theme-primary)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--theme-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`M 0 ${chartHeight} L ${points} L ${chartWidth} ${chartHeight} Z`} fill="url(#grad)" />
              <polyline fill="none" stroke="var(--theme-primary)" strokeWidth="3" points={points} />
              {stats.saturationHistory.map((val, i) => (
                <circle key={i} cx={(i / (stats.saturationHistory.length - 1)) * chartWidth} cy={chartHeight - (val / 100) * chartHeight} r="4" fill="white" stroke="var(--theme-primary)" strokeWidth="2" />
              ))}
            </svg>
            <div className="flex justify-between mt-4 text-[9px] font-black uppercase opacity-30">
              <span>Noiembrie</span>
              <span>Decembrie</span>
              <span>Ianuarie</span>
              <span>Februarie</span>
              <span>Martie</span>
              <span>Aprilie</span>
            </div>
          </div>
        </div>

        {/* INFO FOOTER */}
        <div className="bg-fw-accent/10 border border-fw-accent/20 p-4 rounded-2xl flex items-center gap-4 text-fw-text/70">
          <Info size={20} className="text-fw-accent" />
          <p className="text-[10px] font-bold uppercase tracking-tight">
            Datele sunt procesate folosind constelația <span className="text-fw-primary">Sentinel</span> și verificate prin rețeaua de senzori IoT la sol cu precizie <span className="text-fw-primary">Galileo</span>.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
