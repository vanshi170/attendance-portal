import Foundation
import Network
import SystemConfiguration.CaptiveNetwork

class NetworkManager: ObservableObject {
    static let shared = NetworkManager()
    
    @Published var currentSSID: String = "Rishab Thutheja" {
        didSet { validateWifi() }
    }
    @Published var isWifiValid: Bool = true
    @Published var isDemoBypassEnabled: Bool = false {
        didSet { validateWifi() }
    }
    
    private let monitor = NWPathMonitor(requiredInterfaceType: .wifi)
    private let queue = DispatchQueue(label: "NetworkMonitor")
    
    init() {
        startMonitoring()
        validateWifi()
    }
    
    func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.fetchConnectedSSID()
                self?.validateWifi()
            }
        }
        monitor.start(queue: queue)
    }
    
    func setManualSSID(_ ssid: String) {
        self.currentSSID = ssid
        validateWifi()
    }
    
    func fetchConnectedSSID() {
        // Query system captive network if available
        if let interfaces = CNCopySupportedInterfaces() as? [String] {
            for interface in interfaces {
                if let interfaceInfo = CNCopyCurrentNetworkInfo(interface as CFString) as? [String: Any] {
                    if let ssid = interfaceInfo[kCNNetworkInfoKeySSID as String] as? String {
                        self.currentSSID = ssid
                        return
                    }
                }
            }
        }
        // Fallback maintains the detected or user-configured SSID
    }
    
    func validateWifi() {
        if isDemoBypassEnabled {
            isWifiValid = true
            return
        }
        
        let validList = AppConfig.authorizedSSIDs
        let match = validList.contains { authorized in
            currentSSID.caseInsensitiveCompare(authorized) == .orderedSame
        }
        self.isWifiValid = match
    }
}
