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
    // Symbiosis Institute of Technology (SIT), Nagpur
    static let campusLatitude = 21.125500
    static let campusLongitude = 79.158500
    static let campusRadiusMeters: Double = 500.0

    // User's Test Location (from your prompt)
    static let testLatitude = 21.151361423093896
    static let testLongitude = 79.12705572951128
    static let testRadiusMeters: Double = 500.0

    // Authorized Wi-Fi SSIDs
    static let authorizedSSIDs = [
        "SYMBI_NGP_STUDENT",
        "Rishab Thutheja"
    ]
}
