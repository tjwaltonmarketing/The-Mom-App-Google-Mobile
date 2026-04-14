package com.momapp.family

import android.util.Log
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.EntitlementInfo
import com.revenuecat.purchases.Offering
import com.revenuecat.purchases.Offerings
import com.revenuecat.purchases.Package
import com.revenuecat.purchases.PurchaseParams
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration
import com.revenuecat.purchases.PurchasesError
import com.revenuecat.purchases.interfaces.GetOfferingsCallback
import com.revenuecat.purchases.interfaces.LogInCallback
import com.revenuecat.purchases.interfaces.ReceiveCustomerInfoCallback
import com.revenuecat.purchases.models.StoreTransaction

@CapacitorPlugin(name = "RevenueCatPlugin")
class RevenueCatPlugin : Plugin() {

    companion object {
        private const val TAG = "RevenueCatPlugin"
    }

    private var isConfigured = false

    @PluginMethod
    fun configure(call: PluginCall) {
        val apiKey = call.getString("apiKey") ?: run {
            call.reject("Missing apiKey")
            return
        }

        if (isConfigured) {
            call.resolve(JSObject().also {
                it.put("success", true)
                it.put("alreadyConfigured", true)
            })
            return
        }

        try {
            Purchases.configure(PurchasesConfiguration.Builder(context, apiKey).build())
            isConfigured = true
            Log.d(TAG, "RevenueCat configured successfully")
            call.resolve(JSObject().also { it.put("success", true) })
        } catch (e: Exception) {
            Log.e(TAG, "Configure error: ${e.message}")
            call.reject("Failed to configure: ${e.message}")
        }
    }

    @PluginMethod
    fun logIn(call: PluginCall) {
        val appUserID = call.getString("appUserID") ?: run {
            call.reject("Missing appUserID")
            return
        }

        Purchases.sharedInstance.logIn(appUserID, object : LogInCallback {
            override fun onReceived(customerInfo: CustomerInfo, created: Boolean) {
                call.resolve(JSObject().also { ret ->
                    ret.put("success", true)
                    ret.put("created", created)
                    ret.put("customerInfo", serializeCustomerInfo(customerInfo))
                })
            }

            override fun onError(error: PurchasesError) {
                Log.e(TAG, "logIn error: ${error.message}")
                call.reject(error.message)
            }
        })
    }

    @PluginMethod
    fun logOut(call: PluginCall) {
        Purchases.sharedInstance.logOut(object : ReceiveCustomerInfoCallback {
            override fun onReceived(customerInfo: CustomerInfo) {
                call.resolve(JSObject().also { it.put("success", true) })
            }

            override fun onError(error: PurchasesError) {
                call.reject(error.message)
            }
        })
    }

    @PluginMethod
    fun getOfferings(call: PluginCall) {
        Purchases.sharedInstance.getOfferings(object : GetOfferingsCallback {
            override fun onReceived(offerings: Offerings) {
                val packages = JSArray()
                for ((_, offering) in offerings.all) {
                    for (pkg in offering.availablePackages) {
                        val pkgObj = JSObject().also { obj ->
                            obj.put("identifier", pkg.identifier)
                            obj.put("packageType", pkg.packageType.toString())
                            obj.put("productIdentifier", pkg.product.id)
                            obj.put("localizedTitle", pkg.product.name)
                            obj.put("localizedDescription", pkg.product.description ?: "")
                            obj.put("priceString", pkg.product.price.formatted)
                            obj.put("price", pkg.product.price.amountMicros / 1_000_000.0)
                        }
                        packages.put(pkgObj)
                    }
                }
                call.resolve(JSObject().also { it.put("packages", packages) })
            }

            override fun onError(error: PurchasesError) {
                Log.e(TAG, "getOfferings error: ${error.message}")
                call.reject(error.message)
            }
        })
    }

    @PluginMethod
    fun purchasePackage(call: PluginCall) {
        val productIdentifier = call.getString("productIdentifier") ?: run {
            call.reject("Missing productIdentifier")
            return
        }

        Purchases.sharedInstance.getOfferings(object : GetOfferingsCallback {
            override fun onReceived(offerings: Offerings) {
                var foundPackage: Package? = null
                loop@ for ((_, offering) in offerings.all) {
                    for (pkg in offering.availablePackages) {
                        if (pkg.product.id == productIdentifier) {
                            foundPackage = pkg
                            break@loop
                        }
                    }
                }

                val packageToPurchase = foundPackage ?: run {
                    call.reject("Package not found for product: $productIdentifier")
                    return
                }

                Purchases.sharedInstance.purchase(
                    PurchaseParams.Builder(activity, packageToPurchase).build()
                ) { _: StoreTransaction?, customerInfo: CustomerInfo?, error: PurchasesError?, userCancelled: Boolean ->
                    when {
                        userCancelled -> call.resolve(JSObject().also {
                            it.put("success", false)
                            it.put("cancelled", true)
                        })
                        error != null -> {
                            Log.e(TAG, "Purchase error: ${error.message}")
                            call.reject(error.message)
                        }
                        else -> call.resolve(JSObject().also {
                            it.put("success", true)
                            it.put("cancelled", false)
                            it.put("customerInfo", serializeCustomerInfo(customerInfo))
                        })
                    }
                }
            }

            override fun onError(error: PurchasesError) {
                call.reject(error.message)
            }
        })
    }

    @PluginMethod
    fun restorePurchases(call: PluginCall) {
        Purchases.sharedInstance.restorePurchases(object : ReceiveCustomerInfoCallback {
            override fun onReceived(customerInfo: CustomerInfo) {
                call.resolve(JSObject().also {
                    it.put("success", true)
                    it.put("customerInfo", serializeCustomerInfo(customerInfo))
                })
            }

            override fun onError(error: PurchasesError) {
                Log.e(TAG, "Restore error: ${error.message}")
                call.reject(error.message)
            }
        })
    }

    @PluginMethod
    fun getCustomerInfo(call: PluginCall) {
        Purchases.sharedInstance.getCustomerInfo(object : ReceiveCustomerInfoCallback {
            override fun onReceived(customerInfo: CustomerInfo) {
                call.resolve(JSObject().also {
                    it.put("success", true)
                    it.put("customerInfo", serializeCustomerInfo(customerInfo))
                })
            }

            override fun onError(error: PurchasesError) {
                call.reject(error.message)
            }
        })
    }

    private fun serializeCustomerInfo(info: CustomerInfo?): JSObject {
        val result = JSObject()
        info ?: return result

        val activeEntitlements = JSArray()
        for (key in info.entitlements.active.keys) {
            activeEntitlements.put(key)
        }
        result.put("activeEntitlements", activeEntitlements)

        val activeSubscriptions = JSArray()
        for (sub in info.activeSubscriptions) {
            activeSubscriptions.put(sub)
        }
        result.put("activeSubscriptions", activeSubscriptions)

        val entitlementDetails = JSArray()
        for ((key, entitlement) in info.entitlements.all) {
            val detail = JSObject().also { d ->
                d.put("identifier", key)
                d.put("isActive", entitlement.isActive)
                d.put("productIdentifier", entitlement.productIdentifier)
                d.put("willRenew", entitlement.willRenew)
                entitlement.expirationDate?.let { d.put("expirationDate", it.toString()) }
            }
            entitlementDetails.put(detail)
        }
        result.put("entitlements", entitlementDetails)

        return result
    }
}
