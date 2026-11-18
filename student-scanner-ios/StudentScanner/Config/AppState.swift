import Foundation
import Combine

class AppState: ObservableObject {
    @Published var currentStudent: Student?
    @Published var authToken: String?
    @Published var isLoggedIn: Bool = false
    @Published var isDeviceRegistered: Bool = false
    @Published var boundStudentPRN: String? = nil
    
    init() {
        loadSession()
    }
    
    func saveSession(student: Student, token: String) {
        self.currentStudent = student
        self.authToken = token
        self.isLoggedIn = true
        self.isDeviceRegistered = true
        self.boundStudentPRN = student.rollNo
        
        UserDefaults.standard.set(token, forKey: "auth_token")
        UserDefaults.standard.set(true, forKey: "device_is_registered")
        UserDefaults.standard.set(student.rollNo, forKey: "device_bound_prn")
        if let encoded = try? JSONEncoder().encode(student) {
            UserDefaults.standard.set(encoded, forKey: "cached_student")
        }
    }
    
    func updateStudent(student: Student) {
        self.currentStudent = student
        if let encoded = try? JSONEncoder().encode(student) {
            UserDefaults.standard.set(encoded, forKey: "cached_student")
        }
    }
    
    func logout() {
        self.currentStudent = nil
        self.authToken = nil
        self.isLoggedIn = false
        UserDefaults.standard.removeObject(forKey: "auth_token")
        UserDefaults.standard.removeObject(forKey: "cached_student")
        // NOTE: device_is_registered and device_bound_prn are intentionally KEPT
        // so this physical phone remains bound to this one student identity
    }
    
    private func loadSession() {
        self.isDeviceRegistered = UserDefaults.standard.bool(forKey: "device_is_registered")
        self.boundStudentPRN = UserDefaults.standard.string(forKey: "device_bound_prn")
        
        if let token = UserDefaults.standard.string(forKey: "auth_token"),
           let data = UserDefaults.standard.data(forKey: "cached_student"),
           let student = try? JSONDecoder().decode(Student.self, from: data) {
            self.authToken = token
            self.currentStudent = student
            self.isLoggedIn = true
        }
    }
}
