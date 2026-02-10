package com.momapp.family;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name = "FCMPlugin")
public class FCMPlugin extends Plugin {
    private static final String TAG = "FCMPlugin";
    private static final int NOTIFICATION_PERMISSION_REQUEST = 9001;
    private static FCMPlugin instance;
    private PluginCall pendingPermissionCall;

    @Override
    public void load() {
        instance = this;
        Log.i(TAG, "FCMPlugin loaded");
    }

    public static FCMPlugin getInstance() {
        return instance;
    }

    public static void onNewFCMToken(String token) {
        if (instance != null) {
            try {
                JSObject data = new JSObject();
                data.put("token", token);
                instance.notifyListeners("fcmTokenReceived", data);
                Log.i(TAG, "New FCM token forwarded to JS");
            } catch (Exception e) {
                Log.e(TAG, "Error forwarding token: " + e.getMessage());
            }
        }
    }

    public static void onPushReceived(String title, String body, JSObject data) {
        if (instance != null) {
            try {
                JSObject event = new JSObject();
                event.put("title", title != null ? title : "");
                event.put("body", body != null ? body : "");
                if (data != null) {
                    event.put("data", data);
                }
                instance.notifyListeners("pushNotificationReceived", event);
            } catch (Exception e) {
                Log.e(TAG, "Error forwarding push: " + e.getMessage());
            }
        }
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        try {
            FirebaseMessaging.getInstance().getToken()
                .addOnSuccessListener(token -> {
                    try {
                        JSObject result = new JSObject();
                        result.put("token", token);
                        call.resolve(result);
                        Log.i(TAG, "FCM token retrieved successfully");
                    } catch (Exception e) {
                        Log.e(TAG, "Error resolving token: " + e.getMessage());
                        call.reject("Error resolving token");
                    }
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Failed to get FCM token: " + e.getMessage());
                    call.reject("Failed to get FCM token: " + e.getMessage());
                });
        } catch (Exception e) {
            Log.e(TAG, "Exception getting FCM token: " + e.getMessage());
            call.reject("Exception: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        try {
            JSObject result = new JSObject();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                int status = ContextCompat.checkSelfPermission(
                    getContext(), Manifest.permission.POST_NOTIFICATIONS);
                result.put("receive", status == PackageManager.PERMISSION_GRANTED ? "granted" : "prompt");
            } else {
                result.put("receive", "granted");
            }
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error checking permissions: " + e.getMessage());
            JSObject result = new JSObject();
            result.put("receive", "granted");
            call.resolve(result);
        }
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                int status = ContextCompat.checkSelfPermission(
                    getContext(), Manifest.permission.POST_NOTIFICATIONS);
                if (status == PackageManager.PERMISSION_GRANTED) {
                    JSObject result = new JSObject();
                    result.put("receive", "granted");
                    call.resolve(result);
                    return;
                }

                pendingPermissionCall = call;
                ActivityCompat.requestPermissions(
                    getActivity(),
                    new String[]{ Manifest.permission.POST_NOTIFICATIONS },
                    NOTIFICATION_PERMISSION_REQUEST
                );
            } else {
                JSObject result = new JSObject();
                result.put("receive", "granted");
                call.resolve(result);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting permissions: " + e.getMessage());
            JSObject result = new JSObject();
            result.put("receive", "denied");
            call.resolve(result);
        }
    }

    public void handlePermissionResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode != NOTIFICATION_PERMISSION_REQUEST) return;

        try {
            JSObject result = new JSObject();
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                result.put("receive", "granted");
                Log.i(TAG, "Notification permission granted");
            } else {
                result.put("receive", "denied");
                Log.i(TAG, "Notification permission denied");
            }

            if (pendingPermissionCall != null) {
                pendingPermissionCall.resolve(result);
                pendingPermissionCall = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error handling permission result: " + e.getMessage());
            if (pendingPermissionCall != null) {
                JSObject result = new JSObject();
                result.put("receive", "denied");
                pendingPermissionCall.resolve(result);
                pendingPermissionCall = null;
            }
        }
    }

    public static int getPermissionRequestCode() {
        return NOTIFICATION_PERMISSION_REQUEST;
    }
}
