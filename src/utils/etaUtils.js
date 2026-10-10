/**
 * ThreadIQ - Delivery Mode, ETA Calculation, and Logistics Utilities
 * Provides configurable travel-time modeling for Express vs Normal delivery modes,
 * arrival timestamp calculations, and transfer lifecycle states.
 */

export const DELIVERY_MODES = {
  express: {
    id: 'express',
    name: 'Express Delivery',
    badgeText: 'EXPRESS',
    color: '#ffffff',
    bgColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    avgSpeedKmh: 85, // Higher average transit velocity (dedicated team line-haul)
    prepTimeHours: 1.5, // Expedited staging and loading buffer
    bufferFactor: 1.05, // 5% operational transit buffer
    description: 'Expedited dedicated dispatch with fast-track loading and minimal staging delay'
  },
  normal: {
    id: 'normal',
    name: 'Normal Delivery',
    badgeText: 'NORMAL',
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    avgSpeedKmh: 60, // Standard commercial freight run rate (mandatory rest stops)
    prepTimeHours: 5.0, // Standard consolidated staging and palletizing
    bufferFactor: 1.15, // 15% consolidation operational buffer
    description: 'Standard consolidated ground freight via regional carrier distribution schedule'
  }
};

export const TRANSFER_STAGES = [
  { key: 'approved', label: 'Approved', stepNumber: 1, desc: 'Decision locked, awaiting dispatch configuration' },
  { key: 'dispatched', label: 'Dispatched', stepNumber: 2, desc: 'Cargo departed source facility and logged' },
  { key: 'in_transit', label: 'In Transit', stepNumber: 3, desc: 'Freight actively moving along regional route' },
  { key: 'delivered', label: 'Delivered', stepNumber: 4, desc: 'Received, verified, and inventoried at destination' }
];

/**
 * Calculates estimated travel duration and arrival timestamp.
 *
 * @param {number} distanceKm - Route distance in kilometres
 * @param {'express' | 'normal'} deliveryMode - Selected delivery mode
 * @param {string | Date | null} [dispatchTime] - Optional dispatch timestamp
 * @param {number | null} [routeDurationSeconds] - Optional duration estimate from routing engine
 * @returns {{
 *   distanceKm: number,
 *   deliveryMode: 'express' | 'normal',
 *   modeConfig: typeof DELIVERY_MODES['express'],
 *   durationHours: number,
 *   durationMinutes: number,
 *   formattedDuration: string,
 *   arrivalDate: Date,
 *   formattedArrival: string,
 *   disclaimer: string,
 *   lastCalculatedAt: string
 * }}
 */
export function calculateDeliveryETA(distanceKm, deliveryMode = 'normal', dispatchTime = null, routeDurationSeconds = null) {
  const mode = deliveryMode === 'express' ? DELIVERY_MODES.express : DELIVERY_MODES.normal;
  const dist = Math.max(0, Number(distanceKm) || 0);

  let travelHours = 0;

  if (routeDurationSeconds && routeDurationSeconds > 0) {
    // Prefer routing provider duration if available
    const baseDrivingHours = routeDurationSeconds / 3600;
    if (deliveryMode === 'express') {
      travelHours = baseDrivingHours * 0.95 + mode.prepTimeHours;
    } else {
      travelHours = baseDrivingHours * 1.18 + mode.prepTimeHours;
    }
  } else {
    // Configurable formula: (Distance / Average Speed) * bufferFactor + prepTime
    const drivingHours = (dist / mode.avgSpeedKmh) * mode.bufferFactor;
    travelHours = drivingHours + mode.prepTimeHours;
  }

  // Ensure minimum travel time
  if (dist > 0 && travelHours < 1) travelHours = 1;

  const totalMinutes = Math.round(travelHours * 60);
  const hoursOnly = Math.floor(totalMinutes / 60);
  const minsRemainder = totalMinutes % 60;

  // Format human-readable travel duration (e.g., "2d 4h", "18h 30m")
  let formattedDuration = '';
  if (hoursOnly >= 24) {
    const days = Math.floor(hoursOnly / 24);
    const remHours = hoursOnly % 24;
    formattedDuration = `${days}d ${remHours}h`;
  } else if (hoursOnly > 0) {
    formattedDuration = `${hoursOnly}h ${minsRemainder > 0 ? `${minsRemainder}m` : ''}`.trim();
  } else {
    formattedDuration = `${minsRemainder} mins`;
  }

  // Compute arrival timestamp
  const startDate = dispatchTime ? new Date(dispatchTime) : new Date();
  const arrivalTimestamp = new Date(startDate.getTime() + totalMinutes * 60 * 1000);

  // Format arrival date/time (e.g., "Mon, Oct 12 at 14:30")
  const formattedArrival = arrivalTimestamp.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return {
    distanceKm: dist,
    deliveryMode: mode.id,
    modeConfig: mode,
    durationHours: travelHours,
    durationMinutes: totalMinutes,
    formattedDuration,
    arrivalDate: arrivalTimestamp,
    formattedArrival,
    disclaimer: 'Estimated ETA — traffic not included',
    lastCalculatedAt: new Date().toLocaleTimeString()
  };
}
