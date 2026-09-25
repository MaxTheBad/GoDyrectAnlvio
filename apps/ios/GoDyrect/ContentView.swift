import SwiftUI

struct ContentView: View {
    @StateObject private var browser = BrowserModel()

    var body: some View {
        ZStack {
            Color(red: 0.015, green: 0.025, blue: 0.021)
                .ignoresSafeArea()

            GoDyrectWebView(model: browser)
                .ignoresSafeArea(edges: .bottom)

            if browser.isLoading {
                VStack {
                    ProgressView()
                        .tint(Color(red: 0.66, green: 1.0, blue: 0.26))
                    Spacer()
                }
                .padding(.top, 8)
                .allowsHitTesting(false)
            }

        }
        .alert("Couldn’t load GoDyrect", isPresented: $browser.showError) {
            Button("Try again") { browser.reload() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(browser.errorMessage)
        }
    }
}

private struct PermissionPrimer: View {
    let kind: PermissionKind
    let allow: () -> Void
    let notNow: () -> Void

    private var icon: String { kind == .notifications ? "bell.badge.fill" : "location.fill" }
    private var eyebrow: String { kind == .notifications ? "STAY IN THE LOOP" : "MAKE IT LOCAL" }
    private var title: String { kind == .notifications ? "Know when the deal moves." : "Find opportunities near you." }
    private var message: String {
        kind == .notifications
            ? "Get timely updates for messages, buyer interest, and activity that matters—without checking the app all day."
            : "GoDyrect uses your approximate location while you use the app to surface relevant businesses and calculate distance."
    }
    private var buttonTitle: String { kind == .notifications ? "Turn on notifications" : "Use my location" }

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.black.opacity(0.64).ignoresSafeArea().onTapGesture(perform: notNow)

            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Image(systemName: icon)
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(Color(red: 0.67, green: 1, blue: 0.27))
                        .frame(width: 48, height: 48)
                        .background(Color(red: 0.67, green: 1, blue: 0.27).opacity(0.12), in: RoundedRectangle(cornerRadius: 15))
                    Spacer()
                    Button(action: notNow) {
                        Image(systemName: "xmark").font(.system(size: 14, weight: .bold))
                    }
                    .foregroundStyle(.secondary)
                    .frame(width: 40, height: 40)
                }

                Text(eyebrow)
                    .font(.caption.weight(.bold))
                    .tracking(1.8)
                    .foregroundStyle(Color(red: 0.67, green: 1, blue: 0.27))
                Text(title)
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                Text(message)
                    .font(.system(size: 17))
                    .foregroundStyle(Color.white.opacity(0.72))
                    .lineSpacing(4)

                Button(action: allow) {
                    Text(buttonTitle)
                        .font(.headline)
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color(red: 0.67, green: 1, blue: 0.27), in: RoundedRectangle(cornerRadius: 16))
                }
                Button("Not now", action: notNow)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.white.opacity(0.66))
                    .frame(maxWidth: .infinity)
            }
            .padding(24)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 28).stroke(Color.white.opacity(0.12)))
            .padding(16)
        }
    }
}
