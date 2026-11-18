import Foundation
import Network
import SystemConfiguration.CaptiveNetwork
import NetworkExtension

class NetworkManager: ObservableObject {
    static let shared = NetworkManager()
    
    // Connected Wi-Fi: dynamically detected from the actual connected iOS interface
    @Published var currentSSID: String = "Detecting Wi-Fi..." {
        didSet { validateWifi() }
    }
    
    // Target Required Classroom Wi-Fi (SIT Student Wi-Fi)
    @Published var requiredSSID: String = "SYMBI_NGP_STUDENT" {
        didSet { validateWifi() }
    }
    
    @Published var isWifiValid: Bool = false
    @Published var isConnectedToWifi: Bool = false
    
    // Demo Wi-Fi Bypass Toggle (retained for lab/remote demonstrations)
    @Published var isDemoBypassEnabled: Bool = false {
        didSet { validateWifi() }
    }
    
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitorQueue")
    
    init() {
        startMonitoring()
        fetchConnectedSSID()
        validateWifi()
    }
    
    func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                guard let self = self else { return }
                let onWifi = path.usesInterfaceType(.wifi) && path.status == .satisfied
                self.isConnectedToWifi = onWifi
                
                if onWifi {
                    self.fetchConnectedSSID()
                } else if path.usesInterfaceType(.cellular) && path.status == .satisfied {
                    self.currentSSID = "Mobile Data / Cellular"
                    self.validateWifi()
                } else {
                    self.currentSSID = "No Wi-Fi Connection"
                    self.validateWifi()
                }
            }
        }
        monitor.start(queue: queue)
    }
    
    func fetchConnectedSSID() {
        // 1. Primary: Modern iOS 14+ NEHotspotNetwork
        NEHotspotNetwork.fetchCurrent { [weak self] network in
            if let ssid = network?.ssid, !ssid.isEmpty {
                DispatchQueue.main.async {
                    self?.currentSSID = ssid
                    self?.isConnectedToWifi = true
                    self?.validateWifi()
                }
                return
            }
            
            // 2. Secondary fallback: CNCopyCurrentNetworkInfo
            if let interfaces = CNCopySupportedInterfaces() as? [String] {
                for interface in interfaces {
                    if let interfaceInfo = CNCopyCurrentNetworkInfo(interface as CFString) as? [String: Any] {
                        if let ssid = interfaceInfo[kCNNetworkInfoKeySSID as String] as? String, !ssid.isEmpty {
                            DispatchQueue.main.async {
                                self?.currentSSID = ssid
                                self?.isConnectedToWifi = true
                                self?.validateWifi()
                            }
                            return
                        }
                    }
                }
            }
            
            // 3. Fallback if connected to Wi-Fi interface but iOS restricts reading SSID string
            DispatchQueue.main.async {
                if self?.monitor.currentPath.usesInterfaceType(.wifi) == true {
                    if self?.currentSSID == "Detecting Wi-Fi..." || self?.currentSSID == "Mobile Data / Cellular" {
                        self?.currentSSID = "Wi-Fi Connected"
                    }
                } else {
                    self?.currentSSID = "Mobile Data / Cellular"
                }
                self?.validateWifi()
            }
        }
    }
    
    func validateWifi() {
        if isDemoBypassEnabled {
            isWifiValid = true
            return
        }
        
        let currentClean = currentSSID.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let requiredClean = requiredSSID.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        
        // Exact match (e.g. "symbi_ngp_student") or contains "symbi" when on active Wi-Fi
        let isMatch = (currentClean == requiredClean) || (isConnectedToWifi && currentClean.contains("symbi"))
        self.isWifiValid = isMatch
    }
}
