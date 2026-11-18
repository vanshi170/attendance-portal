import Foundation
import CoreLocation
import Combine

class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    static let shared = LocationManager()
    
    private let manager = CLLocationManager()
    
    @Published var userLocation: CLLocation?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    @Published var isInsideGeofence: Bool = false
    @Published var activeTargetName: String = "SIT Nagpur Campus"
    @Published var distanceToTargetMeters: Double = 0.0
    
    // Target coordinate: Symbiosis Institute of Technology, Nagpur (21°07'35.0"N 79°09'36.4"E)
    let targetCoordinate = CLLocationCoordinate2D(
        latitude: AppConfig.campusLatitude,
        longitude: AppConfig.campusLongitude
    )
    
    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 2 // updates every 2 meters
    }
    
    func requestPermission() {
        manager.requestWhenInUseAuthorization()
        manager.startUpdatingLocation()
    }
    
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        if authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways {
            manager.startUpdatingLocation()
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let latest = locations.last else { return }
        self.userLocation = latest
        recalculateGeofence()
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location manager error: \(error.localizedDescription)")
    }
    
    private func recalculateGeofence() {
        guard let userLoc = userLocation else {
            isInsideGeofence = false
            return
        }
        
        let targetLoc = CLLocation(latitude: targetCoordinate.latitude, longitude: targetCoordinate.longitude)
        let distance = userLoc.distance(from: targetLoc)
        self.distanceToTargetMeters = distance
        
        // 500m geofence radius around SIT Nagpur campus
        self.isInsideGeofence = distance <= AppConfig.campusRadiusMeters
    }
}
