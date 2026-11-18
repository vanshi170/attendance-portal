import SwiftUI

struct DemoSettingsSheet: View {
    @ObservedObject var locationManager: LocationManager
    @ObservedObject var networkManager: NetworkManager
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationStack {
            Form {
                // Section 1: Live Campus GPS Geofence (Official SIT Nagpur: 21°07'35.0"N 79°09'36.4"E)
                Section(header: Text("Live Campus Location & GPS Sensor")) {
                    if let loc = locationManager.userLocation {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Current GPS Coordinates:")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.gray)
                            Text(String(format: "%.6f° N, %.6f° E (±%.0fm)", loc.coordinate.latitude, loc.coordinate.longitude, loc.horizontalAccuracy))
                                .font(.system(size: 13, design: .monospaced))
                            
                            Text("Target: SIT Nagpur Campus (500m Geofence)")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.gray)
                                .padding(.top, 4)
                            
                            HStack {
                                Text("Distance to Campus:")
                                    .font(.system(size: 12))
                                Spacer()
                                Text(String(format: "%.0f meters", locationManager.distanceToTargetMeters))
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(locationManager.isInsideGeofence ? .green : .red)
                            }
                            
                            HStack {
                                Text("Geofence Status:")
                                    .font(.system(size: 12))
                                Spacer()
                                Text(locationManager.isInsideGeofence ? "INSIDE CAMPUS ZONE ✓" : "OUTSIDE CAMPUS ZONE ✕")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(locationManager.isInsideGeofence ? .green : .red)
                            }
                            .padding(.top, 2)
                        }
                        .padding(.vertical, 4)
                    } else {
                        Text("Acquiring GPS sensor...")
                            .foregroundColor(.gray)
                    }
                }
                
                // Section 2: Wi-Fi Verification (Verified strictly by actual connected iOS network)
                Section(
                    header: Text("Classroom Wi-Fi Verification"),
                    footer: Text("Wi-Fi is verified strictly by your iPhone's active connected network interface. You must connect to SYMBI_NGP_STUDENT. If connected to any other Wi-Fi or on mobile data, scanning is blocked.")
                ) {
                    HStack {
                        Text("Actual Connected Wi-Fi")
                        Spacer()
                        Text(networkManager.currentSSID)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(networkManager.isWifiValid ? .green : .red)
                    }
                    
                    HStack {
                        Text("Required Classroom Wi-Fi")
                        Spacer()
                        Text(networkManager.requiredSSID)
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                            .foregroundColor(.primary)
                    }
                    
                    HStack {
                        Text("Verification Status")
                        Spacer()
                        if networkManager.isWifiValid {
                            HStack(spacing: 4) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text("MATCH (AUTHORIZED)")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.green)
                            }
                        } else {
                            HStack(spacing: 4) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.red)
                                Text("MISMATCH (BLOCKED)")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.red)
                            }
                        }
                    }
                    
                    // Demo Wi-Fi Bypass Toggle (retained as explicitly requested)
                    Toggle("Demo Wi-Fi Bypass", isOn: $networkManager.isDemoBypassEnabled)
                    
                    Button(action: {
                        networkManager.fetchConnectedSSID()
                    }) {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("Re-check Connected Wi-Fi")
                        }
                        .font(.system(size: 13, weight: .medium))
                    }
                }
            }
            .navigationTitle("Scanner Sensor Settings")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                networkManager.fetchConnectedSSID()
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
