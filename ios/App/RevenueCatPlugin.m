#import <Capacitor/Capacitor.h>
CAP_PLUGIN(RevenueCatPlugin, "RevenueCatPlugin",
    CAP_PLUGIN_METHOD(configure, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getOfferings, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(purchasePackage, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(restorePurchases, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getCustomerInfo, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(logIn, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(logOut, CAPPluginReturnPromise);
)
