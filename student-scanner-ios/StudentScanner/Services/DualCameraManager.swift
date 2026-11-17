import Foundation
import AVFoundation
import Vision
import UIKit
import Combine

class DualCameraManager: NSObject, ObservableObject, AVCaptureMetadataOutputObjectsDelegate, AVCaptureVideoDataOutputSampleBufferDelegate {
    @Published var isMultiCamSupported: Bool = false
    @Published var isSessionRunning: Bool = false
    @Published var detectedQRToken: String?
    @Published var isFaceDetected: Bool = false
    @Published var isCapturing: Bool = false
    
    // Captured images for verification
    @Published var latestBackSnapshot: UIImage?
    @Published var latestFrontSnapshot: UIImage?
    
    // AVCapture Sessions
    var multiCamSession: AVCaptureMultiCamSession?
    var singleCamSession: AVCaptureSession?
    
    // Preview Layers (Published so SwiftUI updates CameraPreviewView when initialized)
    @Published var backPreviewLayer: AVCaptureVideoPreviewLayer?
    @Published var frontPreviewLayer: AVCaptureVideoPreviewLayer?
    
    private let sessionQueue = DispatchQueue(label: "DualCameraSessionQueue")
    private let faceSequenceHandler = VNSequenceRequestHandler()
    private var isAnalyzingFace = false
    
    override init() {
        super.init()
        self.isMultiCamSupported = AVCaptureMultiCamSession.isMultiCamSupported
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
    
    // MARK: - Native Multi-Cam Session (Simultaneous Front + Back)
    private func setupMultiCamSession() {
        let session = AVCaptureMultiCamSession()
        session.beginConfiguration()
        
        // 1. Setup Back Camera (QR Code scanner)
        guard let backDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let backInput = try? AVCaptureDeviceInput(device: backDevice) else {
            session.commitConfiguration()
            return
        }
        
        guard session.canAddInput(backInput) else {
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
        
        // Back Metadata Output (QR Code reader)
        let metadataOutput = AVCaptureMetadataOutput()
        if session.canAddOutput(metadataOutput) {
            session.addOutputWithNoConnections(metadataOutput)
            let qrConnection = AVCaptureConnection(inputPorts: [backVideoPort], output: metadataOutput)
            if session.canAddConnection(qrConnection) {
                session.addConnection(qrConnection)
                metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
                metadataOutput.metadataObjectTypes = [.qr]
            }
        }
        
        // 2. Setup Front Camera (Live Face Verification)
        guard let frontDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let frontInput = try? AVCaptureDeviceInput(device: frontDevice) else {
            session.commitConfiguration()
            return
        }
        
        guard session.canAddInput(frontInput) else {
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
        
        // Front Video Data Output (Face detection analysis)
        let frontDataOutput = AVCaptureVideoDataOutput()
        if session.canAddOutput(frontDataOutput) {
            session.addOutputWithNoConnections(frontDataOutput)
            let frontDataConnection = AVCaptureConnection(inputPorts: [frontVideoPort], output: frontDataOutput)
            if session.canAddConnection(frontDataConnection) {
                session.addConnection(frontDataConnection)
                frontDataOutput.setSampleBufferDelegate(self, queue: DispatchQueue(label: "FaceAnalysisQueue"))
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
    
    // MARK: - Fallback Single-Cam Session
    private func setupSingleCamFallbackSession() {
        let session = AVCaptureSession()
        session.beginConfiguration()
        
        guard let backDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let backInput = try? AVCaptureDeviceInput(device: backDevice) else {
            session.commitConfiguration()
            return
        }
        
        if session.canAddInput(backInput) {
            session.addInput(backInput)
        }
        
        let backLayer = AVCaptureVideoPreviewLayer(session: session)
        backLayer.videoGravity = .resizeAspectFill
        
        let metadataOutput = AVCaptureMetadataOutput()
        if session.canAddOutput(metadataOutput) {
            session.addOutput(metadataOutput)
            metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            metadataOutput.metadataObjectTypes = [.qr]
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
    
    // MARK: - QR Code Delegate
    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard let metadata = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              metadata.type == .qr,
              let rawString = metadata.stringValue else {
            return
        }
        
        var token = rawString.trimmingCharacters(in: .whitespacesAndNewlines)
        if token.contains("/scan/") {
            token = token.components(separatedBy: "/scan/").last?.components(separatedBy: "?").first ?? token
        }
        
        if self.detectedQRToken != token {
            self.detectedQRToken = token
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
    }
    
    // MARK: - Video Sample Buffer Delegate (Apple Vision Face Detection)
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard !isAnalyzingFace, let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        isAnalyzingFace = true
        
        let request = VNDetectFaceRectanglesRequest { [weak self] req, err in
            defer { self?.isAnalyzingFace = false }
            guard let results = req.results as? [VNFaceObservation], !results.isEmpty else {
                DispatchQueue.main.async {
                    self?.isFaceDetected = false
                }
                return
            }
            
            DispatchQueue.main.async {
                self?.isFaceDetected = true
            }
        }
        
        do {
            try faceSequenceHandler.perform([request], on: pixelBuffer, orientation: .leftMirrored)
        } catch {
            isAnalyzingFace = false
        }
    }
}
