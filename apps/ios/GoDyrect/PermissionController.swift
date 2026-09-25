import CoreLocation
import SwiftUI
import UserNotifications
import UIKit

enum PermissionKind: String, Identifiable {
    case notifications
    case location

    var id: String { rawValue }
}

@MainActor
final class PermissionController: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var activePrompt: PermissionKind?
    private let locationManager = CLLocationManager()
    private let defaults = UserDefaults.standard

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func beginIfNeeded() {
        guard activePrompt == nil else { return }
        if !defaults.bool(forKey: "godyrect.soft.notifications.seen") {
            activePrompt = .notifications
        } else if !defaults.bool(forKey: "godyrect.soft.location.seen") {
            activePrompt = .location
        }
    }

    func allow(_ kind: PermissionKind) {
        markSeen(kind)
        activePrompt = nil

        switch kind {
        case .notifications:
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
                guard granted else { return }
                DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
            }
        case .location:
            locationManager.requestWhenInUseAuthorization()
            if locationManager.authorizationStatus == .authorizedWhenInUse || locationManager.authorizationStatus == .authorizedAlways {
                locationManager.requestLocation()
            }
        }

        presentNextAfterDelay()
    }

    func deferPrompt(_ kind: PermissionKind) {
        markSeen(kind)
        activePrompt = nil
        presentNextAfterDelay()
    }

    private func markSeen(_ kind: PermissionKind) {
        defaults.set(true, forKey: "godyrect.soft.\(kind.rawValue).seen")
    }

    private func presentNextAfterDelay() {
        Task {
            try? await Task.sleep(for: .milliseconds(700))
            beginIfNeeded()
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways else { return }
        manager.requestLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        NotificationCenter.default.post(
            name: .goDyrectLocationUpdated,
            object: nil,
            userInfo: ["latitude": location.coordinate.latitude, "longitude": location.coordinate.longitude]
        )
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // A transient location failure should not interrupt the marketplace.
    }
}

extension Notification.Name {
    static let goDyrectPushTokenUpdated = Notification.Name("GoDyrectPushTokenUpdated")
    static let goDyrectLocationUpdated = Notification.Name("GoDyrectLocationUpdated")
    static let goDyrectNotificationOpened = Notification.Name("GoDyrectNotificationOpened")
}
