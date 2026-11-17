import SwiftUI
import AVFoundation

struct DualCameraScannerView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppState
    
    @StateObject private var cameraManager = DualCameraManager()
    @StateObject private var locationManager = LocationManager.shared
    @StateObject private var networkManager = NetworkManager.shared
    
    @State private var showDemoSettings = false
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    
    // Laser animation
    @State private var laserOffset: CGFloat = -100
    
    var isReadyToCapture: Bool {
        locationManager.isInsideGeofence &&
        networkManager.isWifiValid &&
        cameraManager.detectedQRToken != nil &&
        cameraManager.isFaceDetected &&
        cameraManager.isFaceMatched
    }
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 8) {
                // Top Header Bar
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.white.opacity(0.2))
                            .clipShape(Circle())
                    }
                    
                    Spacer()
                    
                    Text("Dual-Camera Scanner")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    Button(action: { showDemoSettings = true }) {
                        Image(systemName: "slider.horizontal.3")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.white.opacity(0.2))
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 10)
                
                // Conditions Status Bar
                HStack(spacing: 8) {
                    // Wi-Fi Status
                    HStack(spacing: 4) {
                        Image(systemName: networkManager.isWifiValid ? "wifi" : "wifi.slash")
                            .foregroundColor(networkManager.isWifiValid ? .green : .red)
                        Text(networkManager.currentSSID)
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.white)
                            .lineLimit(1)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.15))
                    .cornerRadius(12)
                    
                    // GPS Status
                    HStack(spacing: 4) {
                        Image(systemName: locationManager.isInsideGeofence ? "location.fill" : "location.slash.fill")
                            .foregroundColor(locationManager.isInsideGeofence ? .green : .red)
                        Text(locationManager.isInsideGeofence ? "In Zone (\(Int(locationManager.distanceToTargetMeters))m)" : "Out of Zone (\(Int(locationManager.distanceToTargetMeters))m)")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.15))
                    .cornerRadius(12)
                }
                .padding(.bottom, 2)
                
                // BOX 1 (Top): Back Camera for Board QR (Vision Barcode Output)
                ZStack {
                    CameraPreviewView(previewLayer: cameraManager.backPreviewLayer)
                        .cornerRadius(18)
                        .overlay(
                            RoundedRectangle(cornerRadius: 18)
                                .stroke(cameraManager.detectedQRToken != nil ? Color.green : Color.sky.opacity(0.5), lineWidth: 1.5)
                        )
                    
                    // QR Targeting Reticle
                    VStack {
                        Spacer()
                        ZStack {
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(cameraManager.detectedQRToken != nil ? Color.green : Color.white.opacity(0.7), lineWidth: 2)
                                .frame(width: 140, height: 140)
                            
                            // Laser scanline
                            Rectangle()
                                .fill(
                                    LinearGradient(
                                        colors: [Color.sky.opacity(0), cameraManager.detectedQRToken != nil ? Color.green : Color.sky, Color.sky.opacity(0)],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .frame(width: 136, height: 2)
                                .offset(y: laserOffset)
                        }
                        Spacer()
                    }
                    
                    // Overlay badges
                    VStack {
                        HStack {
                            HStack(spacing: 4) {
                                Circle().fill(cameraManager.detectedQRToken != nil ? Color.green : Color.yellow).frame(width: 6, height: 6)
                                Text("Back Lens: Board QR")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.black.opacity(0.6))
                            .cornerRadius(8)
                            
                            Spacer()
                            
                            if cameraManager.detectedQRToken != nil {
                                HStack(spacing: 4) {
                                    Image(systemName: "checkmark.circle.fill")
                                    Text("QR ACQUIRED")
                                }
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.green)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.black.opacity(0.75))
                                .cornerRadius(8)
                            } else {
                                Text("AIM AT BOARD QR")
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.8))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Color.black.opacity(0.6))
                                    .cornerRadius(8)
                            }
                        }
                        .padding(10)
                        
                        Spacer()
                    }
                }
                .frame(maxHeight: .infinity)
                .padding(.horizontal, 14)
                
                // BOX 2 (Bottom): Front Camera for Student Face Biometric Verification
                ZStack {
                    CameraPreviewView(previewLayer: cameraManager.frontPreviewLayer)
                        .cornerRadius(18)
                        .overlay(
                            RoundedRectangle(cornerRadius: 18)
                                .stroke(cameraManager.isFaceMatched ? Color.green : Color.sky.opacity(0.5), lineWidth: 1.5)
                        )
                    
                    // Face Oval Guide
                    ZStack {
                        RoundedRectangle(cornerRadius: 50)
                            .stroke(
                                cameraManager.isFaceMatched ? Color.green : (cameraManager.isFaceDetected ? Color.orange : Color.sky.opacity(0.8)),
                                lineWidth: 2
                            )
                            .frame(width: 100, height: 130)
                            .shadow(color: (cameraManager.isFaceMatched ? Color.green : Color.sky).opacity(0.4), radius: 8)
                    }
                    
                    // Overlay badges
                    VStack {
                        HStack {
                            HStack(spacing: 4) {
                                Circle().fill(cameraManager.isFaceMatched ? Color.green : Color.blue).frame(width: 6, height: 6)
                                Text("Front Lens: Identity")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.black.opacity(0.6))
                            .cornerRadius(8)
                            
                            Spacer()
                            
                            if cameraManager.isFaceMatched {
                                HStack(spacing: 4) {
                                    Image(systemName: "checkmark.shield.fill")
                                    Text("IDENTITY VERIFIED")
                                }
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.green)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.black.opacity(0.75))
                                .cornerRadius(8)
                            } else if cameraManager.isFaceDetected {
                                HStack(spacing: 4) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                    Text("CHECKING PROFILE...")
                                }
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.orange)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.black.opacity(0.75))
                                .cornerRadius(8)
                            } else {
                                Text("ALIGN FACE IN OVAL")
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.8))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Color.black.opacity(0.6))
                                    .cornerRadius(8)
                            }
                        }
                        .padding(10)
                        
                        Spacer()
                    }
                }
                .frame(maxHeight: .infinity)
                .padding(.horizontal, 14)
                
                // Error toast if any
                if let err = errorMessage {
                    Text(err)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.red)
                        .padding(.horizontal, 16)
                }
                
                // Single Capture Button Below Both Frames
                Button(action: handleCaptureAndVerify) {
                    HStack(spacing: 8) {
                        if isSubmitting {
                            ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: isReadyToCapture ? "checkmark.circle.fill" : "camera.fill")
                                .font(.system(size: 16))
                            Text(buttonLabel)
                                .font(.system(size: 15, weight: .bold, design: .rounded))
                        }
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(
                        LinearGradient(
                            colors: isReadyToCapture ? [Color.sky, Color.blue] : [Color.gray, Color.gray.opacity(0.8)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(26)
                    .shadow(color: isReadyToCapture ? Color.blue.opacity(0.4) : Color.clear, radius: 10, y: 5)
                }
                .disabled(!isReadyToCapture || isSubmitting)
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
            }
            
            // Success Overlay
            if let msg = successMessage {
                AttendanceSuccessView(message: msg) {
                    dismiss()
                }
            }
        }
        .onAppear {
            cameraManager.checkPermissionsAndStart()
            locationManager.requestPermission()
            
            // Load student profile photo for biometric anti-proxy matching
            if let photoUrl = appState.currentStudent?.photoUrl, !photoUrl.isEmpty {
                loadProfilePhoto(from: photoUrl)
            }
            
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                laserOffset = 60
            }
        }
        .onDisappear {
            cameraManager.stopSession()
        }
        .sheet(isPresented: $showDemoSettings) {
            DemoSettingsSheet(locationManager: locationManager, networkManager: networkManager)
        }
    }
    
    private var buttonLabel: String {
        if !networkManager.isWifiValid {
            return "Connect to Campus / Home Wi-Fi"
        }
        if !locationManager.isInsideGeofence {
            return "Move Inside Classroom Geofence"
        }
        if cameraManager.detectedQRToken == nil {
            return "Aim Back Camera at Board QR"
        }
        if !cameraManager.isFaceDetected {
            return "Align Face in Front Camera Oval"
        }
        if !cameraManager.isFaceMatched {
            return "Verifying Identity With Profile..."
        }
        return "Verify & Mark Attendance"
    }
    
    private func loadProfilePhoto(from photoUrl: String) {
        DispatchQueue.global(qos: .userInitiated).async {
            var loadedImage: UIImage?
            if photoUrl.hasPrefix("data:image"),
               let commaIndex = photoUrl.firstIndex(of: ","),
               let data = Data(base64Encoded: String(photoUrl[photoUrl.index(after: commaIndex)...])) {
                loadedImage = UIImage(data: data)
            } else if let url = URL(string: photoUrl), let data = try? Data(contentsOf: url) {
                loadedImage = UIImage(data: data)
            }
            
            if let img = loadedImage {
                cameraManager.setBaselineProfilePhoto(img)
            }
        }
    }
    
    private func handleCaptureAndVerify() {
        guard let token = cameraManager.detectedQRToken, let student = appState.currentStudent else { return }
        isSubmitting = true
        errorMessage = nil
        
        let lat = locationManager.userLocation?.coordinate.latitude
        let lng = locationManager.userLocation?.coordinate.longitude
        let wifi = networkManager.currentSSID
        
        Task {
            do {
                let response = try await APIService.shared.submitScan(
                    qrToken: token,
                    rollNo: student.rollNo,
                    name: student.name,
                    lat: lat,
                    lng: lng,
                    wifiSSID: wifi
                )
                
                await MainActor.run {
                    self.isSubmitting = false
                    self.successMessage = response.message ?? "Attendance marked successfully!"
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                }
            } catch {
                await MainActor.run {
                    self.isSubmitting = false
                    self.errorMessage = error.localizedDescription
                    UINotificationFeedbackGenerator().notificationOccurred(.error)
                }
            }
        }
    }
}
