// GPS Geofencing for Symbiosis Institute of Technology (SIT) Nagpur & Testing Sites

export interface GeofenceZone {
  id: string;
  name: string;
  tag: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  mapsUrl: string;
  isTestSite?: boolean;
}

export const AUTHORIZED_ZONES: GeofenceZone[] = [
  {
    id: 'test-site',
    name: 'Rishab Thutheja Test Location',
    tag: 'Testing & Development Site',
    lat: 21.151361423093896,
    lng: 79.12705572951128,
    radiusMeters: 1000, // 1 km radius tolerance for mobile GPS testing
    mapsUrl: 'https://maps.app.goo.gl/eeLwdCKbX9wU2YjEA',
    isTestSite: true,
  },
  {
    id: 'sit-campus',
    name: 'Symbiosis Institute of Technology (SIT), Nagpur',
    tag: 'Official Campus Demonstration',
    lat: 21.1258,
    lng: 79.1585,
    radiusMeters: 1500, // 1.5 km campus boundary radius
    mapsUrl: 'https://maps.google.com/?q=21.1258,79.1585',
    isTestSite: false,
  },
];

export const TEST_SITE_COORDINATES = AUTHORIZED_ZONES[0];
export const CAMPUS_COORDINATES = AUTHORIZED_ZONES[1];

// Haversine formula to compute accurate distance between two GPS coordinates in meters
export function getDistanceBetweenCoordinatesMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface GeofenceResult {
  isWithinAnyZone: boolean;
  matchedZone: GeofenceZone | null;
  nearestZone: GeofenceZone;
  distanceToNearest: number;
  distances: { zone: GeofenceZone; distanceMeters: number; isWithin: boolean }[];
}

export function checkGeofence(lat: number, lng: number): GeofenceResult {
  const results = AUTHORIZED_ZONES.map((zone) => {
    const dist = getDistanceBetweenCoordinatesMeters(lat, lng, zone.lat, zone.lng);
    return {
      zone,
      distanceMeters: Math.round(dist),
      isWithin: dist <= zone.radiusMeters,
    };
  });

  const matched = results.find((r) => r.isWithin)?.zone || null;

  // Sort by distance ascending to determine nearest
  const sorted = [...results].sort((a, b) => a.distanceMeters - b.distanceMeters);
  const nearest = sorted[0];

  return {
    isWithinAnyZone: !!matched,
    matchedZone: matched,
    nearestZone: nearest.zone,
    distanceToNearest: nearest.distanceMeters,
    distances: results,
  };
}

export function getDistanceFromCampusMeters(lat: number, lng: number): number {
  return checkGeofence(lat, lng).distanceToNearest;
}

export function isWithinCampus(lat: number, lng: number): boolean {
  return checkGeofence(lat, lng).isWithinAnyZone;
}
