import SwiftUI
import WebKit
import UIKit

@MainActor
final class BrowserModel: ObservableObject {
    @Published var isLoading = true
    @Published var showError = false
    @Published var errorMessage = "Please check your connection and try again."
    weak var webView: WKWebView?

    func reload() {
        showError = false
        webView?.reload()
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
        configuration.userContentController.add(context.coordinator.permissionBridge, name: "godyrectNative")
        let nativeMarker = """
        document.documentElement.classList.add('godyrect-native-app');
        window.GoDyrectNative = {
          request: function(kind) {
            window.webkit.messageHandlers.godyrectNative.postMessage({ kind: kind });
          }
        };
        """
        configuration.userContentController.addUserScript(WKUserScript(source: nativeMarker, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.scrollView.alwaysBounceVertical = true
        let refreshControl = context.coordinator.refreshControl
        refreshControl.tintColor = UIColor(red: 0.73, green: 1.0, blue: 0.35, alpha: 1)
        refreshControl.addTarget(context.coordinator, action: #selector(Coordinator.refreshWebView(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refreshControl
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.015, green: 0.025, blue: 0.021, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        model.webView = webView
        context.coordinator.permissionBridge.webView = webView

        var request = URLRequest(url: URL(string: "https://godyrect.com/explore")!)
        request.cachePolicy = .useProtocolCachePolicy
        webView.load(request)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private let model: BrowserModel
        let permissionBridge = NativePermissionBridge()
        let refreshControl = UIRefreshControl()
        private let allowedHosts = ["godyrect.com", "www.godyrect.com", "elcoibbmnjejkdbourjv.supabase.co"]

        init(model: BrowserModel) {
            self.model = model
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            model.isLoading = true
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            model.isLoading = false
            refreshControl.endRefreshing()
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
            refreshControl.endRefreshing()
        }

        @objc func refreshWebView(_ sender: UIRefreshControl) {
            model.webView?.reloadFromOrigin()
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
               !host.hasSuffix(".googleusercontent.com"),
               !host.hasSuffix(".apple.com") {
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

extension UIView {
    var closestViewController: UIViewController? {
        sequence(first: next, next: { $0?.next })
            .first { $0 is UIViewController } as? UIViewController
    }
}
