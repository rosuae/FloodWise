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

  // Hazard is related to duration (as per prompt)
  const hazardFactor = durationDays / 7; // Normalize to a week for calculation impact
  
  // Vulnerability factor from crop
  const vulnerability = selectedCrop.vulnerabilityFactor;
  
  // Equation: Expunere (Valoare Cultură) x Hazard (Durată) x Vulnerabilitate
  const expunere = customArea * selectedCrop.valuePerHectare;
  const financialLoss = expunere * hazardFactor * vulnerability * riskProbability;

  return (
    <div className="absolute bottom-6 right-6 z-[1000] w-80 rounded-xl border border-fw-neutral/20 bg-white/90 p-5 shadow-xl backdrop-blur-md">
      <div className="mb-4 flex items-center gap-2 border-b border-fw-neutral/10 pb-3">
        <TrendingDown className="text-fw-primary" size={20} />
        <h3 className="font-bold text-fw-text uppercase tracking-wider text-sm">Economic Impact Calculator</h3>
      </div>

      <div className="space-y-4">
        {/* Crop Selection */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-fw-text/70 uppercase">
            <Leaf size={14} /> Tip Cultură (Vulnerabilitate)
          </label>
          <select 
            value={selectedCropId}
            onChange={(e) => setSelectedCropId(e.target.value)}
            className="w-full rounded-md border border-fw-neutral/20 bg-white px-3 py-2 text-sm focus:border-fw-primary focus:outline-none focus:ring-1 focus:ring-fw-primary"
          >
            {CROP_DATABASE.map(crop => (
              <option key={crop.id} value={crop.id}>{crop.name} (Vuln: {crop.vulnerabilityFactor})</option>
            ))}
          </select>
        </div>

        {/* Area Input */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-fw-text/70 uppercase">
            <AlertTriangle size={14} /> Suprafață (Expunere)
          </label>
          <div className="flex items-center gap-2">
            <input 
              type="number"
              value={customArea}
              onChange={(e) => setCustomArea(Number(e.target.value))}
              className="w-full rounded-md border border-fw-neutral/20 bg-white px-3 py-2 text-sm focus:border-fw-primary focus:outline-none focus:ring-1 focus:ring-fw-primary"
            />
            <span className="text-xs font-bold text-fw-text/50">ha</span>
          </div>
        </div>

        {/* Duration Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 text-xs font-semibold text-fw-text/70 uppercase">
              <Clock size={14} /> Hazard (Durată)
            </label>
            <span className="text-xs font-bold text-fw-primary">{durationDays} zile</span>
          </div>
          <input 
            type="range"
            min="1"
            max="14"
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            className="w-full accent-fw-primary"
          />
        </div>

        {/* Results */}
        <div className="mt-6 rounded-lg bg-fw-primary/5 p-4 border border-fw-primary/10">
          <div className="text-xs font-semibold text-fw-text/60 uppercase mb-1">Pierdere Financiară Estimată</div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-fw-primary">
              {Math.round(financialLoss).toLocaleString('ro-RO')}
            </span>
            <span className="text-sm font-bold text-fw-primary">EUR</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-fw-text/50 italic border-t border-fw-primary/10 pt-2">
            <DollarSign size={10} />
            Expunere: {Math.round(expunere).toLocaleString()} EUR
          </div>
        </div>

        <div className="text-[10px] text-fw-text/40 leading-tight bg-fw-neutral/5 p-2 rounded">
          <strong>Ecuație:</strong> Expunere (Cultură x Ha) x Hazard (Durată) x Vulnerabilitate
        </div>
      </div>
    </div>
  );

};

export default EconomicImpactPanel;
