import SwiftUI
import PDFKit

struct TimetableThumbnailView: View {
    let urlString: String
    
    @State private var pdfThumbnail: UIImage?
    @State private var isLoading = true
    
    var isPDF: Bool {
        urlString.contains("application/pdf") || urlString.lowercased().contains(".pdf")
    }
    
    var body: some View {
        ZStack {
            Color.white
            
            if isPDF {
                if let thumb = pdfThumbnail {
                    Image(uiImage: thumb)
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if isLoading {
                    ProgressView()
                } else {
                    VStack(spacing: 6) {
                        Image(systemName: "doc.richtext.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.blue)
                        Text("PDF Timetable Ready")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.black)
                        Text("Tap to view full screen")
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                    }
                }
            } else {
                // Image handling (Data URI or Remote URL)
                if urlString.hasPrefix("data:image"),
                   let commaIndex = urlString.firstIndex(of: ","),
                   let data = Data(base64Encoded: String(urlString[urlString.index(after: commaIndex)...])),
                   let image = UIImage(data: data) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let url = URL(string: urlString) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFit()
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                        case .failure:
                            VStack(spacing: 4) {
                                Image(systemName: "exclamationmark.triangle")
                                    .foregroundColor(.orange)
                                Text("Could not preview image")
                                    .font(.system(size: 11))
                                    .foregroundColor(.gray)
                            }
                        default:
                            ProgressView()
                        }
                    }
                }
            }
        }
        .onAppear(perform: loadThumbnail)
    }
    
    private func loadThumbnail() {
        if isPDF {
            DispatchQueue.global(qos: .userInitiated).async {
                var doc: PDFDocument?
                if urlString.hasPrefix("data:application/pdf"),
                   let commaIndex = urlString.firstIndex(of: ","),
                   let data = Data(base64Encoded: String(urlString[urlString.index(after: commaIndex)...])) {
                    doc = PDFDocument(data: data)
                } else if let url = URL(string: urlString) {
                    doc = PDFDocument(url: url)
                }
                
                if let page = doc?.page(at: 0) {
                    let thumb = page.thumbnail(of: CGSize(width: 800, height: 450), for: .mediaBox)
                    DispatchQueue.main.async {
                        self.pdfThumbnail = thumb
                        self.isLoading = false
                    }
                } else {
                    DispatchQueue.main.async {
                        self.isLoading = false
                    }
                }
            }
        }
    }
}
