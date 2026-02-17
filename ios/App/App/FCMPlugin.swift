import Foundation
import Capacitor
import UserNotifications
import FirebaseMessaging
import FirebaseCore

@objc(FCMPlugin)
public class FCMPlugin: CAPPlugin, CAPBridgedPlugin, UNUserNotificationCenterDelegate, MessagingDelegate {
    public let identifier = "FCMPlugin"
    public let jsName = "FCMPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openNotificationSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "debugNotificationPermission", returnType: CAPPluginReturnPromise),
    ]

    private static var instance: FCMPlugin?

    override public func load() {
        super.load()
        FCMPlugin.instance = self

        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self

        print("[FCMPlugin] Plugin loaded")
    }

    @objc public func checkPermissions(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral:
                call.resolve(["receive": "granted"])
            case .denied:
                call.resolve(["receive": "denied"])
            case .notDetermined:
                call.resolve(["receive": "prompt"])
            @unknown default:
                call.resolve(["receive": "prompt"])
            }
        }
    }

    @objc public func requestPermissions(_ call: CAPPluginCall) {
        print("[FCMPlugin] requestPermissions called")
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error = error {
                print("[FCMPlugin] requestPermissions error: \(error.localizedDescription)")
                call.resolve(["receive": "denied"])
                return
            }

            print("[FCMPlugin] requestPermissions result: \(granted)")

            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }

            call.resolve(["receive": granted ? "granted" : "denied"])
        }
    }

    @objc public func getToken(_ call: CAPPluginCall) {
        Messaging.messaging().token { token, error in
            if let error = error {
                print("[FCMPlugin] getToken error: \(error.localizedDescription)")
                call.reject("Failed to get FCM token: \(error.localizedDescription)")
                return
            }

            if let token = token {
                print("[FCMPlugin] FCM token retrieved successfully")
                call.resolve(["token": token])
            } else {
                call.reject("No FCM token available")
            }
        }
    }

    @objc public func openNotificationSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url, options: [:]) { _ in
                    call.resolve()
                }
            } else {
                call.reject("Cannot open settings")
            }
        }
    }

    @objc public func debugNotificationPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            var result = JSObject()
            result["platform"] = "ios"
            result["authorizationStatus"] = "\(settings.authorizationStatus.rawValue)"

            switch settings.authorizationStatus {
            case .authorized:
                result["statusString"] = "authorized"
            case .denied:
                result["statusString"] = "denied"
            case .notDetermined:
                result["statusString"] = "notDetermined"
            case .provisional:
                result["statusString"] = "provisional"
            case .ephemeral:
                result["statusString"] = "ephemeral"
            @unknown default:
                result["statusString"] = "unknown"
            }

            result["alertSetting"] = "\(settings.alertSetting.rawValue)"
            result["badgeSetting"] = "\(settings.badgeSetting.rawValue)"
            result["soundSetting"] = "\(settings.soundSetting.rawValue)"

            Messaging.messaging().token { token, error in
                result["hasToken"] = (token != nil)
                result["tokenError"] = error?.localizedDescription ?? ""
                print("[FCMPlugin] debugNotificationPermission: \(result)")
                call.resolve(result)
            }
        }
    }

    public func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("[FCMPlugin] New FCM token received via delegate")
        notifyListeners("fcmTokenReceived", data: ["token": token])
    }

    public func userNotificationCenter(_ center: UNUserNotificationCenter,
                                        willPresent notification: UNNotification,
                                        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let content = notification.request.content
        print("[FCMPlugin] Push received in foreground: \(content.userInfo)")

        var data = JSObject()
        data["title"] = content.title
        data["body"] = content.body

        if let route = content.userInfo["route"] as? String {
            data["route"] = route
        }

        notifyListeners("pushNotificationReceived", data: data)

        completionHandler([.banner, .badge, .sound])
    }

    public func userNotificationCenter(_ center: UNUserNotificationCenter,
                                        didReceive response: UNNotificationResponse,
                                        withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        print("[FCMPlugin] Notification tapped: \(userInfo)")

        if let route = userInfo["route"] as? String {
            notifyListeners("pushNotificationActionPerformed", data: ["route": route])
        }

        completionHandler()
    }
}
