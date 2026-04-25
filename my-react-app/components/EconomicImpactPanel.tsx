import React, { useState, useEffect } from 'react';
import { TrendingDown, AlertTriangle, DollarSign, Clock, Leaf, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CropData {
  id: string;
  name: string;
  valuePerHectare: number; // in EUR
  vulnerabilityFactor: number; // base vulnerability 0-1
}

const CROP_DATABASE: CropData[] = [
  { id: 'wheat', name: 'Wheat', valuePerHectare: 1200, vulnerabilityFactor: 0.7 },
  { id: 'corn', name: 'Corn', valuePerHectare: 1500, vulnerabilityFactor: 0.6 },
  { id: 'sunflower', name: 'Sunflower', valuePerHectare: 1300, vulnerabilityFactor: 0.65 },
  { id: 'rapeseed', name: 'Rapeseed', valuePerHectare: 1400, vulnerabilityFactor: 0.75 },
  { id: 'potatoes', name: 'Potatoes', valuePerHectare: 5000, vulnerabilityFactor: 0.9 },
  { id: 'orchard', name: 'Orchard', valuePerHectare: 8000, vulnerabilityFactor: 0.5 },
];

interface EconomicImpactPanelProps {
  areaHectares?: number;
  riskProbability?: number; // 0-1
}

const EconomicImpactPanel: React.FC<EconomicImpactPanelProps> = ({ 
  areaHectares = 10, 
  riskProbability = 0.5 
}) => {
  const [selectedCropId, setSelectedCropId] = useState(CROP_DATABASE[0].id);
  const [durationDays, setDurationDays] = useState(3);
  const [customArea, setCustomArea] = useState(areaHectares);
  const navigate = useNavigate();
  
  useEffect(() => {
    setCustomArea(areaHectares);
  }, [areaHectares]);

  const selectedCrop = CROP_DATABASE.find(c => c.id === selectedCropId) || CROP_DATABASE[0];
  const hazardFactor = durationDays / 7; 
  const vulnerability = selectedCrop.vulnerabilityFactor;
  const expunere = customArea * selectedCrop.valuePerHectare;
  const financialLoss = expunere * hazardFactor * vulnerability * riskProbability;

  const handleGoToDashboard = () => {
    const params = new URLSearchParams({
      area: customArea.toString(),
      risk: (riskProbability * 100).toFixed(0),
      crop: selectedCrop.name,
      loss: Math.round(financialLoss).toString()
    });
    navigate(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="absolute bottom-6 right-6 z-[1000] w-80 rounded-xl border-4 border-fw-primary bg-white p-6 shadow-2xl">
      <div className="mb-6 flex items-center gap-2 border-b-2 border-fw-neutral/20 pb-4">
        <TrendingDown className="text-fw-primary" size={24} />
        <h3 className="font-black text-black uppercase tracking-tighter text-lg">Economic Impact</h3>
      </div>

      <div className="space-y-5">
        {/* Crop Selection */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-widest">
            <Leaf size={14} className="text-fw-primary" /> Crop Type
          </label>
          <select 
            value={selectedCropId}
            onChange={(e) => setSelectedCropId(e.target.value)}
            className="w-full rounded-lg border-2 border-fw-neutral/30 bg-white px-3 py-2 text-sm font-bold text-black focus:border-fw-primary focus:outline-none"
          >
            {CROP_DATABASE.map(crop => (
              <option key={crop.id} value={crop.id} className="text-black font-bold">{crop.name}</option>
            ))}
          </select>
        </div>

        {/* Area Input */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-widest">
            <AlertTriangle size={14} className="text-fw-primary" /> Surface Area
          </label>
          <div className="flex items-center gap-2">
            <input 
              type="number"
              value={customArea}
              onChange={(e) => setCustomArea(Number(e.target.value))}
              className="w-full rounded-lg border-2 border-fw-neutral/30 bg-white px-3 py-2 text-sm font-black text-black focus:border-fw-primary focus:outline-none"
            />
            <span className="text-sm font-black text-black underline decoration-fw-primary decoration-2">ha</span>
          </div>
        </div>

        {/* Duration Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-widest">
              <Clock size={14} className="text-fw-primary" /> Hazard Duration
            </label>
            <span className="text-xs font-black text-fw-primary bg-fw-primary/10 px-2 py-0.5 rounded">{durationDays} days</span>
          </div>
          <input 
            type="range"
            min="1"
            max="14"
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            className="w-full accent-fw-primary h-2 bg-fw-neutral/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Results */}
        <div className="mt-6 rounded-xl bg-fw-primary p-5 shadow-lg shadow-fw-primary/30">
          <div className="text-[10px] font-black text-fw-bg/80 uppercase mb-1 tracking-widest">Estimated Loss</div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-fw-bg leading-none">
              {Math.round(financialLoss).toLocaleString('en-US')}
            </span>
            <span className="text-sm font-black text-fw-bg">EUR</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-fw-bg/70 font-bold border-t border-fw-bg/20 pt-3">
            <DollarSign size={10} />
            Exposure: {Math.round(expunere).toLocaleString()} EUR
          </div>
        </div>

        <button
          onClick={handleGoToDashboard}
          className="w-full flex items-center justify-center gap-2 bg-fw-secondary text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg hover:scale-105 transition-transform"
        >
          <LayoutDashboard size={16} />
          View Detailed Dashboard
        </button>

        <div className="text-[9px] text-black/70 font-black leading-tight bg-fw-neutral/5 p-3 rounded-lg border border-fw-neutral/10 uppercase tracking-tighter">
          Calculation: Exposure (Ha x Value) x Hazard x Vulnerability
        </div>
      </div>
    </div>
  );
};

export default EconomicImpactPanel;
