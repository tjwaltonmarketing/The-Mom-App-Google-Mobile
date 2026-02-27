import Foundation
import Capacitor
import RevenueCat

@objc(RevenueCatPlugin)
public class RevenueCatPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RevenueCatPlugin"
    public let jsName = "RevenueCatPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getOfferings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchasePackage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCustomerInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logOut", returnType: CAPPluginReturnPromise),
    ]

    private var isConfigured = false
    private var isPurchasing = false

    @objc public func configure(_ call: CAPPluginCall) {
        guard let apiKey = call.getString("apiKey") else {
            call.reject("Missing apiKey")
            return
        }

        if isConfigured {
            call.resolve(["success": true, "alreadyConfigured": true])
            return
        }

        Purchases.logLevel = .warn
        Purchases.configure(withAPIKey: apiKey)
        isConfigured = true

        print("[RevenueCatPlugin] Configured with API key")
        call.resolve(["success": true])
    }

    @objc public func logIn(_ call: CAPPluginCall) {
        guard let appUserID = call.getString("appUserID") else {
            call.reject("Missing appUserID")
            return
        }

        Purchases.shared.logIn(appUserID) { customerInfo, created, error in
            if let error = error {
                print("[RevenueCatPlugin] logIn error: \(error.localizedDescription)")
                call.reject(error.localizedDescription)
                return
            }

            print("[RevenueCatPlugin] Logged in as \(appUserID), created: \(created)")
            call.resolve([
                "success": true,
                "created": created,
                "customerInfo": self.serializeCustomerInfo(customerInfo)
            ])
        }
    }

    @objc public func logOut(_ call: CAPPluginCall) {
        Purchases.shared.logOut { customerInfo, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            call.resolve(["success": true])
        }
    }

    @objc public func getOfferings(_ call: CAPPluginCall) {
        Purchases.shared.getOfferings { offerings, error in
            if let error = error {
                print("[RevenueCatPlugin] getOfferings error: \(error.localizedDescription)")
                call.reject(error.localizedDescription)
                return
            }

            var allPackages: [JSObject] = []
            guard let allOfferings = offerings else {
                print("[RevenueCatPlugin] No offerings found")
                call.resolve(["packages": []])
                return
            }

            for (_, offering) in allOfferings.all {
                for package in offering.availablePackages {
                    var pkg = JSObject()
                    pkg["identifier"] = package.identifier
                    pkg["packageType"] = self.packageTypeString(package.packageType)
                    pkg["productIdentifier"] = package.storeProduct.productIdentifier
                    pkg["localizedTitle"] = package.storeProduct.localizedTitle
                    pkg["localizedDescription"] = package.storeProduct.localizedDescription
                    pkg["priceString"] = package.storeProduct.localizedPriceString
                    pkg["price"] = package.storeProduct.price as NSDecimalNumber

                    if let introPrice = package.storeProduct.introductoryDiscount {
                        var intro = JSObject()
                        intro["priceString"] = introPrice.localizedPriceString
                        intro["price"] = introPrice.price as NSDecimalNumber
                        intro["periodDays"] = self.subscriptionPeriodDays(introPrice.subscriptionPeriod)
                        intro["paymentMode"] = self.paymentModeString(introPrice.paymentMode)
                        pkg["introPrice"] = intro
                    }

                    allPackages.append(pkg)
                }
            }

            print("[RevenueCatPlugin] Found \(allPackages.count) packages across all offerings")
            call.resolve(["packages": allPackages])
        }
    }

    @objc public func purchasePackage(_ call: CAPPluginCall) {
        guard let productIdentifier = call.getString("productIdentifier") else {
            call.reject("Missing productIdentifier")
            return
        }

        guard !isPurchasing else {
            print("[RevenueCatPlugin] Purchase already in progress, ignoring duplicate call")
            call.resolve(["success": false, "cancelled": false])
            return
        }

        isPurchasing = true

        Purchases.shared.getOfferings { [weak self] offerings, error in
            guard let self = self else { return }

            if let error = error {
                self.isPurchasing = false
                call.reject(error.localizedDescription)
                return
            }

            var foundPackage: Package?
            for (_, offering) in offerings?.all ?? [:] {
                if let pkg = offering.availablePackages.first(where: { $0.storeProduct.productIdentifier == productIdentifier }) {
                    foundPackage = pkg
                    break
                }
            }

            guard let package = foundPackage else {
                self.isPurchasing = false
                call.reject("Package not found for product: \(productIdentifier)")
                return
            }

            Purchases.shared.purchase(package: package) { transaction, customerInfo, error, userCancelled in
                self.isPurchasing = false

                if userCancelled {
                    call.resolve(["success": false, "cancelled": true])
                    return
                }

                if let error = error {
                    print("[RevenueCatPlugin] Purchase error: \(error.localizedDescription)")
                    call.reject(error.localizedDescription)
                    return
                }

                print("[RevenueCatPlugin] Purchase successful")
                call.resolve([
                    "success": true,
                    "cancelled": false,
                    "customerInfo": self.serializeCustomerInfo(customerInfo)
                ])
            }
        }
    }

    @objc public func restorePurchases(_ call: CAPPluginCall) {
        Purchases.shared.restorePurchases { customerInfo, error in
            if let error = error {
                print("[RevenueCatPlugin] Restore error: \(error.localizedDescription)")
                call.reject(error.localizedDescription)
                return
            }

            print("[RevenueCatPlugin] Purchases restored")
            call.resolve([
                "success": true,
                "customerInfo": self.serializeCustomerInfo(customerInfo)
            ])
        }
    }

    @objc public func getCustomerInfo(_ call: CAPPluginCall) {
        Purchases.shared.getCustomerInfo { customerInfo, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }

            call.resolve([
                "success": true,
                "customerInfo": self.serializeCustomerInfo(customerInfo)
            ])
        }
    }

    private func serializeCustomerInfo(_ info: CustomerInfo?) -> JSObject {
        var result = JSObject()
        guard let info = info else { return result }

        var activeEntitlements: [String] = []
        for (key, entitlement) in info.entitlements.active {
            activeEntitlements.append(key)
        }
        result["activeEntitlements"] = activeEntitlements
        result["activeSubscriptions"] = Array(info.activeSubscriptions)

        if let latestExpiry = info.latestExpirationDate {
            result["latestExpirationDate"] = ISO8601DateFormatter().string(from: latestExpiry)
        }

        var entitlementDetails: [JSObject] = []
        for (key, entitlement) in info.entitlements.all {
            var detail = JSObject()
            detail["identifier"] = key
            detail["isActive"] = entitlement.isActive
            detail["productIdentifier"] = entitlement.productIdentifier
            detail["willRenew"] = entitlement.willRenew

            if let expirationDate = entitlement.expirationDate {
                detail["expirationDate"] = ISO8601DateFormatter().string(from: expirationDate)
            }

            entitlementDetails.append(detail)
        }
        result["entitlements"] = entitlementDetails

        return result
    }

    private func packageTypeString(_ type: PackageType) -> String {
        switch type {
        case .monthly: return "MONTHLY"
        case .annual: return "ANNUAL"
        case .weekly: return "WEEKLY"
        case .twoMonth: return "TWO_MONTH"
        case .threeMonth: return "THREE_MONTH"
        case .sixMonth: return "SIX_MONTH"
        case .lifetime: return "LIFETIME"
        case .custom: return "CUSTOM"
        case .unknown: return "UNKNOWN"
        @unknown default: return "UNKNOWN"
        }
    }

    private func subscriptionPeriodDays(_ period: SubscriptionPeriod) -> Int {
        switch period.unit {
        case .day: return period.value
        case .week: return period.value * 7
        case .month: return period.value * 30
        case .year: return period.value * 365
        @unknown default: return 0
        }
    }

    private func paymentModeString(_ mode: StoreProductDiscount.PaymentMode) -> String {
        switch mode {
        case .freeTrial: return "freeTrial"
        case .payAsYouGo: return "payAsYouGo"
        case .payUpFront: return "payUpFront"
        @unknown default: return "unknown"
        }
    }
}
