
import React, { useEffect, useRef } from 'react';
import type { Feature, Polygon } from 'geojson';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix Leaflet default icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

if (typeof window !== 'undefined') {
  (window as any).L = L;
}
import 'leaflet-draw';

// Disable intersection checks globally for Leaflet Draw to prevent errors
try {
  if ((L as any).Draw && (L as any).Draw.Polygon) {
    (L as any).Draw.Polygon.prototype._checkIntersect = function () { return false; };
  }
} catch (e) {
  console.warn("Could not override L.Draw.Polygon._checkIntersect", e);
}

import type { SpeciesPlacement } from '../types';

interface MapEditorProps {
  center: { lat: number; lng: number };
  onAreaDrawn: (geojson: Feature<Polygon> | null) => void;
  planId?: string;
  mapLayers?: SpeciesPlacement[] | null;
}

function getSpeciesIcon(strata: string) {
  const colors = {
    emergent: '#4A5568', // gray-600
    high: '#2F855A', // green-700
    medium: '#38A169', // green-600
    low: '#68D391', // green-400
  };
  const color = colors[strata as keyof typeof colors] || '#6B46C1'; // purple-700 as fallback
  
  const iconHtml = `<div style="background-color: ${color}; width: 1.25rem; height: 1.25rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2px solid rgba(255,255,255,0.9); box-shadow: 0 1px 3px rgba(0,0,0,0.3); font-size: 0.65rem;">${strata.charAt(0).toUpperCase()}</div>`;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-div-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}


export function MapEditor({ center, onAreaDrawn, mapLayers, planId }: MapEditorProps) {
  const mapRef = useRef<L.Map | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const speciesLayerRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const lastFittedPlanIdRef = useRef<string | undefined>(undefined);

  // Update map view when center prop changes (from geolocation)
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView([center.lat, center.lng], 15);
    }
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, { maxZoom: 21, zoomControl: false }).setView([center.lat, center.lng], 13);
       L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      map.addLayer(drawnItemsRef.current);
      map.addLayer(speciesLayerRef.current);

      // FIX: Cast L.Control to 'any' to resolve TypeScript error where 'Draw' property is not found on 'Control'. This is a workaround for leaflet-draw type definitions not being picked up correctly.
      try {
        if ((L.Control as any).Draw) {
          const drawControl = new (L.Control as any).Draw({
            edit: {
              featureGroup: drawnItemsRef.current,
              remove: true
            },
            draw: {
              polygon: {
                allowIntersection: false,
                shapeOptions: {
                  color: '#059669', // emerald-600
                  weight: 3,
                }
              },
              polyline: false,
              rectangle: false,
              circle: false,
              marker: false,
              circlemarker: false
            },
            position: 'bottomright'
          });
          map.addControl(drawControl);
        }
      } catch (e) {
        console.error("Failed to initialize Leaflet Draw control:", e);
      }

      // FIX: Replaced 'L.Draw.Event.CREATED' with its string literal 'draw:created' to avoid TypeScript error, as the leaflet-draw event types are not being resolved.
      map.on('draw:created', (event: any) => {
        const layer = event.layer;
        drawnItemsRef.current.clearLayers();
        drawnItemsRef.current.addLayer(layer);
        const geojson = layer.toGeoJSON() as Feature<Polygon>;
        onAreaDrawn(geojson);
      });
      
      // FIX: Replaced 'L.Draw.Event.EDITED' with its string literal 'draw:edited' to avoid TypeScript error.
      map.on('draw:edited', (event: any) => {
         event.layers.eachLayer((layer: any) => {
            const geojson = layer.toGeoJSON() as Feature<Polygon>;
            onAreaDrawn(geojson);
         });
      });
      
      // FIX: Replaced 'L.Draw.Event.DELETED' with its string literal 'draw:deleted' to avoid TypeScript error.
      map.on('draw:deleted', () => {
        if (drawnItemsRef.current.getLayers().length === 0) {
            onAreaDrawn(null);
        }
      });

      // Ensure map resizes correctly
      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      mapRef.current = map;
    }
  }, [center.lat, center.lng, onAreaDrawn]);

  useEffect(() => {
    speciesLayerRef.current.clearLayers();
    if (mapLayers && mapLayers.length > 0) {
      mapLayers.forEach(placement => {
        const marker = L.marker(placement.coordinates as LatLngExpression, { icon: getSpeciesIcon(placement.strata) })
          .bindPopup(`<b>${placement.species}</b><br><span>${placement.info}</span>`);
        speciesLayerRef.current.addLayer(marker);
      });
       if(mapRef.current && planId !== lastFittedPlanIdRef.current) {
           const bounds = speciesLayerRef.current.getBounds();
           if(bounds.isValid()) {
                mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
                lastFittedPlanIdRef.current = planId;
           }
       }
    } else {
      lastFittedPlanIdRef.current = undefined;
    }
  }, [mapLayers, planId]);

  return (
    <div className="relative overflow-hidden rounded-[1.25rem]">
      <style>{`
        @keyframes pulse-emerald {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .leaflet-draw-draw-polygon {
          animation: pulse-emerald 2s infinite !important;
          background-color: #ecfdf5 !important;
          border: 2px solid #10b981 !important;
          border-radius: 4px !important;
        }
      `}</style>
      
      <div ref={mapContainerRef} style={{ height: '60vh' }} />
    </div>
  );
}
