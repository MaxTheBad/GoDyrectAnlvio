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
