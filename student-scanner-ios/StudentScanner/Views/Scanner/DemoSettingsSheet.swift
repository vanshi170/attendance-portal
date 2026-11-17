import SwiftUI

struct DemoSettingsSheet: View {
    @ObservedObject var locationManager: LocationManager
    @ObservedObject var networkManager: NetworkManager
    @Environment(\.dismiss) var dismiss
    
    let wifiOptions = ["Rishab Thutheja", "SYMBI_NGP_STUDENT", "Other / Mobile Data"]
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Live Location & GPS Sensor")) {
                    if let loc = locationManager.userLocation {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Current GPS Coordinates:")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.gray)
                            Text(String(format: "%.6f° N, %.6f° E (±%.0fm)", loc.coordinate.latitude, loc.coordinate.longitude, loc.horizontalAccuracy))
                                .font(.system(size: 13, design: .monospaced))
                            
                            Text("Distance to \(locationManager.activeTargetName):")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.gray)
                                .padding(.top, 4)
                            Text(String(format: "%.0f meters", locationManager.distanceToTargetMeters))
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(locationManager.isInsideGeofence ? .green : .red)
                        }
                        .padding(.vertical, 4)
                    } else {
                        Text("Acquiring GPS sensor...")
                            .foregroundColor(.gray)
                    }
                    
                    Picker("Geofence Target", selection: Binding(
                        get: { locationManager.activeTargetName == "SIT Campus" ? "campus" : "test" },
                        set: { locationManager.selectTarget(site: $0) }
                    )) {
                        Text("Test Site (Home)").tag("test")
                        Text("SIT Nagpur Campus").tag("campus")
                    }
                    .pickerStyle(.segmented)
                    
                    Toggle("Demo GPS Bypass", isOn: $locationManager.isDemoBypassEnabled)
                }
                
                Section(header: Text("Wi-Fi Validation")) {
                    Picker("Network SSID", selection: $networkManager.currentSSID) {
                        ForEach(wifiOptions, id: \.self) { ssid in
                            Text(ssid).tag(ssid)
                        }
                    }
                    
                    Toggle("Demo Wi-Fi Bypass", isOn: $networkManager.isDemoBypassEnabled)
                }
            }
            .navigationTitle("Scanner Demo Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
