import React from 'react';
import { 
  Droplets, 
  CloudRain, 
  Mountain, 
  AlertTriangle, 
  TrendingUp, 
  Leaf,
  Waves,
  Calendar
} from 'lucide-react';

const Dashboard: React.FC = () => {
  // Mock data conform cerințelor
  const stats = {
    soilHumidity: 38,
    floodRisk: 65, // procent
    plantationRisk: 42, // procent
    rainfall7Days: "42.5 mm",
    terrainSlope: "4.8°",
    // Umiditatea solului pe ultimele 6 luni
    humidityHistory: [
      { month: 'Noi', value: 32 },
      { month: 'Dec', value: 45 },
      { month: 'Ian', value: 58 },
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
              Panou <span className="text-fw-primary">Analitic</span>
            </h1>
            <p className="text-fw-text/70 font-bold uppercase text-xs tracking-widest">
              Sistem de Monitorizare a Riscului Agricol
            </p>
          </div>
          <div className="flex items-center gap-2 bg-fw-primary/10 px-4 py-2 rounded-full border border-fw-primary/20">
            <Calendar size={16} className="text-fw-primary" />
            <span className="text-xs font-black uppercase">Aprilie 2026</span>
          </div>
        </header>

        {/* Risc Principal Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Riscul de Inundații */}
          <div className="bg-white/50 backdrop-blur-sm border-2 border-fw-primary/20 p-8 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Waves size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/30">
                  <Waves size={24} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Risc de Inundație</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-6xl font-black text-blue-600">{stats.floodRisk}%</span>
                <span className="text-sm font-bold text-fw-text/50 uppercase">Nivel Alertă</span>
              </div>
              <div className="w-full bg-fw-neutral/20 h-4 rounded-full overflow-hidden mb-4">
                <div 
                  className="bg-blue-600 h-full transition-all duration-1000" 
                  style={{ width: `${stats.floodRisk}%` }}
                />
              </div>
              <p className="text-sm font-medium leading-relaxed opacity-80">
                Probabilitate ridicată de deversare în zona sectorului Nord. Se recomandă monitorizarea digurilor secundare.
              </p>
            </div>
          </div>

          {/* Riscul pentru Plantații */}
          <div className="bg-white/50 backdrop-blur-sm border-2 border-fw-secondary/20 p-8 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-fw-secondary">
              <Leaf size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-fw-secondary text-white rounded-2xl shadow-lg shadow-fw-secondary/30">
                  <Leaf size={24} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Impact Plantații</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-6xl font-black text-fw-secondary">{stats.plantationRisk}%</span>
                <span className="text-sm font-bold text-fw-text/50 uppercase">Vulnerabilitate</span>
              </div>
              <div className="w-full bg-fw-neutral/20 h-4 rounded-full overflow-hidden mb-4">
                <div 
                  className="bg-fw-secondary h-full transition-all duration-1000" 
                  style={{ width: `${stats.plantationRisk}%` }}
                />
              </div>
              <p className="text-sm font-medium leading-relaxed opacity-80">
                Culturile de grâu și rapiță sunt în zona de impact. Vulnerabilitatea este moderată datorită pantei favorabile.
              </p>
            </div>
          </div>
        </div>

        {/* Grafic Umiditate */}
        <div className="bg-white border-2 border-fw-neutral/10 p-8 rounded-3xl shadow-sm mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Droplets size={20} />
              </div>
              <h3 className="font-black uppercase tracking-widest text-sm">Evoluție Umiditate Sol (6 luni)</h3>
            </div>
            <div className="flex items-center gap-1 text-fw-primary font-black text-xs uppercase">
              <TrendingUp size={14} /> 
              <span>Monitorizare Live</span>
            </div>
          </div>
          
          <div className="relative h-[150px] w-full mt-4">
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
                  stroke="var(--theme-neutral)"
                  strokeOpacity="0.1"
                  strokeWidth="1"
                />
              ))}
              
              {/* Linia de grafic */}
              <polyline
                fill="none"
                stroke="var(--theme-primary)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
              
              {/* Punctele de date */}
              {stats.humidityHistory.map((h, i) => {
                const x = (i / (stats.humidityHistory.length - 1)) * chartWidth;
                const y = chartHeight - (h.value / 100) * chartHeight;
                return (
                  <circle 
                    key={i} 
                    cx={x} cy={y} r="5" 
                    fill="white" 
                    stroke="var(--theme-primary)" 
                    strokeWidth="3" 
                  />
                );
              })}
            </svg>
            
            {/* Label-uri luni */}
            <div className="flex justify-between mt-4">
              {stats.humidityHistory.map((h, i) => (
                <span key={i} className="text-[10px] font-black uppercase text-fw-text/40">{h.month}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Statistici Suplimentare */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-fw-primary text-white p-6 rounded-2xl flex items-center justify-between shadow-lg shadow-fw-primary/20">
            <div className="flex items-center gap-4">
              <CloudRain size={24} />
              <div>
                <p className="text-[10px] font-bold uppercase opacity-60">Rainfall (Săptămâna curentă)</p>
                <p className="text-xl font-black">{stats.rainfall7Days}</p>
              </div>
            </div>
            <AlertTriangle className="text-fw-accent animate-pulse" />
          </div>

          <div className="bg-fw-text text-fw-bg p-6 rounded-2xl flex items-center justify-between shadow-lg shadow-fw-text/20">
            <div className="flex items-center gap-4">
              <Mountain size={24} />
              <div>
                <p className="text-[10px] font-bold uppercase opacity-60">Panta Medie Teren</p>
                <p className="text-xl font-black">{stats.terrainSlope}</p>
              </div>
            </div>
            <div className="bg-fw-accent text-fw-text px-3 py-1 rounded-full text-[10px] font-black uppercase">Optim</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
