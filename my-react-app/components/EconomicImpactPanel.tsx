import React, { useState, useEffect } from 'react';
import { TrendingDown, AlertTriangle, DollarSign, Clock, Leaf } from 'lucide-react';

interface CropData {
  id: string;
  name: string;
  valuePerHectare: number; // in EUR
  vulnerabilityFactor: number; // base vulnerability 0-1
}

const CROP_DATABASE: CropData[] = [
  { id: 'wheat', name: 'Grâu', valuePerHectare: 1200, vulnerabilityFactor: 0.7 },
  { id: 'corn', name: 'Porumb', valuePerHectare: 1500, vulnerabilityFactor: 0.6 },
  { id: 'sunflower', name: 'Floarea Soarelui', valuePerHectare: 1300, vulnerabilityFactor: 0.65 },
  { id: 'rapeseed', name: 'Rapiță', valuePerHectare: 1400, vulnerabilityFactor: 0.75 },
  { id: 'potatoes', name: 'Cartofi', valuePerHectare: 5000, vulnerabilityFactor: 0.9 },
  { id: 'orchard', name: 'Livadă', valuePerHectare: 8000, vulnerabilityFactor: 0.5 },
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
  
  useEffect(() => {
    setCustomArea(areaHectares);
  }, [areaHectares]);

  const selectedCrop = CROP_DATABASE.find(c => c.id === selectedCropId) || CROP_DATABASE[0];
  const hazardFactor = durationDays / 7; 
  const vulnerability = selectedCrop.vulnerabilityFactor;
  const expunere = customArea * selectedCrop.valuePerHectare;
  const financialLoss = expunere * hazardFactor * vulnerability * riskProbability;

  return (
    <div className="absolute bottom-6 right-6 z-[1000] w-80 rounded-xl border-4 border-fw-primary bg-white p-6 shadow-2xl">
      <div className="mb-6 flex items-center gap-2 border-b-2 border-fw-neutral/20 pb-4">
        <TrendingDown className="text-fw-primary" size={24} />
        <h3 className="font-black text-black uppercase tracking-tighter text-lg">Economic Impact</h3>
      </div>

      <div className="space-y-5">
        {/* Crop Selection */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black text-fw-text uppercase tracking-widest">
            <Leaf size={14} className="text-fw-primary" /> Tip Cultură
          </label>
          <select 
            value={selectedCropId}
            onChange={(e) => setSelectedCropId(e.target.value)}
            className="w-full rounded-lg border-2 border-fw-neutral/30 bg-fw-bg px-3 py-2 text-sm font-bold text-fw-text focus:border-fw-primary focus:outline-none"
          >
            {CROP_DATABASE.map(crop => (
              <option key={crop.id} value={crop.id} className="text-fw-text font-bold">{crop.name}</option>
            ))}
          </select>
        </div>

        {/* Area Input */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black text-fw-text uppercase tracking-widest">
            <AlertTriangle size={14} className="text-fw-primary" /> Suprafață
          </label>
          <div className="flex items-center gap-2">
            <input 
              type="number"
              value={customArea}
              onChange={(e) => setCustomArea(Number(e.target.value))}
              className="w-full rounded-lg border-2 border-fw-neutral/30 bg-fw-bg px-3 py-2 text-sm font-black text-fw-text focus:border-fw-primary focus:outline-none"
            />
            <span className="text-sm font-black text-fw-text underline decoration-fw-primary decoration-2">ha</span>
          </div>
        </div>

        {/* Duration Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 text-xs font-black text-fw-text uppercase tracking-widest">
              <Clock size={14} className="text-fw-primary" /> Durată Hazard
            </label>
            <span className="text-xs font-black text-fw-primary bg-fw-primary/10 px-2 py-0.5 rounded">{durationDays} zile</span>
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
          <div className="text-[10px] font-black text-fw-bg/80 uppercase mb-1 tracking-widest">Pierdere Estimată</div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-fw-bg leading-none">
              {Math.round(financialLoss).toLocaleString('ro-RO')}
            </span>
            <span className="text-sm font-black text-fw-bg">EUR</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-fw-bg/70 font-bold border-t border-fw-bg/20 pt-3">
            <DollarSign size={10} />
            Expunere: {Math.round(expunere).toLocaleString()} EUR
          </div>
        </div>

        <div className="text-[9px] text-fw-text/60 font-black leading-tight bg-fw-neutral/5 p-3 rounded-lg border border-fw-neutral/10 uppercase tracking-tighter">
          Calcul: Expunere (Ha x Valoare) x Hazard x Vulnerabilitate
        </div>
      </div>
    </div>
  );
};

export default EconomicImpactPanel;
