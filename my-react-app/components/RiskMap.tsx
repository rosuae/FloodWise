import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
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

const ViewportFetcher: React.FC<{
  onDataLoaded: (points: RiskPoint[]) => void;
}> = ({ onDataLoaded }) => {
  const abortRef = useRef<AbortController | null>(null);

  const fetchVisibleArea = useCallback(
    async (map: LeafletMap) => {
      const bounds = map.getBounds();
      const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;

      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(`/api/flood-risks?bbox=${encodeURIComponent(bbox)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data: RiskPoint[] = await response.json();
        console.log('Date de risc încărcate:', data);
        onDataLoaded(data);
      } catch (error) {
        // Ignorăm erorile de abort când utilizatorul mișcă rapid harta.
        if ((error as Error).name !== 'AbortError') {
          console.error('Eroare la încărcarea datelor de risc:', error);
        }
      }
    },
    [onDataLoaded]
  );

  const map = useMapEvents({
    moveend: () => {
      void fetchVisibleArea(map);
    },
    zoomend: () => {
      void fetchVisibleArea(map);
    },
  });

  useEffect(() => {
    void fetchVisibleArea(map);

    return () => {
      abortRef.current?.abort();
    };
  }, [map, fetchVisibleArea]);

  return null;
};

const FloodRiskMap: React.FC = () => {
  const [points, setPoints] = useState<RiskPoint[]>([]);

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

        <ViewportFetcher onDataLoaded={setPoints} />

        {points.map((point, index) => (
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