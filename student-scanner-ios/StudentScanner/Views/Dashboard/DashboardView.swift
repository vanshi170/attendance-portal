import SwiftUI
import PhotosUI
import UniformTypeIdentifiers

struct DashboardView: View {
    @EnvironmentObject var appState: AppState
    
    @State private var attendanceStats: AttendanceStats?
    @State private var recentLogs: [AttendanceLog] = []
    @State private var isLoading = true
    @State private var showScanner = false
    @State private var showTimetableDetail = false
    
    // File / Photo pickers for timetable
    @State private var showFilePicker = false
    @State private var showPhotoPicker = false
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var isUploadingTimetable = false
    @State private var timetableUploadError: String?
    
    var student: Student? {
        appState.currentStudent
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                LivingBackground()
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Top Bar: Profile & Logout
                        HStack(spacing: 12) {
                            // Avatar
                            if let photoUrl = student?.photoUrl, let url = URL(string: photoUrl) {
                                AsyncImage(url: url) { phase in
                                    if let img = phase.image {
                                        img.resizable().scaledToFill()
                                    } else {
                                        Circle().fill(Color.sky.opacity(0.3))
                                    }
                                }
                                .frame(width: 44, height: 44)
                                .clipShape(Circle())
                                .overlay(Circle().stroke(Color.sky, lineWidth: 1.5))
                            } else {
                                ZStack {
                                    Circle().fill(Color.sky.opacity(0.2))
                                    Image(systemName: "person.fill")
                                        .foregroundColor(Color.blue)
                                }
                                .frame(width: 44, height: 44)
                            }
                            
                            VStack(alignment: .leading, spacing: 2) {
                                HStack(spacing: 6) {
                                    Text(student?.name ?? "Student")
                                        .font(.system(size: 17, weight: .bold, design: .rounded))
                                        .foregroundColor(Color(red: 0.08, green: 0.18, blue: 0.32))
                                    
                                    if let sec = student?.section {
                                        Text(sec)
                                            .font(.system(size: 10, weight: .bold))
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.blue.opacity(0.1))
                                            .foregroundColor(.blue)
                                            .cornerRadius(6)
                                    }
                                }
                                
                                Text("PRN: \(student?.rollNo ?? "---")")
                                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                                    .foregroundColor(.gray)
                            }
                            
                            Spacer()
                            
                            Button(action: { appState.logout() }) {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.gray)
                                    .padding(8)
                                    .background(Color.white.opacity(0.8))
                                    .clipShape(Circle())
                            }
                        }
                        .padding(.top, 20)
                        
                        // Attendance Summary Card
                        VStack(alignment: .leading, spacing: 14) {
                            HStack {
                                Text("Overall Attendance")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.35))
                                Spacer()
                                StatusBadgeView(stats: attendanceStats)
                            }
                            
                            HStack(alignment: .lastTextBaseline, spacing: 6) {
                                Text(attendancePercentageText)
                                    .font(.system(size: 40, weight: .bold, design: .rounded))
                                    .foregroundColor(Color(red: 0.05, green: 0.15, blue: 0.3))
                                
                                Text("overall")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(.gray)
                                
                                Spacer()
                                
                                VStack(alignment: .trailing, spacing: 2) {
                                    Text("\(attendanceStats?.attendedClasses ?? 0) / \(attendanceStats?.totalClasses ?? 0)")
                                        .font(.system(size: 18, weight: .bold, design: .monospaced))
                                        .foregroundColor(Color(red: 0.08, green: 0.18, blue: 0.32))
                                    Text("Classes Attended")
                                        .font(.system(size: 11))
                                        .foregroundColor(.gray)
                                }
                            }
                            
                            // Visual Progress Bar
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 6)
                                        .fill(Color.sky.opacity(0.15))
                                        .frame(height: 8)
                                    
                                    RoundedRectangle(cornerRadius: 6)
                                        .fill(
                                            LinearGradient(
                                                colors: [Color.sky, Color.blue],
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            )
                                        )
                                        .frame(width: max(0, min(geo.size.width, geo.size.width * CGFloat((attendanceStats?.percentage ?? 0) / 100.0))), height: 8)
                                }
                            }
                            .frame(height: 8)
                        }
                        .padding(20)
                        .background(Color.white.opacity(0.85))
                        .cornerRadius(22)
                        .overlay(
                            RoundedRectangle(cornerRadius: 22)
                                .stroke(Color.sky.opacity(0.2), lineWidth: 1)
                        )
                        .shadow(color: Color.blue.opacity(0.06), radius: 12, y: 6)
                        
                        // Landscape Timetable Card (16:9 Aspect Ratio)
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                HStack(spacing: 6) {
                                    Image(systemName: "calendar")
                                        .foregroundColor(Color.blue)
                                        .font(.system(size: 14))
                                    Text("Class Timetable")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(Color(red: 0.1, green: 0.2, blue: 0.35))
                                }
                                
                                Spacer()
                                
                                // Menu accepting BOTH PDF and Photos
                                Menu {
                                    Button(action: { showFilePicker = true }) {
                                        Label("Choose PDF from Files", systemImage: "doc.fill")
                                    }
                                    
                                    Button(action: { showPhotoPicker = true }) {
                                        Label("Choose Image from Photos", systemImage: "photo.fill")
                                    }
                                } label: {
                                    HStack(spacing: 4) {
                                        Image(systemName: student?.timetableUrl == nil ? "plus" : "arrow.triangle.2.circlepath")
                                            .font(.system(size: 11, weight: .bold))
                                        Text(student?.timetableUrl == nil ? "Upload" : "Update")
                                            .font(.system(size: 11, weight: .semibold))
                                    }
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                                    .background(Color.blue.opacity(0.1))
                                    .foregroundColor(.blue)
                                    .cornerRadius(12)
                                }
                            }
                            
                            // Landscape container (16:9 aspect ratio) - fits PDF and Image without zoom
                            ZStack {
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color.white)
                                    .aspectRatio(16/9, contentMode: .fit)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(Color.sky.opacity(0.25), lineWidth: 1)
                                    )
                                
                                if let timetableUrl = student?.timetableUrl, !timetableUrl.isEmpty {
                                    Button(action: { showTimetableDetail = true }) {
                                        TimetableThumbnailView(urlString: timetableUrl)
                                            .cornerRadius(16)
                                            .clipped()
                                    }
                                    .overlay(
                                        VStack {
                                            Spacer()
                                            HStack {
                                                Spacer()
                                                HStack(spacing: 4) {
                                                    Image(systemName: "arrow.up.left.and.arrow.down.right")
                                                    Text("Tap for Full Screen")
                                                }
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundColor(.white)
                                                .padding(.horizontal, 8)
                                                .padding(.vertical, 4)
                                                .background(Color.black.opacity(0.65))
                                                .cornerRadius(8)
                                                .padding(8)
                                            }
                                        }
                                    )
                                } else {
                                    // Empty state placeholder
                                    VStack(spacing: 8) {
                                        Image(systemName: "doc.text.image")
                                            .font(.system(size: 28))
                                            .foregroundColor(Color.sky.opacity(0.7))
                                        Text("No Timetable Uploaded")
                                            .font(.system(size: 13, weight: .semibold))
                                            .foregroundColor(Color(red: 0.15, green: 0.25, blue: 0.4))
                                        Text("Accepts PDF or Image (16:9 landscape recommended)")
                                            .font(.system(size: 11))
                                            .foregroundColor(.gray)
                                    }
                                }
                                
                                // Uploading indicator
                                if isUploadingTimetable {
                                    ZStack {
                                        Color.black.opacity(0.4).cornerRadius(16)
                                        VStack(spacing: 8) {
                                            ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                                            Text("Uploading timetable...")
                                                .font(.system(size: 12, weight: .semibold))
                                                .foregroundColor(.white)
                                        }
                                    }
                                }
                            }
                            
                            if let err = timetableUploadError {
                                Text(err)
                                    .font(.system(size: 11))
                                    .foregroundColor(.red)
                            }
                        }
                        .padding(18)
                        .background(Color.white.opacity(0.85))
                        .cornerRadius(22)
                        .overlay(
                            RoundedRectangle(cornerRadius: 22)
                                .stroke(Color.sky.opacity(0.2), lineWidth: 1)
                        )
                        .shadow(color: Color.blue.opacity(0.06), radius: 12, y: 6)
                        
                        // UPI-Style QR Scanner Button
                        Button(action: { showScanner = true }) {
                            HStack(spacing: 12) {
                                ZStack {
                                    Circle()
                                        .fill(Color.white.opacity(0.25))
                                        .frame(width: 44, height: 44)
                                    Image(systemName: "qrcode.viewfinder")
                                        .font(.system(size: 22, weight: .bold))
                                        .foregroundColor(.white)
                                }
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Scan Attendance QR")
                                        .font(.system(size: 17, weight: .bold, design: .rounded))
                                        .foregroundColor(.white)
                                    Text("Simultaneous Front & Back Camera Verification")
                                        .font(.system(size: 11))
                                        .foregroundColor(.white.opacity(0.85))
                                }
                                
                                Spacer()
                                
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white.opacity(0.8))
                            }
                            .padding(.horizontal, 18)
                            .frame(height: 72)
                            .background(
                                LinearGradient(
                                    colors: [Color.sky, Color.blue, Color(red: 0.1, green: 0.35, blue: 0.85)],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(24)
                            .shadow(color: Color.blue.opacity(0.35), radius: 14, y: 8)
                        }
                        .padding(.top, 6)
                        
                        Spacer()
                    }
                    .padding(.horizontal, 22)
                }
            }
            .onAppear(perform: loadDashboardData)
            .fullScreenCover(isPresented: $showScanner, onDismiss: loadDashboardData) {
                DualCameraScannerView()
            }
            .sheet(isPresented: $showTimetableDetail) {
                if let url = student?.timetableUrl {
                    TimetableDetailView(urlString: url)
                }
            }
            .photosPicker(isPresented: $showPhotoPicker, selection: $selectedPhotoItem, matching: .images)
            .onChange(of: selectedPhotoItem) { newItem in
                handlePhotoSelection(item: newItem)
            }
            .fileImporter(
                isPresented: $showFilePicker,
                allowedContentTypes: [.pdf, .image, .jpeg, .png],
                allowsMultipleSelection: false
            ) { result in
                handleFileSelection(result: result)
            }
        }
    }
    
    private var attendancePercentageText: String {
        guard let stats = attendanceStats, stats.totalClasses > 0 else {
            return "0%"
        }
        return String(format: "%.0f%%", stats.percentage)
    }
    
    private func loadDashboardData() {
        guard let s = student else { return }
        isLoading = true
        
        Task {
            do {
                let response = try await APIService.shared.fetchDashboard(studentId: s.id)
                await MainActor.run {
                    self.attendanceStats = response.attendance
                    self.recentLogs = response.recentLogs ?? []
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.attendanceStats = AttendanceStats(totalClasses: 0, attendedClasses: 0, percentage: 0.0)
                    self.isLoading = false
                }
            }
        }
    }
    
    // MARK: - Handle PDF/Image File Selection from Files App
    private func handleFileSelection(result: Result<[URL], Error>) {
        guard let currentStudent = student else { return }
        switch result {
        case .success(let urls):
            guard let fileURL = urls.first else { return }
            
            // Security scoped resource access for iOS Files
            let canAccess = fileURL.startAccessingSecurityScopedResource()
            defer {
                if canAccess { fileURL.stopAccessingSecurityScopedResource() }
            }
            
            do {
                let data = try Data(contentsOf: fileURL)
                let isPDF = fileURL.pathExtension.lowercased() == "pdf"
                let mimeType = isPDF ? "application/pdf" : "image/jpeg"
                uploadTimetableData(data: data, mimeType: mimeType, student: currentStudent)
            } catch {
                self.timetableUploadError = "Failed to read selected file"
            }
            
        case .failure(let err):
            self.timetableUploadError = err.localizedDescription
        }
    }
    
    // MARK: - Handle Image Selection from Photos Library
    private func handlePhotoSelection(item: PhotosPickerItem?) {
        guard let item = item, let currentStudent = student else { return }
        
        Task {
            if let data = try? await item.loadTransferable(type: Data.self) {
                uploadTimetableData(data: data, mimeType: "image/jpeg", student: currentStudent)
            }
        }
    }
    
    private func uploadTimetableData(data: Data, mimeType: String, student: Student) {
        isUploadingTimetable = true
        timetableUploadError = nil
        
        Task {
            do {
                let timetableUrl = try await APIService.shared.uploadTimetable(
                    studentId: student.id,
                    rollNo: student.rollNo,
                    fileData: data,
                    mimeType: mimeType
                )
                
                await MainActor.run {
                    var updated = student
                    updated.timetableUrl = timetableUrl
                    self.appState.updateStudent(student: updated)
                    self.isUploadingTimetable = false
                }
            } catch {
                await MainActor.run {
                    self.timetableUploadError = error.localizedDescription
                    self.isUploadingTimetable = false
                }
            }
        }
    }
}

struct StatusBadgeView: View {
    let stats: AttendanceStats?
    
    var body: some View {
        if let s = stats, s.totalClasses > 0 {
            if s.percentage >= 75.0 {
                Text("Good Standing")
                    .font(.system(size: 11, weight: .bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.green.opacity(0.12))
                    .foregroundColor(.green)
                    .cornerRadius(8)
            } else {
                Text("Shortage (<75%)")
                    .font(.system(size: 11, weight: .bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.red.opacity(0.12))
                    .foregroundColor(.red)
                    .cornerRadius(8)
            }
        } else {
            Text("No Sessions Yet (0/0)")
                .font(.system(size: 11, weight: .bold))
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Color.gray.opacity(0.12))
                .foregroundColor(.gray)
                .cornerRadius(8)
        }
    }
}
