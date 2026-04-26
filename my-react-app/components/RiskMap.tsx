import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMapEvents, Marker, useMap } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import EconomicImpactPanel from './EconomicImpactPanel';
import { Info } from 'lucide-react';

// Fix for default marker icon in Leaflet + React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIconRetina,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type LatLngTuple = [number, number];

interface RiskPoint {
  lat: number;
  lng: number;
  riskValue: number;
  radiusInMeters: number; // Raza reală pe teren
}

interface RiskPolygon {
  riskValue: number;
  coordinates: LatLngTuple[];
  areaHectares: number;
}

interface ApiRiskPolygon {
  id?: string;
  severity?: 'low' | 'medium' | 'high' | string;
  confidence?: number;
  area_hectares?: number;
  geometry?: number[][][];
}

interface ApiFloodRiskResponse {
  flood_probability?: number;
  polygons?: ApiRiskPolygon[];
}

const getRiskColor = (risk: number): string => {
  if (risk >= 0.8) return '#d12a2a';
  if (risk >= 0.5) return '#023858';
  return '#a6bddb';
};

const metersToLatitudeDegrees = (meters: number): number => meters / 111_320;

const metersToLongitudeDegrees = (meters: number, latitude: number): number => {
  const safeCos = Math.max(Math.cos((latitude * Math.PI) / 180), 0.000001);
  return meters / (111_320 * safeCos);
};

const pointToSquarePolygon = (point: RiskPoint): RiskPolygon => {
  const halfSideMeters = point.radiusInMeters;
  const latDelta = metersToLatitudeDegrees(halfSideMeters);
  const lngDelta = metersToLongitudeDegrees(halfSideMeters, point.lat);
  
  // Calculate approximate area in hectares: (side in meters)^2 / 10,000
  const sideMeters = halfSideMeters * 2;
  const areaHectares = (sideMeters * sideMeters) / 10000;

  return {
    riskValue: point.riskValue,
    areaHectares,
    coordinates: [
      [point.lat + latDelta, point.lng - lngDelta],
      [point.lat + latDelta, point.lng + lngDelta],
      [point.lat - latDelta, point.lng + lngDelta],
      [point.lat - latDelta, point.lng - lngDelta],
    ],
  };
};

const clampRisk = (value: number): number => Math.min(Math.max(value, 0), 1);

const severityToRiskValue = (severity: string | undefined, fallback: number): number => {
  if (severity === 'high') return 0.85;
  if (severity === 'medium') return 0.6;
  if (severity === 'low') return 0.3;
  return fallback;
};

const normalizeRiskPayload = (payload: unknown): RiskPolygon[] => {
  const response = payload as Partial<ApiFloodRiskResponse>;

  if (response && typeof response === 'object' && Array.isArray(response.polygons)) {
    return response.polygons
      .map((polygon): RiskPolygon | null => {
        if (!Array.isArray(polygon.geometry) || polygon.geometry.length === 0) {
          return null;
        }

        // API livreaza coordonate in format [lon, lat] (GeoJSON-like).
        const outerRing = polygon.geometry[0];
        if (!Array.isArray(outerRing)) {
          return null;
        }

        const coordinates = outerRing
          .map((pair) => {
            if (!Array.isArray(pair) || pair.length < 2) {
              return null;
            }

            const rawLon = pair[0];
            const rawLat = pair[1];
            if (typeof rawLon !== 'number' || typeof rawLat !== 'number') {
              return null;
            }

            return [rawLat, rawLon] as LatLngTuple;
          })
          .filter((coord): coord is LatLngTuple => coord !== null);

        if (coordinates.length < 3) {
          return null;
        }

        const fallbackRisk = clampRisk(
          typeof polygon.confidence === 'number'
            ? polygon.confidence
            : typeof response.flood_probability === 'number'
            ? response.flood_probability
            : 0.5
        );

        return {
          riskValue: clampRisk(severityToRiskValue(polygon.severity, fallbackRisk)),
          coordinates,
          areaHectares: polygon.area_hectares || 5, // Default to 5ha if not provided
        };
      })
      .filter((item): item is RiskPolygon => item !== null);
  }

  // Fallback pentru formatul vechi (array de puncte).
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item): RiskPolygon | null => {
      const candidate = item as Partial<RiskPoint & { riskValue: number }>;

      if (
        typeof candidate.lat === 'number' &&
        typeof candidate.lng === 'number' &&
        typeof candidate.riskValue === 'number' &&
        typeof candidate.radiusInMeters === 'number'
      ) {
        return pointToSquarePolygon(candidate as RiskPoint);
      }

      return null;
    })
    .filter((item): item is RiskPolygon => item !== null);
};

