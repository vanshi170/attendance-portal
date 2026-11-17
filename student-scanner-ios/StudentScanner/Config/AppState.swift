import Foundation
import Combine

class AppState: ObservableObject {
    @Published var currentStudent: Student?
    @Published var authToken: String?
    @Published var isLoggedIn: Bool = false
    
    init() {
        loadSession()
    }
    
    func saveSession(student: Student, token: String) {
        self.currentStudent = student
        self.authToken = token
        self.isLoggedIn = true
        
        UserDefaults.standard.set(token, forKey: "auth_token")
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
    }
    
    private func loadSession() {
        if let token = UserDefaults.standard.string(forKey: "auth_token"),
           let data = UserDefaults.standard.data(forKey: "cached_student"),
           let student = try? JSONDecoder().decode(Student.self, from: data) {
            self.authToken = token
            self.currentStudent = student
            self.isLoggedIn = true
        }
    }
}
