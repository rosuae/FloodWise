import React, { useMemo, useState, useEffect } from 'react';
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
  Info, 
  ArrowDownToLine, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Bookmark 
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';

interface SavedLocation {
  id: number;
  name: string;
  area_ha: number;
  crop_type: string;
  risk_percent: number;
  estimated_loss: number;
  latest_ndwi: number | null;
  rainfall_mm: number | null;
  slope_deg: number | null;
  graph_image_b64: string | null;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [showGroundwaterDetails, setShowGroundwaterDetails] = useState(false);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [activeZone, setActiveZone] = useState<SavedLocation | null>(null);
  
  // Live fetch states
  const [liveGraphUrl, setLiveGraphUrl] = useState<string | null>(null);
  const [loadingLiveGraph, setLoadingLiveGraph] = useState(false);
  const [liveGraphError, setLiveGraphError] = useState<string | null>(null);
  const [realLiveNdwi, setRealLiveNdwi] = useState<number | null>(null);

  const zoneId = queryParams.get('id');
  const isLive = queryParams.get('live') === 'true';

  // Load user zones from database
  useEffect(() => {
    if (!token) return;
    setLoadingZones(true);
    fetch('http://localhost:8000/api/zones', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async res => {
      if (!res.ok) throw new Error('Failed to fetch zones');
      return res.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        setSavedLocations(data);
      }
    })
    .catch(err => console.error('Error fetching zones:', err))
    .finally(() => setLoadingZones(false));
  }, [token]);

  // Set active zone based on ID
  useEffect(() => {
    if (zoneId && savedLocations.length > 0) {
      const found = savedLocations.find(l => l.id.toString() === zoneId);
      if (found) {
        setActiveZone(found);
        setLiveGraphUrl(null); // Clear live data if we are looking at a saved zone
      }
    } else {
      setActiveZone(null);
    }
  }, [zoneId, savedLocations]);

  // Live Graph Fetching Logic
  useEffect(() => {
    if (!isLive) {
      setLiveGraphUrl(null);
      setRealLiveNdwi(null);
      return;
    }

    const liveData = localStorage.getItem('fw_live_analysis');
    if (liveData) {
      try {
        const parsed = JSON.parse(liveData);
        if (parsed.coordinates) {
          setLoadingLiveGraph(true);
          setLiveGraphError(null);
          
          fetch('http://localhost:8000/api/ndwi-graph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coordinates: parsed.coordinates })
          })
          .then(async res => {
            if (res.ok) return res.json();
            const errText = await res.text();
            throw new Error(errText);
          })
          .then(data => {
            if (data.image_base64) {
              setLiveGraphUrl(`data:image/png;base64,${data.image_base64}`);
            }
            if (data.latest_ndwi !== null) {
              setRealLiveNdwi(data.latest_ndwi);
            }
            setLoadingLiveGraph(false);
          })
          .catch(err => {
            console.error("Live Graph fetch error:", err);
            setLiveGraphError("Could not generate live graph. Fallback active.");
            setLoadingLiveGraph(false);
          });
        }
      } catch (e) {
        console.error("Error parsing live analysis data", e);
      }
    }
  }, [isLive, location.search]);

  const handleLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) navigate(`/dashboard?id=${id}`);
  };

  // Derive display values from activeZone (database) or queryParams (live)
  const displayData = {
    area: activeZone ? activeZone.area_ha.toString() : (queryParams.get('area') || '0'),
    crop: activeZone ? activeZone.crop_type : (queryParams.get('crop') || ''),
    loss: activeZone ? activeZone.estimated_loss.toString() : (queryParams.get('loss') || '0'),
    ndwi: realLiveNdwi !== null ? realLiveNdwi : (activeZone ? activeZone.latest_ndwi : (queryParams.get('ndwi') ? parseFloat(queryParams.get('ndwi')!) : 0.42)),
    rainfall: activeZone ? activeZone.rainfall_mm : (queryParams.get('rainfall') ? parseFloat(queryParams.get('rainfall')!) : 42.5),
    slope: activeZone ? activeZone.slope_deg : (queryParams.get('slope') ? parseFloat(queryParams.get('slope')!) : 4.8),
    risk: activeZone ? activeZone.risk_percent : (queryParams.get('risk') ? parseInt(queryParams.get('risk')!) : 65)
  };

  const hasData = (!!activeZone) || (!!queryParams.get('area') && !!queryParams.get('crop'));

  const stats = {
    soilHumidity: 38,
    floodRisk: displayData.risk,
    plantationRisk: 42,
    groundwaterRisk: 28,
    ndwi: displayData.ndwi ?? 0.42,
    rainfall7Days: `${displayData.rainfall?.toFixed(1) || '0.0'} mm`,
    terrainSlope: `${displayData.slope?.toFixed(1) || '0.0'}°`,
    humidityHistory: [
      { month: 'Nov', value: 32 }, { month: 'Dec', value: 45 }, { month: 'Jan', value: 58 },
      { month: 'Feb', value: 52 }, { month: 'Mar', value: 40 }, { month: 'Apr', value: 38 },
    ],
    groundwaterParams: [
      { label: 'Water Table Depth', value: '1.2m', status: 'Warning', icon: <ArrowDownToLine size={14} /> },
      { label: 'Aquifer Saturation', value: '84%', status: 'High', icon: <Droplets size={14} /> },
      { label: 'Soil Permeability', value: '0.5 cm/h', status: 'Low', icon: <Activity size={14} /> },
      { label: 'Hydrostatic Pressure', value: '102 kPa', status: 'Normal', icon: <Waves size={14} /> },
    ]
  };

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
              Analytical <span className="text-fw-primary">Dashboard</span>
            </h1>
            <p className="text-fw-text font-black uppercase text-xs tracking-widest bg-fw-primary/10 inline-block px-2 py-1 rounded">
              Agricultural Risk Monitoring System
            </p>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            {loadingZones ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-xl border-2 border-fw-neutral/10">
                <Activity size={16} className="animate-spin text-fw-primary" />
                <span className="text-[10px] font-black uppercase text-black/60">Loading Zones...</span>
              </div>
            ) : savedLocations.length > 0 && (
              <div className="flex items-center gap-2 bg-white border-2 border-fw-neutral/20 px-3 py-1.5 rounded-xl shadow-sm hover:border-fw-primary transition-colors">
                <Bookmark size={14} className="text-fw-primary" />
                <select 
                  onChange={handleLocationSelect}
                  className="bg-transparent text-xs font-black uppercase text-black focus:outline-none cursor-pointer pr-4"
                  value={zoneId || ""}
                >
                  <option value="" disabled>Saved Locations</option>
                  {savedLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            )}
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

        {!hasData ? (
          <div className="bg-white border-4 border-dashed border-fw-neutral/30 p-20 rounded-[40px] text-center flex flex-col items-center justify-center shadow-inner">
            <div className="w-24 h-24 bg-fw-neutral/5 rounded-full flex items-center justify-center mb-6">
              <MapIcon size={48} className="text-fw-neutral/40" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 text-black">No Area Selected</h2>
            <p className="max-w-md text-black/60 font-bold mb-8 leading-relaxed">
              Please go to the Risk Map and select a geographical area to view detailed agricultural and flood risk analysis.
            </p>
            <Link 
              to="/map" 
              className="flex items-center gap-3 bg-fw-primary text-fw-bg px-10 py-5 rounded-2xl font-black uppercase text-lg shadow-2xl shadow-fw-primary/40 hover:scale-105 transition-transform"
            >
              <MapIcon size={24} />
              Start Selection
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-2xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-left duration-500" style={{background: 'linear-gradient(135deg, #2a3f10 0%, #3d6020 55%, #2a4a10 100%)'}}>
              <div className="flex items-center gap-5 px-6 py-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{background: 'rgba(248,216,86,0.18)', border: '2px solid rgba(248,216,86,0.45)'}}>
                  <Info size={22} className="text-fw-accent" />
                </div>
                <div className="flex-shrink-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-fw-accent/70 leading-none mb-1">Zone Analysis Active</p>
                  <h4 className="text-base font-black uppercase tracking-tight text-white leading-none">{activeZone?.name || 'Live Selection'}</h4>
                </div>
                <div className="w-px h-10 bg-white/15 flex-shrink-0" />
                <div className="flex items-center gap-3 flex-1 flex-wrap">
                  <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm font-bold text-white">
                    <span className="text-fw-accent/70 uppercase text-[10px] tracking-widest font-black">Area</span>
                    <span className="font-black text-base">{parseFloat(displayData.area).toFixed(2)} ha</span>
                  </span>
                  <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm font-bold text-white">
                    <span className="text-fw-accent/70 uppercase text-[10px] tracking-widest font-black">Crop</span>
                    <span className="font-black text-base">{displayData.crop}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black" style={{background: 'rgba(220,38,38,0.28)', border: '1px solid rgba(220,38,38,0.55)', color: '#fca5a5'}}>
                    <span className="uppercase text-[10px] tracking-widest font-black opacity-80">Est. Loss</span>
                    <span className="text-white font-black text-base">{parseInt(displayData.loss).toLocaleString()} EUR</span>
                  </span>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-fw-accent animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-fw-accent/60 hidden lg:block">Risk Active</span>
                </div>
              </div>
              <div className="h-1 w-full" style={{background: 'linear-gradient(90deg, #f8d856, #91a436, transparent)'}} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {/* Flood Risk */}
              <div className="bg-white border-4 border-blue-600 p-6 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Waves size={120} /></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/40"><Waves size={24} /></div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-black">Flood Risk</h3>
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-5xl font-black text-blue-600">{stats.floodRisk}%</span>
                    <span className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-blue-600">Alert Level</span>
                  </div>
                  <div className="w-full bg-blue-100 h-4 rounded-full overflow-hidden mb-4 border-2 border-blue-600">
                    <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${stats.floodRisk}%` }} />
                  </div>
                  <p className="text-[10px] font-black leading-tight text-black/80 uppercase tracking-tighter">
                    {stats.floodRisk > 70 ? 'Critical Alert! Imminent flood probability.' : 'High discharge probability in the selected area.'}
                  </p>
                </div>
              </div>

              {/* Crop Impact */}
              <div className="bg-white border-4 border-fw-secondary p-6 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-fw-secondary"><Leaf size={120} /></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-fw-secondary text-white rounded-xl shadow-lg shadow-fw-secondary/40"><Leaf size={24} /></div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-black">Crops Impact</h3>
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-5xl font-black text-fw-secondary">{stats.plantationRisk}%</span>
                    <span className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-fw-secondary">Vulnerability</span>
                  </div>
                  <div className="w-full bg-fw-secondary/10 h-4 rounded-full overflow-hidden mb-4 border-2 border-fw-secondary">
                    <div className="bg-fw-secondary h-full transition-all duration-1000" style={{ width: `${stats.plantationRisk}%` }} />
                  </div>
                  <p className="text-[10px] font-black leading-tight text-black/80 uppercase tracking-tighter">
                    {displayData.crop ? `${displayData.crop} crops are in the direct impact zone.` : 'Vulnerability is moderate due to terrain slope.'}
                  </p>
                </div>
              </div>

              {/* Groundwater */}
              <div className={`bg-white border-4 transition-all duration-300 ${showGroundwaterDetails ? 'border-fw-accent scale-[1.02]' : 'border-fw-neutral/30'} p-6 rounded-3xl shadow-xl relative overflow-hidden`}>
                <div className="absolute top-0 right-0 p-4 opacity-5 text-fw-accent"><ArrowDownToLine size={120} /></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-fw-accent text-black rounded-xl shadow-lg shadow-fw-accent/40"><ArrowDownToLine size={24} /></div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-black">Groundwater</h3>
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-5xl font-black text-black">{stats.groundwaterRisk}%</span>
                    <span className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-fw-accent">Saturation</span>
                  </div>
                  <div className="w-full bg-fw-accent/10 h-4 rounded-full overflow-hidden mb-4 border-2 border-fw-accent">
                    <div className="bg-fw-accent h-full transition-all duration-1000" style={{ width: `${stats.groundwaterRisk}%` }} />
                  </div>
                  <button onClick={() => setShowGroundwaterDetails(!showGroundwaterDetails)} className="w-full flex items-center justify-between mt-2 px-3 py-2 bg-black text-white rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-fw-primary transition-colors">
                    {showGroundwaterDetails ? 'Hide Details' : 'View Details'}
                    {showGroundwaterDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showGroundwaterDetails && (
                    <div className="mt-4 space-y-3 pt-4 border-t-2 border-fw-neutral/10 animate-in fade-in zoom-in duration-300">
                      {stats.groundwaterParams.map((param, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-fw-primary">{param.icon}</span>
                            <span className="text-[10px] font-bold uppercase text-black/60">{param.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-black text-black block leading-none">{param.value}</span>
                            <span className={`text-[8px] font-black uppercase ${param.status === 'Warning' || param.status === 'High' ? 'text-red-500' : 'text-fw-secondary'}`}>{param.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Soil Humidity Evolution */}
            <div className="bg-white border-4 border-fw-primary p-8 rounded-3xl shadow-xl mb-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30"><Droplets size={24} /></div>
                  <h3 className="font-black uppercase tracking-tighter text-xl text-black">Soil Humidity Evolution</h3>
                </div>
                <div className="flex items-center gap-2 bg-fw-accent text-black px-4 py-1.5 rounded-full font-black text-xs uppercase shadow-sm">
                  <TrendingUp size={16} /> <span>Active Satellite Monitoring</span>
                </div>
              </div>
              <div className="relative h-[220px] w-full mt-4 pb-12">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  {[0, 25, 50, 75, 100].map(level => (
                    <line key={level} x1="0" y1={chartHeight - (level / 100) * chartHeight} x2={chartWidth} y2={chartHeight - (level / 100) * chartHeight} stroke="#000" strokeOpacity="0.1" strokeWidth="1" />
                  ))}
                  <polyline fill="none" stroke="var(--theme-primary)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" points={points} className="drop-shadow-lg" />
                  {stats.humidityHistory.map((h, i) => {
                    const x = (i / (stats.humidityHistory.length - 1)) * chartWidth;
                    const y = chartHeight - (h.value / 100) * chartHeight;
                    return <circle key={i} cx={x} cy={y} r="6" fill="white" stroke="var(--theme-primary)" strokeWidth="4" />;
                  })}
                </svg>
                <div className="flex justify-between mt-6 border-t-2 border-fw-neutral/10 pt-4 px-2">
                  {stats.humidityHistory.map((h, i) => (
                    <span key={i} className="text-xs font-black uppercase text-fw-text underline decoration-fw-primary decoration-2">{h.month}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Extra Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-fw-primary text-fw-bg p-8 rounded-2xl flex items-center justify-between shadow-2xl shadow-fw-primary/40 border-b-8 border-fw-primary-hover">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-fw-bg/20 rounded-2xl"><CloudRain size={32} /></div>
                  <div>
                    <p className="text-xs font-black uppercase opacity-70 tracking-widest">Rainfall (Weekly)</p>
                    <p className="text-4xl font-black">{stats.rainfall7Days}</p>
                  </div>
                </div>
                <AlertTriangle size={32} className="text-fw-accent animate-pulse" />
              </div>
              <div className="bg-fw-text text-fw-bg p-8 rounded-2xl flex items-center justify-between shadow-2xl shadow-fw-text/40 border-b-8 border-black">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-fw-bg/20 rounded-2xl"><Mountain size={32} /></div>
                  <div>
                    <p className="text-xs font-black uppercase opacity-70 tracking-widest">Average Terrain Slope</p>
                    <p className="text-4xl font-black">{stats.terrainSlope}</p>
                  </div>
                </div>
                <div className="bg-fw-accent text-black px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg shadow-fw-accent/20">Status: Optimal</div>
              </div>
            </div>

            {/* NDWI Copernicus Card */}
            <div className="bg-white border-4 border-blue-400 p-8 rounded-3xl shadow-xl mt-8 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-blue-400"><Activity size={120} /></div>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10 mb-8">
                <div className="flex flex-col items-center md:items-start gap-2">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-blue-400 text-white rounded-xl shadow-lg"><Activity size={24} /></div>
                    <h3 className="font-black uppercase tracking-tighter text-xl text-black">Copernicus NDWI Index</h3>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-black text-blue-500">{(stats.ndwi || 0).toFixed(2)}</span>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-blue-400">Index Value</span>
                      <span className="text-[10px] font-bold text-blue-600 uppercase mt-1">
                        {stats.ndwi > 0.3 ? 'Open Water Detected' : stats.ndwi > 0.1 ? 'Saturated / High Moisture' : stats.ndwi > -0.1 ? 'Bare Soil / Neutral' : 'Dry / Arid Surface'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-blue-50/50 p-6 rounded-2xl border-2 border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={16} className="text-blue-500" /><span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">What is NDWI?</span>
                  </div>
                  <p className="text-xs font-bold leading-relaxed text-blue-900/80 uppercase tracking-tighter">
                    The <span className="text-blue-600 font-black">Normalized Difference Water Index</span> uses Sentinel-2 satellite data to monitor surface water content. 
                    It is essential for <span className="text-blue-600 font-black">flood mapping</span> and <span className="text-blue-600 font-black">drought monitoring</span>. 
                    Values above 0.3 typically indicate standing water, while values near 0 show saturated soil.
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-50 rounded-2xl border-2 border-gray-200 min-h-[300px] flex items-center justify-center p-4 relative z-10">
                {loadingLiveGraph ? (
                  <div className="flex flex-col items-center gap-4">
                    <Activity size={32} className="animate-spin text-blue-500" />
                    <span className="text-sm font-black text-blue-500 uppercase tracking-widest animate-pulse">Analyzing Copernicus Data...</span>
                  </div>
                ) : liveGraphUrl ? (
                  <img src={liveGraphUrl} alt="NDWI Time Series Graph" className="max-w-full max-h-[500px] object-contain rounded-lg shadow-inner" />
                ) : activeZone?.graph_image_b64 ? (
                  <img src={`data:image/png;base64,${activeZone.graph_image_b64}`} alt="NDWI Time Series Graph" className="max-w-full max-h-[500px] object-contain rounded-lg shadow-inner" />
                ) : liveGraphError ? (
                  <div className="text-center p-6">
                    <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
                    <p className="text-amber-600 font-bold max-w-md mx-auto">{liveGraphError}</p>
                  </div>
                ) : (
                  <div className="text-center p-6 text-gray-400 font-bold uppercase text-xs tracking-widest">
                    No graph data available for this zone.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
