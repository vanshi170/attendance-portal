import SwiftUI
import PDFKit

struct TimetableDetailView: View {
    let urlString: String
    @Environment(\.dismiss) var dismiss
    
    var isPDF: Bool {
        urlString.contains("application/pdf") || urlString.lowercased().contains(".pdf")
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()
                
                if isPDF {
                    PDFKitRepresentedView(urlString: urlString)
                        .ignoresSafeArea(edges: .bottom)
                } else {
                    if urlString.hasPrefix("data:image"),
                       let commaIndex = urlString.firstIndex(of: ","),
                       let data = Data(base64Encoded: String(urlString[urlString.index(after: commaIndex)...])),
                       let image = UIImage(data: data) {
                        ZoomableScrollView {
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFit()
                        }
                    } else if let url = URL(string: urlString) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                ZoomableScrollView {
                                    image
                                        .resizable()
                                        .scaledToFit()
                                }
                            case .failure:
                                Text("Failed to load timetable image")
                                    .foregroundColor(.white)
                            default:
                                ProgressView().tint(.white)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Class Timetable")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(.white)
                        .font(.system(size: 15, weight: .semibold))
                }
            }
        }
    }
}

// PDFKit integration for iOS that fits pages cleanly
struct PDFKitRepresentedView: UIViewRepresentable {
    let urlString: String
    
    func makeUIView(context: Context) -> PDFView {
        let pdfView = PDFView()
        pdfView.autoScales = true
        pdfView.displayMode = .singlePage
        pdfView.displayDirection = .horizontal
        pdfView.backgroundColor = .black
        
        loadDocument(into: pdfView)
        return pdfView
    }
    
    func updateUIView(_ uiView: PDFView, context: Context) {
        if uiView.document == nil {
            loadDocument(into: uiView)
        }
    }
    
    private func loadDocument(into pdfView: PDFView) {
        if urlString.hasPrefix("data:application/pdf"),
           let commaIndex = urlString.firstIndex(of: ","),
           let data = Data(base64Encoded: String(urlString[urlString.index(after: commaIndex)...])) {
            pdfView.document = PDFDocument(data: data)
        } else if let url = URL(string: urlString) {
            pdfView.document = PDFDocument(url: url)
        }
    }
}

// Pinch to Zoom View for Timetable Images
struct ZoomableScrollView<Content: View>: UIViewRepresentable {
    private var content: Content
    
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    func makeUIView(context: Context) -> UIScrollView {
        let scrollView = UIScrollView()
        scrollView.delegate = context.coordinator
        scrollView.maximumZoomScale = 5.0
        scrollView.minimumZoomScale = 1.0
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.showsVerticalScrollIndicator = false
        
        let hostedView = UIHostingController(rootView: content).view!
        hostedView.translatesAutoresizingMaskIntoConstraints = false
        hostedView.backgroundColor = .clear
        scrollView.addSubview(hostedView)
        
        NSLayoutConstraint.activate([
            hostedView.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor),
            hostedView.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor),
            hostedView.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor),
            hostedView.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor),
            hostedView.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor),
            hostedView.heightAnchor.constraint(equalTo: scrollView.frameLayoutGuide.heightAnchor)
        ])
        
        return scrollView
    }
    
    func updateUIView(_ uiView: UIScrollView, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    class Coordinator: NSObject, UIScrollViewDelegate {
        func viewForZooming(in scrollView: UIScrollView) -> UIView? {
            scrollView.subviews.first
        }
    }
}
