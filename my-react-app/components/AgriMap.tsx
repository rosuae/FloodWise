import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Pane, MapContainerProps } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// CORINE Land Cover (CLC) Agricultural codes: 211-244
export interface AgriZone {
  id: string;
  clcCode: number;
  coordinates: [number, number][][];
}

interface AgriMapProps extends MapContainerProps {
  children?: React.ReactNode;
  showMask?: boolean;
  agriZones?: AgriZone[];
  onZoneSelect?: (zone: AgriZone) => void;
}

// Mock CORINE data for demonstration - centrally located for immediate visibility
const DEFAULT_AGRI_ZONES: AgriZone[] = [
  {
    id: 'agri_central',
    clcCode: 211, // Non-irrigated arable land
    coordinates: [[
      [44.4200, 26.0800],
      [44.4400, 26.0800],
      [44.4400, 26.1200],
      [44.4200, 26.1200],
      [44.4200, 26.0800],
    ]]
  },
  {
    id: 'agri_north',
    clcCode: 211,
    coordinates: [[
      [44.4500, 26.0500],
      [44.4800, 26.0500],
      [44.4800, 26.1000],
      [44.4500, 26.1000],
      [44.4500, 26.0500],
    ]]
  }
];

// World bounds for the mask (Global rectangle)
const WORLD_BOUNDS: [number, number][] = [
  [-90, -180],
  [90, -180],
  [90, 180],
  [-90, 180],
  [-90, -180],
];

const AgriMap: React.FC<AgriMapProps> = ({ 
  children, 
  showMask = true,
  agriZones = DEFAULT_AGRI_ZONES,
  onZoneSelect,
  ...mapProps
}) => {
  const filteredAgriZones = useMemo(() => {
    return agriZones.filter(zone => zone.clcCode >= 211 && zone.clcCode <= 244);
  }, [agriZones]);

  // The mask is a global rectangle with "holes" cut out for agricultural zones
  const maskCoordinates = useMemo(() => {
    // For Leaflet to render holes correctly, the outer ring and holes should have opposite orientations
    const holes = filteredAgriZones.map(zone => [...zone.coordinates[0]].reverse());
    return [WORLD_BOUNDS, ...holes];
  }, [filteredAgriZones]);

  return (
    <MapContainer
      center={[44.4268, 26.1025]}
      zoom={13}
      style={{ height: '100%', width: '100%', background: '#f0f0f0' }}
      {...mapProps}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      {/* Agri Mask Layer - Dims everything EXCEPT agricultural zones */}
      {showMask && (
        <Pane name="agri-mask" style={{ zIndex: 400 }}>
          <Polygon
            positions={maskCoordinates}
            pathOptions={{
              fillColor: '#0f172a', // Dark slate blue/black
              fillOpacity: 0.75,   // High opacity for strong focus
              color: 'transparent',
              weight: 0,
              stroke: false
            }}
            interactive={false}
          />
        </Pane>
      )}

      {/* Agri Zone Borders - Subtle highlight for the "clear" zones */}
      <Pane name="agri-highlight" style={{ zIndex: 401 }}>
        {filteredAgriZones.map(zone => (
          <Polygon
            key={zone.id}
            positions={zone.coordinates}
            eventHandlers={{
              click: () => {
                if (onZoneSelect) onZoneSelect(zone);
              }
            }}
            pathOptions={{
              fillColor: 'transparent',
              color: '#22c55e', // Green-500
              weight: 2,
              opacity: 0.5,
              dashArray: '10, 10',
              fill: true,
              fillOpacity: 0.01
            }}
          />
        ))}
      </Pane>

      {/* Children (Risk Polygons, etc.) should be rendered on top */}
      <div style={{ position: 'relative', zIndex: 500 }}>
        {children}
      </div>
    </MapContainer>
  );
};


export default AgriMap;

