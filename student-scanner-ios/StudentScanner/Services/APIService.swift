import Foundation
import UIKit

class APIService: ObservableObject {
    static let shared = APIService()
    
    private init() {}
    
    private var baseURL: URL {
        URL(string: AppConfig.backendBaseURL)!
    }
    
    // MARK: - Login
    func login(identifier: String, password: String) async throws -> AuthResponse {
        let endpoint = baseURL.appendingPathComponent("/api/auth/login")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload: [String: Any] = [
            "identifier": identifier,
            "password": password
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        if httpResponse.statusCode >= 400 {
            if let errorObj = try? JSONDecoder().decode(AuthResponse.self, from: data) {
                throw NSError(domain: "Auth", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: errorObj.error ?? "Login failed"])
            }
            throw NSError(domain: "Auth", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Invalid credentials"])
        }
        
        return try JSONDecoder().decode(AuthResponse.self, from: data)
    }
    
    // MARK: - Register
    func register(firstName: String, lastName: String, rollNo: String, email: String, password: String, section: String) async throws -> AuthResponse {
        let endpoint = baseURL.appendingPathComponent("/api/auth/register")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload: [String: Any] = [
            "firstName": firstName,
            "lastName": lastName,
            "rollNo": rollNo,
            "email": email,
            "password": password,
            "section": section
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        if httpResponse.statusCode >= 400 {
            if let errorObj = try? JSONDecoder().decode(AuthResponse.self, from: data) {
                throw NSError(domain: "Auth", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: errorObj.error ?? "Registration failed"])
            }
            throw NSError(domain: "Auth", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Registration failed. Check PRN (11 digits) and @sitnagpur.siu.edu.in email."])
        }
        
        return try JSONDecoder().decode(AuthResponse.self, from: data)
    }
    
    // MARK: - Upload Photo
    func uploadPhoto(studentId: String, image: UIImage) async throws -> String {
        let endpoint = baseURL.appendingPathComponent("/api/student/photo")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        
        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw NSError(domain: "Upload", code: 400, userInfo: [NSLocalizedDescriptionKey: "Failed to compress image"])
        }
        
        var body = Data()
        // studentId field
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"studentId\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(studentId)\r\n".data(using: .utf8)!)
        
        // file field
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"photo\"; filename=\"profile.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "Upload", code: 500, userInfo: [NSLocalizedDescriptionKey: "Photo upload failed"])
        }
        
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let photoUrl = json["photoUrl"] as? String {
            return photoUrl
        }
        return ""
    }
    
    // MARK: - Fetch Dashboard
    func fetchDashboard(studentId: String) async throws -> DashboardResponse {
        var components = URLComponents(url: baseURL.appendingPathComponent("/api/student/dashboard"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "studentId", value: studentId)]
        
        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "Dashboard", code: 500, userInfo: [NSLocalizedDescriptionKey: "Failed to load dashboard metrics"])
        }
        
        return try JSONDecoder().decode(DashboardResponse.self, from: data)
    }
    
    // MARK: - Submit Attendance Scan
    func submitScan(qrToken: String, rollNo: String, name: String, lat: Double?, lng: Double?, wifiSSID: String?) async throws -> ScanResponse {
        let endpoint = baseURL.appendingPathComponent("/api/attendance/scan")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload = ScanSubmissionRequest(
            qrToken: qrToken,
            rollNo: rollNo,
            name: name,
            lat: lat,
            lng: lng,
            wifiSSID: wifiSSID,
            faceVerified: true
        )
        
        request.httpBody = try JSONEncoder().encode(payload)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        let decoded = try? JSONDecoder().decode(ScanResponse.self, from: data)
        if httpResponse.statusCode >= 400 {
            let msg = decoded?.error ?? decoded?.message ?? "Attendance scan rejected"
            throw NSError(domain: "Scan", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: msg])
        }
        
        return decoded ?? ScanResponse(success: true, message: "Attendance marked successfully!", error: nil, session: nil)
    }
}
