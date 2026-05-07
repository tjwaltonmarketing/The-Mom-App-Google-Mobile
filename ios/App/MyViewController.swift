
import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(FCMPlugin())
        print("[MyViewController] FCMPlugin registered with bridge")
        bridge?.registerPluginInstance(RevenueCatPlugin())
        print("[MyViewController] RevenueCatPlugin registered with bridge")
    }
}