const ViewportFetcher: React.FC<{
  onDataLoaded: (polygons: RiskPolygon[]) => void;
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
        const response = await fetch(`/api/live-flood/assessment?bbox=${encodeURIComponent(bbox)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as unknown;
        const data = normalizeRiskPayload(payload);
        console.log('Risk data loaded:', data);
        onDataLoaded(data);
      } catch (error) {
        // Ignore abort errors when user moves the map quickly
        if ((error as Error).name !== 'AbortError') {
          console.error('Error loading risk data:', error);
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

const MapClickHandler: React.FC<{
  onLocationSelect: (latlng: L.LatLng) => void;
}> = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
};

const GeomanControls: React.FC<{
  onAreaCreated: (areaHectares: number, coordinates: LatLngTuple[]) => void;
}> = ({ onAreaCreated }) => {
  const map = useMap();

  useEffect(() => {
    const pm = map.pm;
    if (!pm) return;

    const handleCreate = (e: L.LeafletEvent & { layer: L.Layer }) => {
      const layer = e.layer as L.Polygon;
      const coords = layer.getLatLngs()[0] as L.LatLng[];
      
      let areaSqm = 0;
      if (coords.length > 2) {
        const radius = 6378137;
        const toRad = Math.PI / 180;
        
        for (let i = 0; i < coords.length; i++) {
          const p1 = coords[i];
          const p2 = coords[(i + 1) % coords.length];
          areaSqm += (p2.lng * toRad - p1.lng * toRad) * (2 + Math.sin(p1.lat * toRad) + Math.sin(p2.lat * toRad));
        }
        areaSqm = Math.abs(areaSqm * radius * radius / 2);
      }
      
      const areaHectares = areaSqm / 10000;
      const latLngCoords: LatLngTuple[] = coords.map(c => [c.lat, c.lng] as LatLngTuple);
      onAreaCreated(areaHectares, latLngCoords);
      
      layer.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        onAreaCreated(areaHectares, latLngCoords);
      });
    };

    pm.addControls({
      position: 'topleft',
      drawCircle: false,
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawPolygon: true,
      editMode: true,
      dragMode: true,
      cutLayer: false,
      removalMode: true,
    });

    pm.setLang('en');
    pm.setGlobalOptions({ exitModeOnEscape: true });

    map.on('pm:create', handleCreate);

    return () => {
      map.off('pm:create', handleCreate);
      pm.removeControls();
    };
  }, [map, onAreaCreated]);

  return null;
};

const DrawUndoControls: React.FC = () => {
  const map = useMap();
  const [activeShape, setActiveShape] = useState<string | null>(null);

  useEffect(() => {
    const handleDrawStart = (event: { shape: string }) => {
      setActiveShape(event.shape);
    };

    const handleDrawEnd = () => {
      setActiveShape(null);
    };

    map.on('pm:drawstart', handleDrawStart as never);
    map.on('pm:drawend', handleDrawEnd as never);
    map.on('pm:cancel', handleDrawEnd as never);

    return () => {
      map.off('pm:drawstart', handleDrawStart as never);
      map.off('pm:drawend', handleDrawEnd as never);
      map.off('pm:cancel', handleDrawEnd as never);
    };
  }, [map]);

  if (!activeShape) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-1000">
      <div className="rounded-full border border-fw-neutral/30 bg-fw-bg/95 px-3 py-2 shadow-lg backdrop-blur">
        <span className="text-[11px] font-medium text-fw-neutral">
          Press Esc to cancel the current drawing.
        </span>
      </div>
    </div>
  );
};

const FloodRiskMap: React.FC = () => {
  const [polygons, setPolygons] = useState<RiskPolygon[]>([]);
  const [selectedPolygon, setSelectedPolygon] = useState<RiskPolygon | null>(null);
  const [customMarker, setCustomMarker] = useState<L.LatLng | null>(null);
  const [impactData, setImpactData] = useState<{ crop: string; loss: number; area: number } | null>(null);

  const handleAreaCreated = (areaHectares: number, coordinates: LatLngTuple[]) => {
    const newPolygon: RiskPolygon = {
      riskValue: 0.4, // Default risk for drawn area
      coordinates,
      areaHectares,
    };
    setSelectedPolygon(newPolygon);
    setCustomMarker(null);
  };

  const handleLocationSelect = (latlng: L.LatLng) => {
    setCustomMarker(latlng);
    
    const virtualPolygon: RiskPolygon = {
      riskValue: 0.25,
      coordinates: [
        [latlng.lat + 0.0005, latlng.lng - 0.0005],
        [latlng.lat + 0.0005, latlng.lng + 0.0005],
        [latlng.lat - 0.0005, latlng.lng + 0.0005],
        [latlng.lat - 0.0005, latlng.lng - 0.0005],
      ],
      areaHectares: 1,
    };
    
    setSelectedPolygon(virtualPolygon);
  };

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      {selectedPolygon && impactData && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[2000] w-full max-w-2xl px-4">
          <div className="bg-fw-bg/95 backdrop-blur-md border-4 border-fw-accent p-4 rounded-2xl flex items-center gap-4 shadow-2xl animate-in slide-in-from-top duration-300">
            <div className="bg-fw-accent p-2 rounded-full text-black">
              <Info size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-black uppercase text-[10px] text-black/50 tracking-widest">Selected Zone Analysis</h4>
              <p className="text-sm font-bold text-black">
                Analyzing an area of <span className="font-black underline decoration-fw-primary decoration-2">{impactData.area} ha</span> with <span className="font-black underline decoration-fw-primary decoration-2">{impactData.crop}</span> crop. 
                Estimated calculated loss: <span className="font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 ml-1">{impactData.loss.toLocaleString()} EUR</span>.
              </p>
            </div>
            <button 
              onClick={() => {
                setSelectedPolygon(null);
                setImpactData(null);
              }}
              className="text-black/30 hover:text-black transition-colors p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <MapContainer
        center={[44.4268, 26.1025]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        <ViewportFetcher onDataLoaded={setPolygons} />
        <MapClickHandler onLocationSelect={handleLocationSelect} />
        <GeomanControls onAreaCreated={handleAreaCreated} />
        <DrawUndoControls />

        {customMarker && (
          <Marker position={customMarker}>
            <Popup>
              <div className="p-1">
                <div className="font-bold text-sm">Selected Point</div>
                <div className="text-[10px] text-gray-500">{customMarker.lat.toFixed(4)}, {customMarker.lng.toFixed(4)}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {polygons.map((polygon, index) => (
          <Polygon
            key={index}
            positions={polygon.coordinates}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                setSelectedPolygon(polygon);
                setCustomMarker(null);
              },
            }}
            pathOptions={{
              fillColor: getRiskColor(polygon.riskValue),
              color: selectedPolygon === polygon ? '#ffffff' : getRiskColor(polygon.riskValue),
              weight: selectedPolygon === polygon ? 3 : 1,
              fillOpacity: 0.5,
            }}
          >
            <Popup>
              <div className="p-1">
                <div className="font-bold text-sm mb-1">Risk Zone: {(polygon.riskValue * 100).toFixed(0)}%</div>
                <div className="text-xs text-gray-600">Area: {polygon.areaHectares.toFixed(1)} ha</div>
              </div>
            </Popup>
          </Polygon>
        ))}
      </MapContainer>

      <EconomicImpactPanel 
        areaHectares={selectedPolygon?.areaHectares || 10}
        riskProbability={selectedPolygon?.riskValue || 0.5}
        onImpactChange={setImpactData}
      />
    </div>
  );
};

export default FloodRiskMap;