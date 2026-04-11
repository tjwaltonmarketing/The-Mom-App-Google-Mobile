import Foundation
import Capacitor
import FBSDKCoreKit

@objc(FacebookEventsPlugin)
public class FacebookEventsPlugin: CAPPlugin {

    @objc func logEvent(_ call: CAPPluginCall) {
        guard let eventName = call.getString("eventName") else {
            call.reject("eventName is required")
            return
        }
        AppEvents.shared.logEvent(AppEvents.Name(rawValue: eventName))
        call.resolve()
    }
}
