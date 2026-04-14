package com.momapp.family;

import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.revenuecat.purchases.CustomerInfo;
import com.revenuecat.purchases.EntitlementInfo;
import com.revenuecat.purchases.Offering;
import com.revenuecat.purchases.Offerings;
import com.revenuecat.purchases.Package;
import com.revenuecat.purchases.Purchases;
import com.revenuecat.purchases.PurchasesConfiguration;
import com.revenuecat.purchases.PurchasesError;
import com.revenuecat.purchases.interfaces.GetOfferingsCallback;
import com.revenuecat.purchases.interfaces.LogInCallback;
import com.revenuecat.purchases.interfaces.PurchaseCallback;
import com.revenuecat.purchases.interfaces.ReceiveCustomerInfoCallback;
import com.revenuecat.purchases.models.StoreProduct;
import com.revenuecat.purchases.models.StoreTransaction;
import com.revenuecat.purchases.PurchaseParams;

import java.util.Map;

@CapacitorPlugin(name = "RevenueCatPlugin")
public class RevenueCatPlugin extends Plugin {
    private static final String TAG = "RevenueCatPlugin";
    private boolean isConfigured = false;

    @PluginMethod
    public void configure(PluginCall call) {
        String apiKey = call.getString("apiKey");
        if (apiKey == null) {
            call.reject("Missing apiKey");
            return;
        }

        if (isConfigured) {
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("alreadyConfigured", true);
            call.resolve(ret);
            return;
        }

        try {
            PurchasesConfiguration config = new PurchasesConfiguration.Builder(getContext(), apiKey).build();
            Purchases.configure(config);
            isConfigured = true;
            Log.d(TAG, "RevenueCat configured");
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Configure error: " + e.getMessage());
            call.reject("Failed to configure: " + e.getMessage());
        }
    }

