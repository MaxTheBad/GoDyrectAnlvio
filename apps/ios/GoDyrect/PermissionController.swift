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

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func request(_ kind: PermissionKind) {
        guard activePrompt == nil else { return }
        switch kind {
        case .notifications:
            UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
                Task { @MainActor in
                    guard let self else { return }
                    if settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional {
                        UIApplication.shared.registerForRemoteNotifications()
                    } else {
                        self.activePrompt = .notifications
                    }
                }
            }
        case .location:
            let status = locationManager.authorizationStatus
            if status == .authorizedWhenInUse || status == .authorizedAlways {
                locationManager.requestLocation()
            } else {
                activePrompt = .location
            }
        }
    }

    func allow(_ kind: PermissionKind) {
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

    }

    func deferPrompt(_ kind: PermissionKind) {
        activePrompt = nil
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
