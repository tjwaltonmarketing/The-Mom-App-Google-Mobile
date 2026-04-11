package com.momapp.family;

import android.util.Log;
import com.facebook.appevents.AppEventsLogger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FacebookEvents")
public class FacebookEventsPlugin extends Plugin {
    private static final String TAG = "FacebookEventsPlugin";

    @PluginMethod
    public void logEvent(PluginCall call) {
        String eventName = call.getString("eventName");
        if (eventName == null) {
            call.reject("eventName is required");
            return;
        }
        try {
            AppEventsLogger logger = AppEventsLogger.newLogger(getContext());
            logger.logEvent(eventName);
            Log.d(TAG, "Facebook event logged: " + eventName);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error logging Facebook event: " + e.getMessage());
            call.reject("Failed to log event: " + e.getMessage());
        }
    }
}
