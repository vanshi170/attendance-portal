import Foundation

struct Student: Codable, Identifiable {
    let id: String
    var name: String
    var rollNo: String
    var email: String
    var section: String?
    var photoUrl: String?
    var timetableUrl: String?
}

struct AuthResponse: Codable {
    let message: String?
    let token: String?
    let student: Student?
    let error: String?
}

struct DashboardResponse: Codable {
    let student: Student
    let attendance: AttendanceStats
    let recentLogs: [AttendanceLog]?
}

struct AttendanceStats: Codable {
    let totalClasses: Int
    let attendedClasses: Int
    let percentage: Double
}

struct AttendanceLog: Codable, Identifiable {
    let id: String
    let courseName: String?
    let subject: String?
    let timestamp: String
    let status: String
}
