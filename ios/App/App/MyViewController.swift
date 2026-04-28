import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(FCMPlugin())
        bridge?.registerPluginInstance(AppleSignInPlugin())
        bridge?.registerPluginInstance(RevenueCatPlugin())
        print("[MyViewController] FCMPlugin + AppleSignInPlugin + RevenueCatPlugin registered with bridge")
    }
}
