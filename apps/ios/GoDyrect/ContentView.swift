import SwiftUI
import WebKit

struct ContentView: View {
    @StateObject private var browser = BrowserModel()
    @State private var isReady = UserDefaults.standard.bool(forKey: "godyrect.webDataReset.v7")

    var body: some View {
        ZStack {
            Color(red: 0.015, green: 0.025, blue: 0.021)
                .ignoresSafeArea()

            if isReady {
                GoDyrectWebView(model: browser)
                    .ignoresSafeArea(edges: .bottom)
            }

        }
        .alert("Couldn’t load GoDyrect", isPresented: $browser.showError) {
            Button("Try again") { browser.reload() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(browser.errorMessage)
        }
        .task {
            guard !isReady else { return }
            await withCheckedContinuation { continuation in
                WKWebsiteDataStore.default().removeData(
                    ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
                    modifiedSince: .distantPast
                ) {
                    continuation.resume()
                }
            }
            UserDefaults.standard.set(true, forKey: "godyrect.webDataReset.v7")
            isReady = true
        }
    }
}
