import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) var dismiss
    
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var rollNo = ""
    @State private var email = ""
    @State private var password = ""
    @State private var selectedSection = "AIML-A"
    @State private var selectedSemester = 1
    
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var registeredStudent: Student?
    @State private var navigateToPhoto = false
    
    let sections = ["AIML-A", "AIML-B", "CSE-A", "CSE-B", "CS-IT", "ROBOTICS"]
    
    var isPRNValid: Bool {
        rollNo.count == 11 && rollNo.allSatisfy { $0.isNumber }
    }
    
    var isEmailValid: Bool {
        email.lowercased().hasSuffix("@sitnagpur.siu.edu.in")
    }
    
    var body: some View {
        ZStack {
            LivingBackground()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    // Back button & header
                    HStack {
                        Button(action: { dismiss() }) {
                            Image(systemName: "arrow.left")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.35))
                                .padding(10)
                                .background(Color.white.opacity(0.8))
                                .clipShape(Circle())
                        }
                        Spacer()
                    }
                    .padding(.top, 20)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Student Registration")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(Color(red: 0.05, green: 0.15, blue: 0.3))
                        
                        Text("Create your zero-trust student identity")
                            .font(.system(size: 13))
                            .foregroundColor(Color.gray.opacity(0.85))
                    }
                    
                    VStack(alignment: .leading, spacing: 14) {
                        // First and Last Name row
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("First Name").font(.system(size: 11, weight: .semibold)).foregroundColor(.gray)
                                TextField("e.g. Rishab", text: $firstName)
                                    .foregroundColor(.black)
                                    .accentColor(.black)
                                    .padding(10)
                                    .background(Color.white.opacity(0.9))
                                    .cornerRadius(10)
                                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.sky.opacity(0.2), lineWidth: 1))
                            }
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Last Name").font(.system(size: 11, weight: .semibold)).foregroundColor(.gray)
                                TextField("e.g. Thutheja", text: $lastName)
                                    .foregroundColor(.black)
                                    .accentColor(.black)
                                    .padding(10)
                                    .background(Color.white.opacity(0.9))
                                    .cornerRadius(10)
                                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.sky.opacity(0.2), lineWidth: 1))
                            }
                        }
                        
                        // PRN
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text("PRN (11 Digits)").font(.system(size: 11, weight: .semibold)).foregroundColor(.gray)
                                Spacer()
                                if !rollNo.isEmpty {
                                    Text(isPRNValid ? "Valid PRN ✓" : "\(rollNo.count)/11 digits")
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundColor(isPRNValid ? .green : .red)
                                }
                            }
                            TextField("25070521001", text: $rollNo)
                                .foregroundColor(.black)
                                .accentColor(.black)
                                .keyboardType(.numberPad)
                                .padding(10)
                                .background(Color.white.opacity(0.9))
                                .cornerRadius(10)
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.sky.opacity(0.2), lineWidth: 1))
                        }
                        
                        // Email
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text("College Email (@sitnagpur.siu.edu.in)").font(.system(size: 11, weight: .semibold)).foregroundColor(.gray)
                                Spacer()
                                if !email.isEmpty {
                                    Text(isEmailValid ? "Official Email ✓" : "Must be @sitnagpur.siu.edu.in")
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundColor(isEmailValid ? .green : .red)
                                }
                            }
                            TextField("student.prn@sitnagpur.siu.edu.in", text: $email)
                                .foregroundColor(.black)
                                .accentColor(.black)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                                .padding(10)
                                .background(Color.white.opacity(0.9))
                                .cornerRadius(10)
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.sky.opacity(0.2), lineWidth: 1))
                        }
                        
                        // Semester
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Semester (1 to 8)").font(.system(size: 11, weight: .semibold)).foregroundColor(.gray)
                            HStack(spacing: 5) {
                                ForEach(1...8, id: \.self) { sem in
                                    Button(action: { selectedSemester = sem }) {
                                        Text("\(sem)")
                                            .font(.system(size: 13, weight: selectedSemester == sem ? .bold : .medium))
                                            .foregroundColor(selectedSemester == sem ? .white : Color(red: 0.1, green: 0.2, blue: 0.35))
                                            .frame(maxWidth: .infinity)
                                            .frame(height: 34)
                                            .background(selectedSemester == sem ? Color.blue : Color.white.opacity(0.85))
                                            .cornerRadius(8)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 8)
                                                    .stroke(selectedSemester == sem ? Color.blue : Color.sky.opacity(0.3), lineWidth: 1)
                                            )
                                    }
                                }
                            }
                        }
                        
                        // Section
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Section").font(.system(size: 11, weight: .semibold)).foregroundColor(.gray)
                            Picker("Section", selection: $selectedSection) {
                                ForEach(sections, id: \.self) { sec in
                                    Text(sec).tag(sec)
                                }
                            }
                            .pickerStyle(.segmented)
                            .padding(.vertical, 2)
                        }
                        
                        // Password
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Create Password").font(.system(size: 11, weight: .semibold)).foregroundColor(.gray)
                            SecureField("••••••••", text: $password)
                                .foregroundColor(.black)
                                .accentColor(.black)
                                .padding(10)
                                .background(Color.white.opacity(0.9))
                                .cornerRadius(10)
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.sky.opacity(0.2), lineWidth: 1))
                        }
                        
                        if let error = errorMessage {
                            Text(error)
                                .font(.system(size: 12))
                                .foregroundColor(.red)
                        }
                        
                        // Register Button
                        Button(action: handleRegister) {
                            HStack {
                                if isLoading {
                                    ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Proceed to Photo Verification")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(.white)
                                    Image(systemName: "arrow.right")
                                        .foregroundColor(.white)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(
                                LinearGradient(colors: [Color.sky, Color.blue], startPoint: .leading, endPoint: .trailing)
                            )
                            .cornerRadius(24)
                            .shadow(color: Color.blue.opacity(0.3), radius: 6, y: 3)
                        }
                        .disabled(isLoading || !isPRNValid || !isEmailValid || firstName.isEmpty || lastName.isEmpty || password.isEmpty)
                        .opacity((!isPRNValid || !isEmailValid || firstName.isEmpty || lastName.isEmpty || password.isEmpty) ? 0.6 : 1.0)
                    }
                    .padding(20)
                    .background(Color.white.opacity(0.8))
                    .cornerRadius(20)
                    .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.sky.opacity(0.25), lineWidth: 1))
                    
                    Spacer()
                }
                .padding(.horizontal, 22)
            }
        }
        .navigationBarBackButtonHidden(true)
        .navigationDestination(isPresented: $navigateToPhoto) {
            if let student = registeredStudent {
                PhotoRegistrationView(student: student)
            }
        }
    }
    
    private func handleRegister() {
        guard isPRNValid && isEmailValid else { return }
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let response = try await APIService.shared.register(
                    firstName: firstName,
                    lastName: lastName,
                    rollNo: rollNo,
                    email: email,
                    password: password,
                    section: selectedSection,
                    semester: selectedSemester
                )
                await MainActor.run {
                    self.isLoading = false
                    if let student = response.student, let token = response.token {
                        self.registeredStudent = student
                        self.appState.saveSession(student: student, token: token)
                        self.navigateToPhoto = true
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
