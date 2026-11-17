import SwiftUI

struct LivingBackground: View {
    @State private var animateBlobs = false
    
    var body: some View {
        ZStack {
            // Base background gradient: Sky-50 to White
            LinearGradient(
                colors: [
                    Color(red: 0.94, green: 0.97, blue: 1.0),
                    Color(red: 0.90, green: 0.95, blue: 0.99),
                    Color.white
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            // Soft floating pastel cyan/blue circle 1
            Circle()
                .fill(Color(red: 0.65, green: 0.85, blue: 0.98).opacity(0.45))
                .frame(width: 320, height: 320)
                .blur(radius: 70)
                .offset(x: animateBlobs ? -100 : -140, y: animateBlobs ? -180 : -120)
            
            // Soft floating pastel sky circle 2
            Circle()
                .fill(Color(red: 0.73, green: 0.88, blue: 0.99).opacity(0.40))
                .frame(width: 280, height: 280)
                .blur(radius: 65)
                .offset(x: animateBlobs ? 120 : 80, y: animateBlobs ? 140 : 200)
            
            // Soft center indigo highlight
            Circle()
                .fill(Color(red: 0.82, green: 0.88, blue: 0.99).opacity(0.35))
                .frame(width: 240, height: 240)
                .blur(radius: 80)
                .offset(x: animateBlobs ? -60 : 40, y: animateBlobs ? 80 : 0)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 8.0).repeatForever(autoreverses: true)) {
                animateBlobs.toggle()
            }
        }
    }
}
