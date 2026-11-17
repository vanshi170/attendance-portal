// Authorized Wi-Fi Networks for SIT / Symbiosis Nagpur Attendance
export interface AuthorizedNetwork {
  ssid: string;
  authType: string;
  description: string;
}

export const AUTHORIZED_WIFI_NETWORKS: AuthorizedNetwork[] = [
  {
    ssid: 'SYMBI_NGP_STUDENT',
    authType: 'WPA3-Personal / WPA2-Personal',
    description: 'Official Symbiosis Nagpur Student Wi-Fi Access Point',
  },
  {
    ssid: 'Rishab Thutheja',
    authType: 'WPA3-Personal / WPA2-Personal',
    description: 'Authorized Campus Access Router',
  },
];

export function isAuthorizedWifi(ssid: string): boolean {
  if (!ssid) return false;
  const clean = ssid.trim();
  return AUTHORIZED_WIFI_NETWORKS.some(
    (net) => net.ssid.toLowerCase() === clean.toLowerCase()
  );
}
