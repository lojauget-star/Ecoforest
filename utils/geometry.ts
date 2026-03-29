
import L from 'leaflet';
import type { Feature, Polygon } from 'geojson';

/**
 * Calculates the geodesic area of a GeoJSON polygon feature and returns it in hectares.
 * @param {Feature<Polygon>} geojson - The GeoJSON feature representing the polygon.
 * @returns {number} The area in hectares.
 */
export function calculatePolygonAreaHectares(geojson: Feature<Polygon>): number {
  if (!geojson || !geojson.geometry || geojson.geometry.type !== 'Polygon') {
    return 0;
  }

  // Leaflet expects LatLng objects, which are [lat, lng]. GeoJSON is [lng, lat].
  const latLngs = geojson.geometry.coordinates[0].map(coord => new L.LatLng(coord[1], coord[0]));
  
  // FIX: Cast L to 'any' to access GeometryUtil and avoid TypeScript error. The type definition for GeometryUtil may not be correctly associated with the default L import.
  // L.GeometryUtil.geodesicArea calculates the area in square meters.
  const areaInSquareMeters = (L as any).GeometryUtil.geodesicArea(latLngs);
  
  // 1 hectare = 10,000 square meters.
  const areaInHectares = areaInSquareMeters / 10000;
  
  return areaInHectares;
}
