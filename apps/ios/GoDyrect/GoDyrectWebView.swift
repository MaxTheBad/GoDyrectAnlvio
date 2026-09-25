import SwiftUI
import WebKit
import UIKit
import Combine

@MainActor
final class BrowserModel: ObservableObject {
    @Published var isLoading = true
    @Published var showError = false
    @Published var errorMessage = "Please check your connection and try again."
    weak var webView: WKWebView?
    private var observers = Set<AnyCancellable>()
    let permissionRequests = PassthroughSubject<PermissionKind, Never>()
    let notificationPreferencesRequests = PassthroughSubject<Void, Never>()

    init() {
        NotificationCenter.default.publisher(for: .goDyrectPushTokenUpdated)
            .compactMap { $0.object as? String }
            .sink { [weak self] token in self?.sendPushToken(token) }
            .store(in: &observers)

        NotificationCenter.default.publisher(for: .goDyrectLocationUpdated)
            .sink { [weak self] note in
                guard let latitude = note.userInfo?["latitude"] as? Double,
                      let longitude = note.userInfo?["longitude"] as? Double else { return }
                self?.sendLocation(latitude: latitude, longitude: longitude)
            }
            .store(in: &observers)

        NotificationCenter.default.publisher(for: .goDyrectNotificationOpened)
            .compactMap { $0.object as? String }
            .sink { [weak self] path in self?.open(path: path) }
            .store(in: &observers)
    }

    func reload() {
        showError = false
        webView?.reload()
    }

    func syncNativeState() {
        if let token = UserDefaults.standard.string(forKey: "godyrect.apns.token") {
            sendPushToken(token)
        }
    }

    func requestPermission(_ kind: String) {
        if kind == "notificationPreferences" {
            notificationPreferencesRequests.send()
            return
        }
        guard let request = PermissionKind(rawValue: kind) else { return }
        permissionRequests.send(request)
    }

    private func sendPushToken(_ token: String) {
        let script = """
        (() => { localStorage.setItem('godyrect-native-push-token', \(json(token)));
        window.dispatchEvent(new CustomEvent('godyrect:native-push-token', { detail: { token: \(json(token)), platform: 'ios' } })); })();
        """
        webView?.evaluateJavaScript(script)
    }

    private func sendLocation(latitude: Double, longitude: Double) {
        let script = """
        (() => { const detail = { latitude: \(latitude), longitude: \(longitude), accuracy: 'approximate' };
        localStorage.setItem('godyrect-native-location', JSON.stringify(detail));
        window.dispatchEvent(new CustomEvent('godyrect:native-location', { detail })); })();
        """
        webView?.evaluateJavaScript(script)
    }

    private func open(path: String) {
        guard let base = URL(string: "https://godyrect.com"),
              let url = URL(string: path, relativeTo: base),
              url.host == "godyrect.com" else { return }
        webView?.load(URLRequest(url: url))
    }

    private func json(_ value: String) -> String {
        let data = try? JSONSerialization.data(withJSONObject: value)
        return data.flatMap { String(data: $0, encoding: .utf8) } ?? "\"\""
    }
}

struct GoDyrectWebView: UIViewRepresentable {
    @ObservedObject var model: BrowserModel

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        configuration.userContentController.add(context.coordinator, name: "godyrectNative")
        let nativeBridge = """
        document.documentElement.classList.add('godyrect-native-app');
        window.GoDyrectNative = { request: function(kind) {
          window.webkit && window.webkit.messageHandlers.godyrectNative.postMessage({ kind: kind });
        }};
        """
        configuration.userContentController.addUserScript(WKUserScript(source: nativeBridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.015, green: 0.025, blue: 0.021, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        model.webView = webView

        var request = URLRequest(url: URL(string: "https://godyrect.com")!)
        request.cachePolicy = .useProtocolCachePolicy
        webView.load(request)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        private let model: BrowserModel
        private let allowedHosts = ["godyrect.com", "www.godyrect.com", "elcoibbmnjejkdbourjv.supabase.co"]

        init(model: BrowserModel) {
            self.model = model
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "godyrectNative",
                  let body = message.body as? [String: Any],
                  let kind = body["kind"] as? String else { return }
            Task { @MainActor in self.model.requestPermission(kind) }
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            model.isLoading = true
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            model.isLoading = false
            model.syncNativeState()
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            handle(error)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            handle(error)
        }

        private func handle(_ error: Error) {
            let nsError = error as NSError
            guard nsError.code != NSURLErrorCancelled else { return }
            model.isLoading = false
            model.errorMessage = nsError.localizedDescription
            model.showError = true
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            if let scheme = url.scheme?.lowercased(), ["tel", "mailto", "sms", "maps"].contains(scheme) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            if let host = url.host?.lowercased(),
               !allowedHosts.contains(host),
               !host.hasSuffix(".google.com"),
               !host.hasSuffix(".googleusercontent.com") {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
                webView.load(URLRequest(url: url))
            }
            return nil
        }

        func webView(
            _ webView: WKWebView,
            runJavaScriptAlertPanelWithMessage message: String,
            initiatedByFrame frame: WKFrameInfo,
            completionHandler: @escaping () -> Void
        ) {
            guard let controller = webView.closestViewController else {
                completionHandler()
                return
            }
            let alert = UIAlertController(title: "GoDyrect", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            controller.present(alert, animated: true)
        }
    }
}

private extension UIView {
    var closestViewController: UIViewController? {
        sequence(first: next, next: { $0?.next })
            .first { $0 is UIViewController } as? UIViewController
    }
}
