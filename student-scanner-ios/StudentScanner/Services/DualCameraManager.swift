import Foundation
import AVFoundation
import Vision
import UIKit
import Combine

class DualCameraManager: NSObject, ObservableObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    @Published var isMultiCamSupported: Bool = false
    @Published var isSessionRunning: Bool = false
    
    // QR Code Scanning (Powered by Apple Vision)
    @Published var detectedQRToken: String?
    
    // Face Detection & Biometric Verification
    @Published var isFaceDetected: Bool = false
    @Published var isFaceMatched: Bool = false
    @Published var faceMatchDistance: Float = 1.0
    
    // Preview Layers
    @Published var backPreviewLayer: AVCaptureVideoPreviewLayer?
    @Published var frontPreviewLayer: AVCaptureVideoPreviewLayer?
    
    // AVCapture Sessions & Outputs
    var multiCamSession: AVCaptureMultiCamSession?
    var singleCamSession: AVCaptureSession?
    private var backDataOutput: AVCaptureVideoDataOutput?
    private var frontDataOutput: AVCaptureVideoDataOutput?
    
    private let sessionQueue = DispatchQueue(label: "DualCameraSessionQueue")
    private let backVisionQueue = DispatchQueue(label: "BackVisionQueue", qos: .userInitiated)
    private let frontVisionQueue = DispatchQueue(label: "FrontVisionQueue", qos: .userInitiated)
    
    // Profile photo baseline for biometric comparison
    private var baselineProfileFeaturePrint: VNFeaturePrintObservation?
    private var isAnalyzingQR = false
    private var isAnalyzingFace = false
    
    override init() {
        super.init()
        self.isMultiCamSupported = AVCaptureMultiCamSession.isMultiCamSupported
    }
    
    // MARK: - Baseline Profile Photo Registration for Biometric Anti-Proxy Match
    func setBaselineProfilePhoto(_ image: UIImage) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let cgImage = image.cgImage else { return }
            let request = VNGenerateImageFeaturePrintRequest()
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
                if let printObs = request.results?.first as? VNFeaturePrintObservation {
                    self?.baselineProfileFeaturePrint = printObs
                }
            } catch {
                print("Failed to generate baseline profile print: \(error.localizedDescription)")
            }
        }
    }
    
    func checkPermissionsAndStart() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            self.setupAndStartSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                if granted {
                    self?.setupAndStartSession()
                }
            }
        default:
            print("Camera access denied")
        }
    }
    
    private func setupAndStartSession() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            
            if AVCaptureMultiCamSession.isMultiCamSupported {
                self.setupMultiCamSession()
            } else {
                self.setupSingleCamFallbackSession()
            }
        }
    }
    
    // MARK: - True Simultaneous Dual Camera Session
    private func setupMultiCamSession() {
        let session = AVCaptureMultiCamSession()
        session.beginConfiguration()
        
        // -------------------------------------------------------------
        // 1. BACK CAMERA: QR Code Scanning via Vision VideoDataOutput
        // -------------------------------------------------------------
        guard let backDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let backInput = try? AVCaptureDeviceInput(device: backDevice),
              session.canAddInput(backInput) else {
            session.commitConfiguration()
            return
        }
        session.addInputWithNoConnections(backInput)
        
        guard let backVideoPort = backInput.ports(for: .video, sourceDeviceType: backDevice.deviceType, sourceDevicePosition: .back).first else {
            session.commitConfiguration()
            return
        }
        
        // Back Preview Layer
        let backLayer = AVCaptureVideoPreviewLayer(sessionWithNoConnection: session)
        backLayer.videoGravity = .resizeAspectFill
        let backConnection = AVCaptureConnection(inputPort: backVideoPort, videoPreviewLayer: backLayer)
        if session.canAddConnection(backConnection) {
            session.addConnection(backConnection)
        }
        
        // Back VideoDataOutput (Apple Vision Barcode Pipeline)
        let bOutput = AVCaptureVideoDataOutput()
        bOutput.alwaysDiscardsLateVideoFrames = true
        bOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA)]
        if session.canAddOutput(bOutput) {
            session.addOutputWithNoConnections(bOutput)
            let bConn = AVCaptureConnection(inputPorts: [backVideoPort], output: bOutput)
            if session.canAddConnection(bConn) {
                bConn.videoOrientation = .portrait
                session.addConnection(bConn)
                bOutput.setSampleBufferDelegate(self, queue: backVisionQueue)
                self.backDataOutput = bOutput
            }
        }
        
        // -------------------------------------------------------------
        // 2. FRONT CAMERA: Live Face Verification via Vision VideoDataOutput
        // -------------------------------------------------------------
        guard let frontDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let frontInput = try? AVCaptureDeviceInput(device: frontDevice),
              session.canAddInput(frontInput) else {
            session.commitConfiguration()
            return
        }
        session.addInputWithNoConnections(frontInput)
        
        guard let frontVideoPort = frontInput.ports(for: .video, sourceDeviceType: frontDevice.deviceType, sourceDevicePosition: .front).first else {
            session.commitConfiguration()
            return
        }
        
        // Front Preview Layer
        let frontLayer = AVCaptureVideoPreviewLayer(sessionWithNoConnection: session)
        frontLayer.videoGravity = .resizeAspectFill
        let frontConnection = AVCaptureConnection(inputPort: frontVideoPort, videoPreviewLayer: frontLayer)
        if session.canAddConnection(frontConnection) {
            session.addConnection(frontConnection)
        }
        
        // Front VideoDataOutput (Apple Vision Face Biometric Pipeline)
        let fOutput = AVCaptureVideoDataOutput()
        fOutput.alwaysDiscardsLateVideoFrames = true
        fOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA)]
        if session.canAddOutput(fOutput) {
            session.addOutputWithNoConnections(fOutput)
            let fConn = AVCaptureConnection(inputPorts: [frontVideoPort], output: fOutput)
            if session.canAddConnection(fConn) {
                fConn.videoOrientation = .portrait
                fConn.isVideoMirrored = true // Natural mirror orientation for face tracking
                session.addConnection(fConn)
                fOutput.setSampleBufferDelegate(self, queue: frontVisionQueue)
                self.frontDataOutput = fOutput
            }
        }
        
        session.commitConfiguration()
        session.startRunning()
        
        DispatchQueue.main.async {
            self.backPreviewLayer = backLayer
            self.frontPreviewLayer = frontLayer
            self.multiCamSession = session
            self.isSessionRunning = session.isRunning
        }
    }
    
    // MARK: - Single Camera Fallback Session
    private func setupSingleCamFallbackSession() {
        let session = AVCaptureSession()
        session.beginConfiguration()
        
        guard let backDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let backInput = try? AVCaptureDeviceInput(device: backDevice),
              session.canAddInput(backInput) else {
            session.commitConfiguration()
            return
        }
        session.addInput(backInput)
        
        let backLayer = AVCaptureVideoPreviewLayer(session: session)
        backLayer.videoGravity = .resizeAspectFill
        
        let bOutput = AVCaptureVideoDataOutput()
        bOutput.alwaysDiscardsLateVideoFrames = true
        bOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA)]
        if session.canAddOutput(bOutput) {
            session.addOutput(bOutput)
            bOutput.setSampleBufferDelegate(self, queue: backVisionQueue)
            self.backDataOutput = bOutput
        }
        
        session.commitConfiguration()
        session.startRunning()
        
        DispatchQueue.main.async {
            self.backPreviewLayer = backLayer
            self.singleCamSession = session
            self.isSessionRunning = session.isRunning
        }
    }
    
    func stopSession() {
        sessionQueue.async { [weak self] in
            self?.multiCamSession?.stopRunning()
            self?.singleCamSession?.stopRunning()
            DispatchQueue.main.async {
                self?.isSessionRunning = false
            }
        }
    }
    
    // MARK: - AVCaptureVideoDataOutput Delegate (Apple Vision Processing)
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        
        // -------------------------------------------------------------
        // A. BACK CAMERA STREAM: Detect QR Code with Apple Vision
        // -------------------------------------------------------------
        if output === backDataOutput {
            guard !isAnalyzingQR else { return }
            isAnalyzingQR = true
            
            let barcodeRequest = VNDetectBarcodesRequest { [weak self] request, error in
                defer { self?.isAnalyzingQR = false }
                guard let results = request.results as? [VNBarcodeObservation] else { return }
                
                for barcode in results {
                    if barcode.symbology == .qr, let rawValue = barcode.payloadStringValue {
                        var token = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
                        if token.contains("/scan/") {
                            token = token.components(separatedBy: "/scan/").last?.components(separatedBy: "?").first ?? token
                        }
                        
                        DispatchQueue.main.async {
                            if self?.detectedQRToken != token {
                                self?.detectedQRToken = token
                                UINotificationFeedbackGenerator().notificationOccurred(.success)
                            }
                        }
                        break
                    }
                }
            }
            barcodeRequest.symbologies = [.qr]
            
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .up, options: [:])
            try? handler.perform([barcodeRequest])
            return
        }
        
        // -------------------------------------------------------------
        // B. FRONT CAMERA STREAM: Detect Face & Match with Profile Photo
        // -------------------------------------------------------------
        if output === frontDataOutput {
            guard !isAnalyzingFace else { return }
            isAnalyzingFace = true
            
            // 1. Detect Face Rectangle
            let faceRequest = VNDetectFaceRectanglesRequest { [weak self] req, err in
                defer { self?.isAnalyzingFace = false }
                guard let self = self else { return }
                
                guard let faces = req.results as? [VNFaceObservation], !faces.isEmpty else {
                    DispatchQueue.main.async {
                        self.isFaceDetected = false
                        self.isFaceMatched = false
                    }
                    return
                }
                
                DispatchQueue.main.async {
                    self.isFaceDetected = true
                }
                
                // 2. Perform Biometric Verification against Baseline Profile Photo
                if let baselinePrint = self.baselineProfileFeaturePrint {
                    let featurePrintRequest = VNGenerateImageFeaturePrintRequest()
                    let faceHandler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .up, options: [:])
                    do {
                        try faceHandler.perform([featurePrintRequest])
                        if let livePrint = featurePrintRequest.results?.first as? VNFeaturePrintObservation {
                            var distance: Float = 1.0
                            try baselinePrint.computeDistance(&distance, to: livePrint)
                            
                            // Distance < 0.65 indicates positive identity match
                            let matched = distance < 0.65
                            DispatchQueue.main.async {
                                self.faceMatchDistance = distance
                                self.isFaceMatched = matched
                            }
                        }
                    } catch {
                        print("Biometric face match error: \(error.localizedDescription)")
                    }
                } else {
                    // If no baseline photo is registered yet, detection alone passes
                    DispatchQueue.main.async {
                        self.isFaceMatched = true
                    }
                }
            }
            
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .up, options: [:])
            try? handler.perform([faceRequest])
        }
    }
}
