import SwiftUI
import AVFoundation

struct PhotoRegistrationView: View {
    let student: Student
    @EnvironmentObject var appState: AppState
    
    @StateObject private var cameraManager = SingleFrontCameraManager()
    @State private var capturedImage: UIImage?
    @State private var isUploading = false
    @State private var errorMessage: String?
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            if let image = capturedImage {
                // Confirmation screen with preview
                VStack(spacing: 24) {
                    Text("Verify Passport Photo")
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .padding(.top, 40)
                    
                    Text("This photo is permanently locked to your PRN (\(student.rollNo)) for biometric attendance verification.")
                        .font(.system(size: 13))
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 30)
                    
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 240, height: 320)
                        .clipShape(RoundedRectangle(cornerRadius: 24))
                        .overlay(
                            RoundedRectangle(cornerRadius: 24)
                                .stroke(Color.sky, lineWidth: 3)
                        )
                        .shadow(color: Color.sky.opacity(0.4), radius: 20)
                    
                    if let err = errorMessage {
                        Text(err)
                            .font(.system(size: 12))
                            .foregroundColor(.red)
                    }
                    
                    HStack(spacing: 20) {
                        Button(action: { capturedImage = nil }) {
                            Text("Retake")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.white)
                                .frame(width: 120, height: 48)
                                .background(Color.white.opacity(0.2))
                                .cornerRadius(24)
                        }
                        
                        Button(action: handleUpload) {
                            HStack {
                                if isUploading {
                                    ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Confirm Photo")
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundColor(.white)
                                }
                            }
                            .frame(width: 160, height: 48)
                            .background(
                                LinearGradient(colors: [Color.sky, Color.blue], startPoint: .leading, endPoint: .trailing)
                            )
                            .cornerRadius(24)
                        }
                        .disabled(isUploading)
                    }
                    .padding(.top, 10)
                    
                    Spacer()
                }
            } else {
                // Live camera with passport alignment guide
                ZStack {
                    CameraPreviewView(previewLayer: cameraManager.previewLayer)
                        .ignoresSafeArea()
                    
                    // Semi-transparent cutout mask for passport portrait alignment
                    PassportGuideOverlay()
                    
                    // Instructions & Capture button
                    VStack {
                        VStack(spacing: 6) {
                            Text("Passport Photo Capture")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(.white)
                            Text("Align your face inside the oval guide")
                                .font(.system(size: 13))
                                .foregroundColor(.white.opacity(0.85))
                        }
                        .padding(.top, 50)
                        
                        Spacer()
                        
                        Button(action: {
                            cameraManager.capturePhoto { img in
                                self.capturedImage = img
                            }
                        }) {
                            ZStack {
                                Circle()
                                    .fill(Color.white.opacity(0.25))
                                    .frame(width: 80, height: 80)
                                Circle()
                                    .fill(Color.white)
                                    .frame(width: 66, height: 66)
                            }
                        }
                        .padding(.bottom, 50)
                    }
                }
            }
        }
        .onAppear {
            cameraManager.start()
        }
        .onDisappear {
            cameraManager.stop()
        }
        .navigationBarBackButtonHidden(true)
    }
    
    private func handleUpload() {
        guard let img = capturedImage else { return }
        isUploading = true
        errorMessage = nil
        
        Task {
            do {
                let photoUrl = try await APIService.shared.uploadPhoto(studentId: student.id, image: img)
                await MainActor.run {
                    var updated = student
                    updated.photoUrl = photoUrl
                    self.appState.updateStudent(student: updated)
                    self.isUploading = false
                }
            } catch {
                await MainActor.run {
                    self.isUploading = false
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }
}

// Visual cutout oval for passport alignment
struct PassportGuideOverlay: View {
    var body: some View {
        GeometryReader { geo in
            ZStack {
                Color.black.opacity(0.55)
                    .mask(
                        Rectangle()
                            .fill(style: FillStyle(eoFill: true))
                            .overlay(
                                RoundedRectangle(cornerRadius: 110)
                                    .frame(width: geo.size.width * 0.65, height: geo.size.width * 0.95)
                                    .blendMode(.destinationOut)
                            )
                    )
                
                RoundedRectangle(cornerRadius: 110)
                    .stroke(Color.sky, lineWidth: 3)
                    .frame(width: geo.size.width * 0.65, height: geo.size.width * 0.95)
                    .shadow(color: Color.sky.opacity(0.5), radius: 10)
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}

// Single front camera manager for photo onboarding
class SingleFrontCameraManager: NSObject, ObservableObject, AVCapturePhotoCaptureDelegate {
    let session = AVCaptureSession()
    var previewLayer: AVCaptureVideoPreviewLayer?
    private let photoOutput = AVCapturePhotoOutput()
    private var captureCompletion: ((UIImage) -> Void)?
    
    override init() {
        super.init()
        setup()
    }
    
    private func setup() {
        session.beginConfiguration()
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input),
              session.canAddOutput(photoOutput) else {
            session.commitConfiguration()
            return
        }
        
        session.addInput(input)
        session.addOutput(photoOutput)
        
        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        self.previewLayer = layer
        session.commitConfiguration()
    }
    
    func start() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.startRunning()
        }
    }
    
    func stop() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.stopRunning()
        }
    }
    
    func capturePhoto(completion: @escaping (UIImage) -> Void) {
        self.captureCompletion = completion
        let settings = AVCapturePhotoSettings()
        photoOutput.capturePhoto(with: settings, delegate: self)
    }
    
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let data = photo.fileDataRepresentation(), let image = UIImage(data: data) else { return }
        // Un-mirror front camera photo so the passport picture is not inverted horizontally
        let unmirrored = image.unmirroredPassport()
        DispatchQueue.main.async {
            self.captureCompletion?(unmirrored)
        }
    }
}

extension UIImage {
    func unmirroredPassport() -> UIImage {
        UIGraphicsBeginImageContextWithOptions(size, false, scale)
        guard let context = UIGraphicsGetCurrentContext() else { return self }
        context.translateBy(x: size.width, y: 0)
        context.scaleBy(x: -1.0, y: 1.0)
        draw(in: CGRect(origin: .zero, size: size))
        let flipped = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        return flipped ?? self
    }
}
