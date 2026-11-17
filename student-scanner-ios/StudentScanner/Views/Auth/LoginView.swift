import SwiftUI

struct LoginView: View {
    @EnvironmentObject var appState: AppState
    @State private var identifier = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showRegister = false
    @State private var showServerSettings = false
    @State private var customServerURL = AppConfig.backendBaseURL
    
    var body: some View {
        NavigationStack {
            ZStack {
                LivingBackground()
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Header icon
                        HStack {
                            ZStack {
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(
                                        LinearGradient(
                                            colors: [Color.blue.opacity(0.12), Color.sky.opacity(0.2)],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .frame(width: 48, height: 48)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(Color.sky.opacity(0.3), lineWidth: 1)
                                    )
                                
                                Image(systemName: "graduationcap.fill")
                                    .font(.system(size: 24))
                                    .foregroundColor(Color.blue)
                            }
                            Spacer()
                            
                            Button(action: { 
                                customServerURL = AppConfig.backendBaseURL
                                showServerSettings = true 
                            }) {
                                Image(systemName: "gearshape.fill")
                                    .font(.system(size: 15))
                                    .foregroundColor(.gray)
                                    .padding(9)
                                    .background(Color.white.opacity(0.85))
                                    .clipShape(Circle())
                            }
                        }
                        .padding(.top, 40)
                        
                        // Titles
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Welcome Back")
                                .font(.system(size: 32, weight: .bold, design: .rounded))
                                .foregroundColor(Color(red: 0.05, green: 0.15, blue: 0.3))
                            
                            Text("Symbiosis Institute of Technology, Nagpur · Student Portal")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(Color.gray.opacity(0.85))
                        }
                        
                        // Card
                        VStack(alignment: .leading, spacing: 18) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Student Sign In")
                                    .font(.system(size: 19, weight: .bold, design: .rounded))
                                    .foregroundColor(Color(red: 0.08, green: 0.18, blue: 0.32))
                                
                                Text("Enter your PRN or official college email to access scanner")
                                    .font(.system(size: 12))
                                    .foregroundColor(Color.gray)
                            }
                            
                            // Identifier input
                            VStack(alignment: .leading, spacing: 6) {
                                Text("PRN or College Email")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(Color(red: 0.2, green: 0.3, blue: 0.45))
                                
                                HStack(spacing: 12) {
                                    Image(systemName: "envelope.fill")
                                        .font(.system(size: 14))
                                        .foregroundColor(Color.sky)
                                    
                                    TextField("25070521001 or email", text: $identifier)
                                        .font(.system(size: 14))
                                        .autocapitalization(.none)
                                        .disableAutocorrection(true)
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                                .background(Color.white.opacity(0.85))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.sky.opacity(0.25), lineWidth: 1)
                                )
                            }
                            
                            // Password input
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Password")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(Color(red: 0.2, green: 0.3, blue: 0.45))
                                
                                HStack(spacing: 12) {
                                    Image(systemName: "lock.fill")
                                        .font(.system(size: 14))
                                        .foregroundColor(Color.sky)
                                    
                                    SecureField("••••••••", text: $password)
                                        .font(.system(size: 14))
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                                .background(Color.white.opacity(0.85))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.sky.opacity(0.25), lineWidth: 1)
                                )
                            }
                            
                            if let error = errorMessage {
                                Text(error)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(.red)
                                    .padding(.vertical, 2)
                            }
                            
                            // Submit Button
                            Button(action: handleLogin) {
                                HStack {
                                    if isLoading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    } else {
                                        Text("Sign In to Portal")
                                            .font(.system(size: 15, weight: .semibold))
                                            .foregroundColor(.white)
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 48)
                                .background(
                                    LinearGradient(
                                        colors: [Color.sky, Color.blue],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .cornerRadius(24)
                                .shadow(color: Color.blue.opacity(0.3), radius: 8, x: 0, y: 4)
                            }
                            .disabled(isLoading || identifier.isEmpty || password.isEmpty)
                            .opacity((identifier.isEmpty || password.isEmpty) ? 0.6 : 1.0)
                            
                            // Register link
                            Button(action: { showRegister = true }) {
                                HStack(spacing: 4) {
                                    Text("New student?")
                                        .font(.system(size: 13))
                                        .foregroundColor(.gray)
                                    Text("Register here")
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(Color.blue)
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .padding(.top, 4)
                        }
                        .padding(22)
                        .background(Color.white.opacity(0.75))
                        .cornerRadius(22)
                        .overlay(
                            RoundedRectangle(cornerRadius: 22)
                                .stroke(Color.sky.opacity(0.2), lineWidth: 1)
                        )
                        .shadow(color: Color.blue.opacity(0.06), radius: 15, x: 0, y: 8)
                        
                        // Zero Trust Footer
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.shield.fill")
                                .foregroundColor(Color.blue)
                                .font(.system(size: 14))
                            Text("Encrypted Zero-Trust Verification Framework")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(Color.gray.opacity(0.8))
                        }
                        .padding(.top, 10)
                        
                        Spacer()
                    }
                    .padding(.horizontal, 24)
                }
            }
            .navigationDestination(isPresented: $showRegister) {
                RegisterView()
            }
            .sheet(isPresented: $showServerSettings) {
                NavigationStack {
                    Form {
                        Section(header: Text("Backend Server URL"), footer: Text("Enter either your Render backend URL or Vercel deployment URL.")) {
                            TextField("https://attendance-portal-00ea.onrender.com", text: $customServerURL)
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                                .keyboardType(.URL)
                        }
                        
                        Section {
                            Button("Save & Apply") {
                                AppConfig.backendBaseURL = customServerURL.trimmingCharacters(in: .whitespacesAndNewlines)
                                showServerSettings = false
                            }
                            .foregroundColor(.blue)
                            
                            Button("Reset to Render Default") {
                                customServerURL = "https://attendance-portal-00ea.onrender.com"
                                AppConfig.backendBaseURL = customServerURL
                                showServerSettings = false
                            }
                            .foregroundColor(.red)
                        }
                    }
                    .navigationTitle("Server Settings")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button("Done") { showServerSettings = false }
                        }
                    }
                }
            }
        }
    }
    
    private func handleLogin() {
        guard !identifier.isEmpty, !password.isEmpty else { return }
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let response = try await APIService.shared.login(identifier: identifier, password: password)
                await MainActor.run {
                    self.isLoading = false
                    if let student = response.student, let token = response.token {
                        self.appState.saveSession(student: student, token: token)
                    }
                }
            } catch {
                await MainActor.run {
                    self.isLoading = false
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }
}

// Color Extension for Pastel Sky Blue Palette
extension Color {
    static let sky = Color(red: 0.22, green: 0.65, blue: 0.95)
    static let skyLight = Color(red: 0.88, green: 0.94, blue: 0.99)
    static let skySoft = Color(red: 0.94, green: 0.97, blue: 1.0)
}
