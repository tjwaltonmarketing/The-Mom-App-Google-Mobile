#import <Capacitor/Capacitor.h>

CAP_PLUGIN(FCMPlugin, "FCMPlugin",
    CAP_PLUGIN_METHOD(getToken, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(checkPermissions, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestPermissions, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(openNotificationSettings, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(debugNotificationPermission, CAPPluginReturnPromise);
)
