import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Popup, useMapEvents, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import EconomicImpactPanel from './EconomicImpactPanel';

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
  const map = useMapEvents({
    click(e) {
      // Do not fire when any Geoman tool is active
      const pm = (map as any).pm;
      if (pm) {
        try {
          if (
            pm.globalDrawModeEnabled() ||
            pm.globalEditModeEnabled() ||
            pm.globalDragModeEnabled() ||
            pm.globalRemovalModeEnabled()
          ) return;
        } catch { /* ignore if methods unavailable */ }
      }
      onLocationSelect(e.latlng);
    },
  });
  return null;
};

const GeomanControls: React.FC<{
  onAreaCreated: (areaHectares: number, coordinates: LatLngTuple[]) => void;
}> = ({ onAreaCreated }) => {
  const map = useMap();
  // Keep latest callback in a ref so the effect never needs to re-run due to it
  const cbRef = useRef(onAreaCreated);
  useEffect(() => { cbRef.current = onAreaCreated; }, [onAreaCreated]);

  useEffect(() => {
    const pm = map.pm;
    if (!pm) return;

    // --- shared area calculator ---
    const calcArea = (coords: L.LatLng[]) => {
      let sqm = 0;
      if (coords.length > 2) {
        const R = 6378137, rad = Math.PI / 180;
        for (let i = 0; i < coords.length; i++) {
          const p1 = coords[i], p2 = coords[(i + 1) % coords.length];
          sqm += (p2.lng * rad - p1.lng * rad) * (2 + Math.sin(p1.lat * rad) + Math.sin(p2.lat * rad));
        }
        sqm = Math.abs(sqm * R * R / 2);
      }
      return {
        areaHectares: sqm / 10000,
        latLngCoords: coords.map(c => [c.lat, c.lng] as LatLngTuple),
      };
    };

    // --- layer created ---
    const handleCreate = (e: L.LeafletEvent & { layer: L.Layer }) => {
      const layer = e.layer as L.Polygon;
      const { areaHectares, latLngCoords } = calcArea(layer.getLatLngs()[0] as L.LatLng[]);
      cbRef.current(areaHectares, latLngCoords);

      // Persist edits: fire whenever editing finishes on this layer
      layer.on('pm:edit', () => {
        const { areaHectares: a, latLngCoords: c } = calcArea(layer.getLatLngs()[0] as L.LatLng[]);
        cbRef.current(a, c);
      });

      // Re-select on click
      layer.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        const { areaHectares: a, latLngCoords: c } = calcArea(layer.getLatLngs()[0] as L.LatLng[]);
        cbRef.current(a, c);
      });
    };

    // --- mutual exclusivity: only one mode active at a time ---
    const handleDrawStart = () => {
      try { if (pm.globalEditModeEnabled()) pm.disableGlobalEditMode(); } catch { }
      try { if (pm.globalDragModeEnabled()) pm.disableGlobalDragMode(); } catch { }
      try { if (pm.globalRemovalModeEnabled()) pm.disableGlobalRemovalMode(); } catch { }
    };
    const handleEditToggle = (e: any) => {
      if (!e.enabled) return;
      try { pm.disableDraw(); } catch { }
      try { if (pm.globalDragModeEnabled()) pm.disableGlobalDragMode(); } catch { }
      try { if (pm.globalRemovalModeEnabled()) pm.disableGlobalRemovalMode(); } catch { }
    };
    const handleDragToggle = (e: any) => {
      if (!e.enabled) return;
      try { pm.disableDraw(); } catch { }
      try { if (pm.globalEditModeEnabled()) pm.disableGlobalEditMode(); } catch { }
      try { if (pm.globalRemovalModeEnabled()) pm.disableGlobalRemovalMode(); } catch { }
    };
    const handleRemovalToggle = (e: any) => {
      if (!e.enabled) return;
      try { pm.disableDraw(); } catch { }
      try { if (pm.globalEditModeEnabled()) pm.disableGlobalEditMode(); } catch { }
      try { if (pm.globalDragModeEnabled()) pm.disableGlobalDragMode(); } catch { }
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
      rotateMode: false,   // disabled — causes crash
    });

    pm.setLang('en');
    pm.setGlobalOptions({ exitModeOnEscape: true });

    map.on('pm:create', handleCreate);
    map.on('pm:drawstart', handleDrawStart as never);
    map.on('pm:globaleditmodetoggled', handleEditToggle as never);
    map.on('pm:globaldragmodetoggled', handleDragToggle as never);
    map.on('pm:globalremovalmodetoggled', handleRemovalToggle as never);

    return () => {
      map.off('pm:create', handleCreate);
      map.off('pm:drawstart', handleDrawStart as never);
      map.off('pm:globaleditmodetoggled', handleEditToggle as never);
      map.off('pm:globaldragmodetoggled', handleDragToggle as never);
      map.off('pm:globalremovalmodetoggled', handleRemovalToggle as never);
      pm.removeControls();
    };
  }, [map]); // ← only 'map' — callback handled via ref above

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
  const [selectedPolygon, setSelectedPolygon] = useState<RiskPolygon | null>(null);
  const [customMarker, setCustomMarker] = useState<L.LatLng | null>(null);

  const handleAreaCreated = useCallback((areaHectares: number, coordinates: LatLngTuple[]) => {
    setSelectedPolygon({ riskValue: 0.4, coordinates, areaHectares });
    setCustomMarker(null);
  }, []);

  const handleLocationSelect = (latlng: L.LatLng) => {
    setCustomMarker(latlng);
    setSelectedPolygon({
      riskValue: 0.25,
      coordinates: [
        [latlng.lat + 0.0005, latlng.lng - 0.0005],
        [latlng.lat + 0.0005, latlng.lng + 0.0005],
        [latlng.lat - 0.0005, latlng.lng + 0.0005],
        [latlng.lat - 0.0005, latlng.lng - 0.0005],
      ],
      areaHectares: 1,
    });
  };

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      <MapContainer
        center={[44.4268, 26.1025]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

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
      </MapContainer>

      <EconomicImpactPanel
        areaHectares={selectedPolygon?.areaHectares || 10}
        riskProbability={selectedPolygon?.riskValue || 0.5}
      />
    </div>
  );
};

export default FloodRiskMap;