import CoreLocation
import UIKit
import UserNotifications
import WebKit

final class NativePermissionBridge: NSObject, WKScriptMessageHandler, CLLocationManagerDelegate {
    weak var webView: WKWebView?
    private lazy var locationManager: CLLocationManager = {
        let manager = CLLocationManager()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        return manager
    }()

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "godyrectNative",
              let payload = message.body as? [String: Any],
              let kind = payload["kind"] as? String else { return }

        DispatchQueue.main.async { [weak self] in
            if kind == "notificationPreferences" || kind == "notifications" {
                self?.requestNotifications()
            } else if kind == "location" {
                self?.requestLocation()
            }
        }
    }

    private func requestNotifications() {
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                guard let self else { return }
                switch settings.authorizationStatus {
                case .notDetermined:
                    self.presentPrimer(
                        title: "Stay on top of every deal",
                        message: "Turn on notifications for new messages, buyer interest, and important activity. You can change this anytime in Settings.",
                        continueTitle: "Continue"
                    ) {
                        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { _, _ in }
                    }
                case .denied:
                    self.presentSettingsAlert(
                        title: "Notifications are off",
                        message: "You can turn them on in Settings when you want deal and message updates."
                    )
                case .authorized, .provisional, .ephemeral:
                    self.presentInfo(title: "Notifications are on", message: "GoDyrect can notify you about important account activity.")
                @unknown default:
                    break
                }
            }
        }
    }

    private func requestLocation() {
        switch locationManager.authorizationStatus {
        case .notDetermined:
            presentPrimer(
                title: "Find opportunities near you",
                message: "Allow location while using GoDyrect to sort nearby businesses and calculate distance. Your precise location is not shown publicly.",
                continueTitle: "Continue"
            ) { [weak self] in
                self?.locationManager.requestWhenInUseAuthorization()
            }
        case .authorizedWhenInUse, .authorizedAlways:
            locationManager.requestLocation()
        case .denied, .restricted:
            presentSettingsAlert(
                title: "Location is off",
                message: "Turn on location in Settings to use nearby and distance filters."
            )
        @unknown default:
            break
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways else { return }
        manager.requestLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        let script = """
        (() => {
          const detail = { latitude: \(location.coordinate.latitude), longitude: \(location.coordinate.longitude), accuracy: 'approximate' };
          localStorage.setItem('godyrect-native-location', JSON.stringify(detail));
          window.dispatchEvent(new CustomEvent('godyrect:native-location', { detail }));
        })();
        """
        DispatchQueue.main.async { [weak self] in self?.webView?.evaluateJavaScript(script) }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {}

    private func presentPrimer(title: String, message: String, continueTitle: String, onContinue: @escaping () -> Void) {
        guard let controller = webView?.closestViewController else { return }
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Not now", style: .cancel))
        alert.addAction(UIAlertAction(title: continueTitle, style: .default) { _ in onContinue() })
        controller.present(alert, animated: true)
    }

    private func presentSettingsAlert(title: String, message: String) {
        guard let controller = webView?.closestViewController else { return }
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Not now", style: .cancel))
        alert.addAction(UIAlertAction(title: "Open Settings", style: .default) { _ in
            guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
            UIApplication.shared.open(url)
        })
        controller.present(alert, animated: true)
    }

    private func presentInfo(title: String, message: String) {
        guard let controller = webView?.closestViewController else { return }
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Done", style: .default))
        controller.present(alert, animated: true)
    }
}
