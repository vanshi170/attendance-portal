import SwiftUI
import AVFoundation

struct CameraPreviewView: UIViewRepresentable {
    let previewLayer: AVCaptureVideoPreviewLayer?
    
    func makeUIView(context: Context) -> PreviewContainerUIView {
        let view = PreviewContainerUIView()
        view.backgroundColor = .black
        view.setPreviewLayer(previewLayer)
        return view
    }
    
    func updateUIView(_ uiView: PreviewContainerUIView, context: Context) {
        uiView.setPreviewLayer(previewLayer)
    }
}

class PreviewContainerUIView: UIView {
    private var currentLayer: AVCaptureVideoPreviewLayer?
    
    func setPreviewLayer(_ layer: AVCaptureVideoPreviewLayer?) {
        guard currentLayer !== layer else {
            layer?.frame = bounds
            return
        }
        
        currentLayer?.removeFromSuperlayer()
        currentLayer = layer
        
        if let layer = layer {
            layer.videoGravity = .resizeAspectFill
            self.layer.addSublayer(layer)
            layer.frame = bounds
        }
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        currentLayer?.frame = bounds
    }
}
