import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(FCMPlugin())
        bridge?.registerPluginInstance(AppleSignInPlugin())
        print("[MyViewController] FCMPlugin + AppleSignInPlugin registered with bridge")
    }
}