    @PluginMethod
    public void logIn(PluginCall call) {
        String appUserID = call.getString("appUserID");
        if (appUserID == null) {
            call.reject("Missing appUserID");
            return;
        }

        Purchases.getSharedInstance().logIn(appUserID, new LogInCallback() {
            @Override
            public void onReceived(CustomerInfo customerInfo, boolean created) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("created", created);
                ret.put("customerInfo", serializeCustomerInfo(customerInfo));
                call.resolve(ret);
            }

            @Override
            public void onError(PurchasesError error) {
                Log.e(TAG, "logIn error: " + error.getMessage());
                call.reject(error.getMessage());
            }
        });
    }

    @PluginMethod
    public void logOut(PluginCall call) {
        Purchases.getSharedInstance().logOut(new ReceiveCustomerInfoCallback() {
            @Override
            public void onReceived(CustomerInfo customerInfo) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            }

            @Override
            public void onError(PurchasesError error) {
                call.reject(error.getMessage());
            }
        });
    }

    @PluginMethod
    public void getOfferings(PluginCall call) {
        Purchases.getSharedInstance().getOfferings(new GetOfferingsCallback() {
            @Override
            public void onReceived(Offerings offerings) {
                JSArray packages = new JSArray();
                for (Map.Entry<String, Offering> entry : offerings.getAll().entrySet()) {
                    for (Package pkg : entry.getValue().getAvailablePackages()) {
                        StoreProduct product = pkg.getProduct();
                        JSObject pkgObj = new JSObject();
                        pkgObj.put("identifier", pkg.getIdentifier());
                        pkgObj.put("packageType", pkg.getPackageType().toString());
                        pkgObj.put("productIdentifier", product.getId());
                        pkgObj.put("localizedTitle", product.getName());
                        pkgObj.put("localizedDescription", product.getDescription() != null ? product.getDescription() : "");
                        pkgObj.put("priceString", product.getPrice().getFormatted());
                        pkgObj.put("price", product.getPrice().getAmountMicros() / 1_000_000.0);
                        packages.put(pkgObj);
                    }
                }
                JSObject ret = new JSObject();
                ret.put("packages", packages);
                call.resolve(ret);
            }

            @Override
            public void onError(PurchasesError error) {
                Log.e(TAG, "getOfferings error: " + error.getMessage());
                call.reject(error.getMessage());
            }
        });
    }

    @PluginMethod
    public void purchasePackage(PluginCall call) {
        String productIdentifier = call.getString("productIdentifier");
        if (productIdentifier == null) {
            call.reject("Missing productIdentifier");
            return;
        }

        Purchases.getSharedInstance().getOfferings(new GetOfferingsCallback() {
            @Override
            public void onReceived(Offerings offerings) {
                Package foundPackage = null;
                outer:
                for (Map.Entry<String, Offering> entry : offerings.getAll().entrySet()) {
                    for (Package pkg : entry.getValue().getAvailablePackages()) {
                        if (pkg.getProduct().getId().equals(productIdentifier)) {
                            foundPackage = pkg;
                            break outer;
                        }
                    }
                }

                if (foundPackage == null) {
                    call.reject("Package not found for product: " + productIdentifier);
                    return;
                }

                final Package packageToPurchase = foundPackage;
                PurchaseParams params = new PurchaseParams.Builder(getActivity(), packageToPurchase).build();
                Purchases.getSharedInstance().purchase(params, new PurchaseCallback() {
                    @Override
                    public void onCompleted(StoreTransaction storeTransaction, CustomerInfo customerInfo) {
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("cancelled", false);
                        ret.put("customerInfo", serializeCustomerInfo(customerInfo));
                        call.resolve(ret);
                    }

                    @Override
                    public void onError(PurchasesError error, boolean userCancelled) {
                        if (userCancelled) {
                            JSObject ret = new JSObject();
                            ret.put("success", false);
                            ret.put("cancelled", true);
                            call.resolve(ret);
                        } else {
                            Log.e(TAG, "Purchase error: " + error.getMessage());
                            call.reject(error.getMessage());
                        }
                    }
                });
            }

            @Override
            public void onError(PurchasesError error) {
                call.reject(error.getMessage());
            }
        });
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        Purchases.getSharedInstance().restorePurchases(new ReceiveCustomerInfoCallback() {
            @Override
            public void onReceived(CustomerInfo customerInfo) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("customerInfo", serializeCustomerInfo(customerInfo));
                call.resolve(ret);
            }

            @Override
            public void onError(PurchasesError error) {
                Log.e(TAG, "Restore error: " + error.getMessage());
                call.reject(error.getMessage());
            }
        });
    }

    @PluginMethod
    public void getCustomerInfo(PluginCall call) {
        Purchases.getSharedInstance().getCustomerInfo(new ReceiveCustomerInfoCallback() {
            @Override
            public void onReceived(CustomerInfo customerInfo) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("customerInfo", serializeCustomerInfo(customerInfo));
                call.resolve(ret);
            }

            @Override
            public void onError(PurchasesError error) {
                call.reject(error.getMessage());
            }
        });
    }

    private JSObject serializeCustomerInfo(CustomerInfo info) {
        JSObject result = new JSObject();
        if (info == null) return result;

        JSArray activeEntitlements = new JSArray();
        for (Map.Entry<String, EntitlementInfo> entry : info.getEntitlements().getActive().entrySet()) {
            activeEntitlements.put(entry.getKey());
        }
        result.put("activeEntitlements", activeEntitlements);

        JSArray activeSubscriptions = new JSArray();
        for (String sub : info.getActiveSubscriptions()) {
            activeSubscriptions.put(sub);
        }
        result.put("activeSubscriptions", activeSubscriptions);

        JSArray entitlementDetails = new JSArray();
        for (Map.Entry<String, EntitlementInfo> entry : info.getEntitlements().getAll().entrySet()) {
            EntitlementInfo entitlement = entry.getValue();
            JSObject detail = new JSObject();
            detail.put("identifier", entry.getKey());
            detail.put("isActive", entitlement.isActive());
            detail.put("productIdentifier", entitlement.getProductIdentifier());
            detail.put("willRenew", entitlement.getWillRenew());
            if (entitlement.getExpirationDate() != null) {
                detail.put("expirationDate", entitlement.getExpirationDate().toString());
            }
            entitlementDetails.put(detail);
        }
        result.put("entitlements", entitlementDetails);

        return result;
    }
}
