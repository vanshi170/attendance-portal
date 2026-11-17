import SwiftUI

@main
struct StudentScannerApp: App {
    @StateObject private var appState = AppState()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        Group {
            if appState.isLoggedIn, let student = appState.currentStudent {
                if student.photoUrl == nil || student.photoUrl?.isEmpty == true {
                    PhotoRegistrationView(student: student)
                } else {
                    DashboardView()
                }
            } else {
                LoginView()
            }
        }
    }
}
