package com.momapp.family;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.provider.Settings;

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
    private static final int NOTIFICATION_PERMISSION_CODE = 2001;
    private static FCMPlugin instance;
    private PluginCall pendingPermissionCall;

    @Override
    public void load() {
        instance = this;
        Log.i(TAG, "FCMPlugin loaded successfully");
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

    private boolean hasAskedPermissionBefore() {
        SharedPreferences prefs = getActivity().getSharedPreferences("fcm_plugin_prefs", 0);
        return prefs.getBoolean("notification_permission_asked", false);
    }

    private void markPermissionAsked() {
        SharedPreferences prefs = getActivity().getSharedPreferences("fcm_plugin_prefs", 0);
        prefs.edit().putBoolean("notification_permission_asked", true).apply();
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject result = new JSObject();
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                int status = ContextCompat.checkSelfPermission(
                    getActivity(),
                    "android.permission.POST_NOTIFICATIONS"
                );
                if (status == PackageManager.PERMISSION_GRANTED) {
                    result.put("receive", "granted");
                    Log.i(TAG, "checkPermissions: granted");
                } else {
                    boolean shouldShow = ActivityCompat.shouldShowRequestPermissionRationale(
                        getActivity(),
                        "android.permission.POST_NOTIFICATIONS"
                    );
                    boolean askedBefore = hasAskedPermissionBefore();

                    if (!askedBefore) {
                        result.put("receive", "prompt");
                        Log.i(TAG, "checkPermissions: prompt (never asked)");
                    } else if (shouldShow) {
                        result.put("receive", "prompt");
                        Log.i(TAG, "checkPermissions: prompt (can ask again)");
                    } else {
                        result.put("receive", "denied");
                        Log.i(TAG, "checkPermissions: denied (permanently denied)");
                    }
                }
            } else {
                result.put("receive", "granted");
                Log.i(TAG, "checkPermissions: granted (pre-Android 13)");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking permissions: " + e.getMessage());
            result.put("receive", "prompt");
        }
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        Log.i(TAG, "requestPermissions called, SDK: " + Build.VERSION.SDK_INT);

        if (Build.VERSION.SDK_INT >= 33) {
            int status = ContextCompat.checkSelfPermission(
                getActivity(),
                "android.permission.POST_NOTIFICATIONS"
            );

            if (status == PackageManager.PERMISSION_GRANTED) {
                Log.i(TAG, "Permission already granted");
                JSObject result = new JSObject();
                result.put("receive", "granted");
                call.resolve(result);
                return;
            }

            Log.i(TAG, "Requesting POST_NOTIFICATIONS permission via ActivityCompat");
            pendingPermissionCall = call;
            markPermissionAsked();

            try {
                ActivityCompat.requestPermissions(
                    getActivity(),
                    new String[]{ "android.permission.POST_NOTIFICATIONS" },
                    NOTIFICATION_PERMISSION_CODE
                );
                Log.i(TAG, "requestPermissions dispatched to system");
            } catch (Exception e) {
                Log.e(TAG, "Failed to request permission: " + e.getMessage());
                pendingPermissionCall = null;
                JSObject result = new JSObject();
                result.put("receive", "denied");
                call.resolve(result);
            }
        } else {
            Log.i(TAG, "Pre-Android 13, notifications always allowed");
            JSObject result = new JSObject();
            result.put("receive", "granted");
            call.resolve(result);
        }
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, getActivity().getPackageName());
            } else {
                intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getActivity().getPackageName()));
            }
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to open notification settings: " + e.getMessage());
            call.reject("Failed to open settings");
        }
    }

    @Override
    public void handleRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.handleRequestPermissionsResult(requestCode, permissions, grantResults);

        Log.i(TAG, "handleRequestPermissionsResult: requestCode=" + requestCode +
            ", permissions=" + (permissions != null ? permissions.length : 0) +
            ", results=" + (grantResults != null ? grantResults.length : 0));

        if (requestCode == NOTIFICATION_PERMISSION_CODE && pendingPermissionCall != null) {
            boolean granted = grantResults != null &&
                grantResults.length > 0 &&
                grantResults[0] == PackageManager.PERMISSION_GRANTED;

            Log.i(TAG, "Notification permission result: " + (granted ? "GRANTED" : "DENIED"));

            JSObject result = new JSObject();
            result.put("receive", granted ? "granted" : "denied");
            pendingPermissionCall.resolve(result);
            pendingPermissionCall = null;
        }
    }
}
