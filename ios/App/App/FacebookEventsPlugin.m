#import <Capacitor/Capacitor.h>

CAP_PLUGIN(FacebookEventsPlugin, "FacebookEvents",
    CAP_PLUGIN_METHOD(logEvent, CAPPluginReturnPromise);
)
