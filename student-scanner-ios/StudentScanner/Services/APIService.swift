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
            "email": identifier,
            "rollNo": identifier,
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
    func register(firstName: String, lastName: String, rollNo: String, email: String, password: String, section: String, semester: Int = 1) async throws -> AuthResponse {
        let endpoint = baseURL.appendingPathComponent("/api/auth/register")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let fullName = "\(firstName.trimmingCharacters(in: .whitespaces)) \(lastName.trimmingCharacters(in: .whitespaces))"
        let payload: [String: Any] = [
            "name": fullName,
            "firstName": firstName,
            "lastName": lastName,
            "rollNo": rollNo,
            "email": email,
            "password": password,
            "section": section,
            "semester": semester,
            "isStudent": true
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
    func uploadPhoto(studentId: String, rollNo: String? = nil, image: UIImage) async throws -> String {
        let endpoint = baseURL.appendingPathComponent("/api/student/photo")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30.0
        
        // Resize image to standard passport portrait resolution (e.g. max 640px)
        // This ensures the image transfers within <1s without any cellular/Wi-Fi timeouts
        let maxDimension: CGFloat = 640.0
        let scale = min(maxDimension / max(image.size.width, 1.0), maxDimension / max(image.size.height, 1.0), 1.0)
        let targetSize = CGSize(width: max(round(image.size.width * scale), 100), height: max(round(image.size.height * scale), 100))
        
        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resizedImage = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        
        guard let imageData = resizedImage.jpegData(compressionQuality: 0.75) ?? image.jpegData(compressionQuality: 0.6) else {
            throw NSError(domain: "Upload", code: 400, userInfo: [NSLocalizedDescriptionKey: "Failed to compress image"])
        }
        
        let base64String = "data:image/jpeg;base64,\(imageData.base64EncodedString())"
        
        var payload: [String: Any] = [
            "studentId": studentId,
            "photoUrl": base64String,
            "photoBase64": base64String
        ]
        if let r = rollNo, !r.isEmpty {
            payload["rollNo"] = r
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        if httpResponse.statusCode >= 400 {
            if let errorObj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let errMsg = errorObj["error"] as? String ?? errorObj["message"] as? String {
                throw NSError(domain: "Upload", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: errMsg])
            }
            throw NSError(domain: "Upload", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Photo upload failed (HTTP \(httpResponse.statusCode))"])
        }
        
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let photoUrl = json["photoUrl"] as? String {
            return photoUrl
        }
        return base64String
    }
    
    // MARK: - Upload Timetable (PDF or Image)
    func uploadTimetable(studentId: String, rollNo: String, fileData: Data, mimeType: String) async throws -> String {
        let endpoint = baseURL.appendingPathComponent("/api/student/timetable")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let base64String = "data:\(mimeType);base64,\(fileData.base64EncodedString())"
        let payload: [String: Any] = [
            "studentId": studentId,
            "rollNo": rollNo,
            "timetableUrl": base64String
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw NSError(domain: "Timetable", code: 500, userInfo: [NSLocalizedDescriptionKey: "Timetable upload failed"])
        }
        
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let timetableUrl = json["timetableUrl"] as? String {
            return timetableUrl
        }
        return base64String
    }
    
    // MARK: - Fetch Dashboard
    func fetchDashboard(studentId: String, rollNo: String? = nil) async throws -> DashboardResponse {
        var components = URLComponents(url: baseURL.appendingPathComponent("/api/student/dashboard"), resolvingAgainstBaseURL: false)!
        var queryItems = [URLQueryItem(name: "studentId", value: studentId)]
        if let r = rollNo {
            queryItems.append(URLQueryItem(name: "rollNo", value: r))
        }
        components.queryItems = queryItems
        
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
