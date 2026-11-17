// GPS Geofencing for Symbiosis Institute of Technology (SIT) / Symbiosis Nagpur Campus
export const CAMPUS_COORDINATES = {
  name: 'Symbiosis Institute of Technology (SIT), Nagpur',
  lat: 21.1258,
  lng: 79.1585,
  radiusMeters: 1500, // 1.5 km campus boundary radius
};

// Haversine formula to compute accurate distance between two GPS coordinates in meters
export function getDistanceFromCampusMeters(lat: number, lng: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat * Math.PI) / 180;
  const phi2 = (CAMPUS_COORDINATES.lat * Math.PI) / 180;
  const deltaPhi = ((CAMPUS_COORDINATES.lat - lat) * Math.PI) / 180;
  const deltaLambda = ((CAMPUS_COORDINATES.lng - lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function isWithinCampus(lat: number, lng: number): boolean {
  const distance = getDistanceFromCampusMeters(lat, lng);
  return distance <= CAMPUS_COORDINATES.radiusMeters;
}
