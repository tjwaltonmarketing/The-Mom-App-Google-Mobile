package com.momapp.family;

import android.app.Activity;
import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(
    name = "FCMPlugin",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class FCMPlugin extends Plugin {
    private static final String TAG = "FCMPlugin";
    private static FCMPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
        Log.d(TAG, "FCMPlugin loaded");
        Log.d(TAG, "FCMPlugin load() - activity=" + getActivity());
        Log.d(TAG, "FCMPlugin load() - bridge=" + getBridge());
        Log.d(TAG, "FCMPlugin load() - sdk=" + Build.VERSION.SDK_INT);
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
    public void debugNotificationPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("sdk", Build.VERSION.SDK_INT);

        Activity a = getActivity();
        ret.put("activityNull", (a == null));
        ret.put("bridgeNull", (getBridge() == null));

        if (a != null) {
            if (Build.VERSION.SDK_INT >= 33) {
                int granted = ContextCompat.checkSelfPermission(a, Manifest.permission.POST_NOTIFICATIONS);
                ret.put("permissionState", granted);
                ret.put("permissionStateString", granted == 0 ? "GRANTED" : "DENIED");

                try {
                    PermissionState capState = getPermissionState("notifications");
                    ret.put("capacitorState", capState != null ? capState.toString() : "null");
                } catch (Exception e) {
                    ret.put("capacitorState", "error: " + e.getMessage());
                }

                boolean notifEnabled = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
                ret.put("notificationsEnabled", notifEnabled);
            } else {
                ret.put("permissionState", 0);
                ret.put("permissionStateString", "GRANTED (pre-33)");
                boolean notifEnabled = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
                ret.put("notificationsEnabled", notifEnabled);
            }
        }

        boolean askedBefore = hasAskedPermissionBefore();
        ret.put("askedBefore", askedBefore);

        Log.d(TAG, "debugNotificationPermission result: " + ret.toString());
        call.resolve(ret);
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
        JSObject result = new JSObject();
        try {
            Log.d(TAG, "checkPermissions called, SDK=" + Build.VERSION.SDK_INT);
            if (Build.VERSION.SDK_INT >= 33) {
                PermissionState state = getPermissionState("notifications");
                Log.d(TAG, "checkPermissions: Capacitor state = " + state);
                if (state == PermissionState.GRANTED) {
                    result.put("receive", "granted");
                } else if (state == PermissionState.DENIED) {
                    boolean askedBefore = hasAskedPermissionBefore();
                    if (!askedBefore) {
                        result.put("receive", "prompt");
                        Log.d(TAG, "checkPermissions: prompt (never asked)");
                    } else {
                        result.put("receive", "denied");
                        Log.d(TAG, "checkPermissions: denied");
                    }
                } else {
                    result.put("receive", "prompt");
                    Log.d(TAG, "checkPermissions: prompt (state=" + state + ")");
                }
            } else {
                boolean enabled = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
                result.put("receive", enabled ? "granted" : "denied");
                Log.d(TAG, "checkPermissions: pre-Android 13, " + (enabled ? "enabled" : "disabled"));
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking permissions: " + e.getMessage(), e);
            result.put("receive", "prompt");
        }
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        Log.d(TAG, "requestPermissions() called");
        Log.d(TAG, "activity=" + getActivity());
        Log.d(TAG, "sdk=" + Build.VERSION.SDK_INT);
        Log.d(TAG, "bridge=" + getBridge());

        if (Build.VERSION.SDK_INT >= 33) {
            PermissionState currentState = getPermissionState("notifications");
            Log.d(TAG, "requestPermissions: currentState=" + currentState);

            if (currentState == PermissionState.GRANTED) {
                Log.d(TAG, "Permission already granted, resolving immediately");
                JSObject result = new JSObject();
                result.put("receive", "granted");
                call.resolve(result);
                return;
            }

            Log.d(TAG, "Calling requestPermissionForAlias('notifications') via Capacitor framework");
            markPermissionAsked();
            requestPermissionForAlias("notifications", call, "notificationPermCallback");
            Log.d(TAG, "requestPermissionForAlias dispatched");
        } else {
            boolean enabled = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
            Log.d(TAG, "Pre-Android 13, notifications " + (enabled ? "enabled" : "disabled"));
            if (!enabled) {
                Log.d(TAG, "Pre-Android 13: notifications disabled, opening settings");
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
                } catch (Exception e) {
                    Log.e(TAG, "Failed to open settings: " + e.getMessage());
                }
            }
            JSObject result = new JSObject();
            result.put("receive", enabled ? "granted" : "denied");
            call.resolve(result);
        }
    }

    @PermissionCallback
    private void notificationPermCallback(PluginCall call) {
        PermissionState state = getPermissionState("notifications");
        boolean granted = (state == PermissionState.GRANTED);
        Log.d(TAG, "notificationPermCallback fired: " + (granted ? "GRANTED" : "DENIED") + " (state=" + state + ")");

        JSObject result = new JSObject();
        result.put("receive", granted ? "granted" : "denied");
        call.resolve(result);
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

    private boolean hasAskedPermissionBefore() {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences("fcm_plugin_prefs", 0);
            return prefs.getBoolean("notification_permission_asked", false);
        } catch (Exception e) {
            return false;
        }
    }

    private void markPermissionAsked() {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences("fcm_plugin_prefs", 0);
            prefs.edit().putBoolean("notification_permission_asked", true).apply();
        } catch (Exception e) {
            Log.e(TAG, "Failed to mark permission asked: " + e.getMessage());
        }
    }
}
