import Foundation

struct ScanSubmissionRequest: Codable {
    let qrToken: String
    let rollNo: String
    let name: String
    let lat: Double?
    let lng: Double?
    let wifiSSID: String?
    let faceVerified: Bool
}

struct ScanResponse: Codable {
    let success: Bool?
    let message: String?
    let error: String?
    let session: SessionInfo?
}

struct SessionInfo: Codable {
    let subject: String?
    let classroom: String?
    let teacherName: String?
}
