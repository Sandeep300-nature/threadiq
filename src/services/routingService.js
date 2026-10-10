/**
 * ThreadIQ - Routing and Geographical Distance Service
 * Interacts with OpenStreetMap/OSRM routing provider for actual driving distance and route geometry.
 * Gracefully falls back to geodesic Haversine distance with explicit transparency labels.
 */

const routeCache = new Map();

/**
 * Calculates Great-Circle straight-line distance in kilometres using the Haversine formula.
 */
export function calculateStraightLineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in kilometres
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Fetches driving route distance, duration, and turn-by-turn road geometry.
 *
 * @param {number} originLat
 * @param {number} originLng
 * @param {number} destLat
 * @param {number} destLng
 * @returns {Promise<{
 *   distanceKm: number,
 *   durationSeconds: number | null,
 *   isDrivingRoute: boolean,
 *   geometry: [number, number][],
 *   routingSource: string
 * }>}
 */
export async function getRouteDetails(originLat, originLng, destLat, destLng) {
  const cacheKey = `${originLat.toFixed(4)},${originLng.toFixed(4)}->${destLat.toFixed(4)},${destLng.toFixed(4)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  const fallbackStraightLine = calculateStraightLineKm(originLat, originLng, destLat, destLng) || 0;
  const fallbackResult = {
    distanceKm: fallbackStraightLine,
    durationSeconds: null,
    isDrivingRoute: false,
    geometry: [
      [originLat, originLng],
      [destLat, destLng]
    ],
    routingSource: 'Approximate straight-line distance — road routing unavailable'
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout for responsive UX

    // OSRM Public Routing API (GeoJSON coordinates are [longitude, latitude])
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Routing provider responded with status ${res.status}`);
    }

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      const distanceKm = Math.round((primaryRoute.distance || 0) / 1000);
      const durationSeconds = Math.round(primaryRoute.duration || 0);

      // Convert GeoJSON coordinates [lng, lat] to Leaflet coordinates [lat, lng]
      const geometry = primaryRoute.geometry.coordinates.map((coord) => [coord[1], coord[0]]);

      const result = {
        distanceKm,
        durationSeconds,
        isDrivingRoute: true,
        geometry,
        routingSource: 'Driving route via OpenStreetMap OSRM Routing Engine'
      };

      routeCache.set(cacheKey, result);
      return result;
    }

    return fallbackResult;
  } catch (err) {
    // Return transparent fallback if network is restricted or offline
    routeCache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }
}
