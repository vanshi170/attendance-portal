import Foundation
import Network
import SystemConfiguration.CaptiveNetwork

class NetworkManager: ObservableObject {
    static let shared = NetworkManager()
    
    // Connected Wi-Fi (Actual device Wi-Fi or user-tested simulation)
    @Published var currentSSID: String = "Rishab Thutheja" {
        didSet { validateWifi() }
    }
    
    // Target Required Classroom Wi-Fi (default: SYMBI_NGP_STUDENT)
    @Published var requiredSSID: String = "SYMBI_NGP_STUDENT" {
        didSet { validateWifi() }
    }
    
    @Published var isWifiValid: Bool = false
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
    
    func setConnectedSSID(_ ssid: String) {
        self.currentSSID = ssid
        validateWifi()
    }
    
    func setRequiredSSID(_ ssid: String) {
        self.requiredSSID = ssid
        validateWifi()
    }
    
    func fetchConnectedSSID() {
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
    }
    
    func validateWifi() {
        if isDemoBypassEnabled {
            isWifiValid = true
            return
        }
        
        let currentClean = currentSSID.trimmingCharacters(in: .whitespacesAndNewlines)
        let requiredClean = requiredSSID.trimmingCharacters(in: .whitespacesAndNewlines)
        let match = currentClean.caseInsensitiveCompare(requiredClean) == .orderedSame
        self.isWifiValid = match
    }
}
