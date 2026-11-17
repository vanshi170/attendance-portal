import SwiftUI

struct AttendanceSuccessView: View {
    let message: String
    let onDone: () -> Void
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.65).ignoresSafeArea()
            
            VStack(spacing: 20) {
                // Success checkmark animation badge
                ZStack {
                    Circle()
                        .fill(Color.green.opacity(0.15))
                        .frame(width: 80, height: 80)
                    Circle()
                        .fill(Color.green)
                        .frame(width: 60, height: 60)
                    Image(systemName: "checkmark")
                        .font(.system(size: 30, weight: .bold))
                        .foregroundColor(.white)
                }
                .padding(.top, 10)
                
                VStack(spacing: 6) {
                    Text("Attendance Recorded!")
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundColor(Color(red: 0.05, green: 0.15, blue: 0.3))
                    
                    Text(message)
                        .font(.system(size: 13))
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 10)
                }
                
                // Badges
                HStack(spacing: 12) {
                    HStack(spacing: 4) {
                        Image(systemName: "faceid")
                            .foregroundColor(.blue)
                        Text("Face Verified")
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(8)
                    
                    HStack(spacing: 4) {
                        Image(systemName: "location.fill")
                            .foregroundColor(.green)
                        Text("Geofence OK")
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(8)
                }
                
                Button(action: onDone) {
                    Text("Return to Dashboard")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .background(
                            LinearGradient(colors: [Color.sky, Color.blue], startPoint: .leading, endPoint: .trailing)
                        )
                        .cornerRadius(24)
                }
                .padding(.top, 10)
            }
            .padding(24)
            .background(Color.white)
            .cornerRadius(24)
            .shadow(color: Color.black.opacity(0.15), radius: 25)
            .padding(.horizontal, 30)
        }
    }
}
