import Foundation
import CoreLocation
import Combine

class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    static let shared = LocationManager()
    
    private let manager = CLLocationManager()
    
    @Published var userLocation: CLLocation?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    @Published var isInsideGeofence: Bool = false
    @Published var activeTargetName: String = "Test Site (Home)"
    @Published var distanceToTargetMeters: Double = 0.0
    @Published var isDemoBypassEnabled: Bool = false
    
    // Target coordinate (defaults to the user's test location)
    @Published var targetCoordinate = CLLocationCoordinate2D(
        latitude: AppConfig.testLatitude,
        longitude: AppConfig.testLongitude
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
    
    func selectTarget(site: String) {
        if site == "campus" {
            activeTargetName = "SIT Campus"
            targetCoordinate = CLLocationCoordinate2D(
                latitude: AppConfig.campusLatitude,
                longitude: AppConfig.campusLongitude
            )
        } else {
            activeTargetName = "Test Site (Home)"
            targetCoordinate = CLLocationCoordinate2D(
                latitude: AppConfig.testLatitude,
                longitude: AppConfig.testLongitude
            )
        }
        recalculateGeofence()
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
        if isDemoBypassEnabled {
            isInsideGeofence = true
            distanceToTargetMeters = 0.0
            return
        }
        
        guard let userLoc = userLocation else {
            isInsideGeofence = false
            return
        }
        
        let targetLoc = CLLocation(latitude: targetCoordinate.latitude, longitude: targetCoordinate.longitude)
        let distance = userLoc.distance(from: targetLoc)
        self.distanceToTargetMeters = distance
        
        // 500m geofence radius
        self.isInsideGeofence = distance <= 500.0
    }
}
