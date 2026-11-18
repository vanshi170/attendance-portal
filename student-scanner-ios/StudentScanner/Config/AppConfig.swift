import Foundation

struct AppConfig {
    // Default Backend URL
    // Can be changed to your Render URL: https://attendance-portal-00ea.onrender.com
    // or your Vercel URL
    static var backendBaseURL: String {
        get {
            UserDefaults.standard.string(forKey: "backend_base_url") ?? "https://attendance-portal-00ea.onrender.com"
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "backend_base_url")
        }
    }

    // Geofencing Coordinates
    // Symbiosis Institute of Technology (SIT), Nagpur (21°07'35.0"N 79°09'36.4"E)
    static let campusLatitude = 21.126389
    static let campusLongitude = 79.160111
    static let campusRadiusMeters: Double = 500.0

    // Authorized Campus Wi-Fi SSIDs
    static let authorizedSSIDs = [
        "SYMBI_NGP_STUDENT"
    ]
}
