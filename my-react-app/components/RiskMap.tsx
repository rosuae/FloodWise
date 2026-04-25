import React from 'react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface RiskPoint {
  lat: number;
  lng: number;
  riskValue: number;
  radiusInMeters: number; // Raza reală pe teren
}

const getRiskColor = (risk: number): string => {
  if (risk >= 0.8) return '#023858';
  if (risk >= 0.5) return '#3690c0';
  return '#a6bddb';
};

const FloodRiskMap: React.FC = () => {
  const points: RiskPoint[] = [
    { 
      lat: 44.4268, 
      lng: 26.1025, 
      riskValue: 0.9, 
      radiusInMeters: 500 // Acoperă o rază de 500m pe pământ
    },
    { 
      lat: 44.4350, 
      lng: 26.1150, 
      riskValue: 0.4, 
      radiusInMeters: 300 
    }
  ];

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <MapContainer
        center={[44.4268, 26.1025]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {Array.from(points, (point, index) => (
          <Circle
            key={index}
            center={[point.lat, point.lng]}
            radius={point.radiusInMeters} // Aici este cheia: raza în metri
            pathOptions={{
              fillColor: getRiskColor(point.riskValue),
              color: getRiskColor(point.riskValue), // Contur de aceeași culoare
              weight: 1,
              fillOpacity: 0.5, // Mai transparent pentru a vedea harta dedesubt
            }}
          >
            <Popup>
              Zonă de risc: {point.radiusInMeters}m rază.
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
};

export default FloodRiskMap;