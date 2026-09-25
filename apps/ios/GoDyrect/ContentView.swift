import SwiftUI

struct ContentView: View {
    @StateObject private var browser = BrowserModel()
    @StateObject private var permissions = PermissionController()
    @State private var showNotificationPreferences = false

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

            if let prompt = permissions.activePrompt {
                PermissionPrimer(kind: prompt) {
                    permissions.allow(prompt)
                } notNow: {
                    permissions.deferPrompt(prompt)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .zIndex(10)
            }
        }
        .animation(.spring(response: 0.42, dampingFraction: 0.88), value: permissions.activePrompt)
        .onReceive(browser.permissionRequests) { kind in permissions.request(kind) }
        .onReceive(browser.notificationPreferencesRequests) { showNotificationPreferences = true }
        .sheet(isPresented: $showNotificationPreferences) {
            NotificationPreferences(onEnable: { permissions.request(.notifications) })
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
        .alert("Couldn’t load GoDyrect", isPresented: $browser.showError) {
            Button("Try again") { browser.reload() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(browser.errorMessage)
        }
    }
}

private struct NotificationPreferences: View {
    let onEnable: () -> Void
    @AppStorage("godyrect.notifications.messages") private var messages = true
    @AppStorage("godyrect.notifications.activity") private var activity = true
    @AppStorage("godyrect.notifications.saved") private var saved = true

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Choose the updates that earn your attention. You can change these anytime.")
                        .foregroundStyle(.secondary)
                    Button("Turn on system notifications", action: onEnable)
                        .fontWeight(.semibold)
                } header: { Text("GoDyrect notifications") }
                Section("Notify me about") {
                    Toggle("New messages", isOn: $messages)
                    Toggle("Buyer and seller activity", isOn: $activity)
                    Toggle("Saved opportunities", isOn: $saved)
                }
            }
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
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
