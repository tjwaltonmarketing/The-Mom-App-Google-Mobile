package com.momapp.family;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
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
            strings = { "android.permission.POST_NOTIFICATIONS" }
        )
    }
)
public class FCMPlugin extends Plugin {
    private static final String TAG = "FCMPlugin";
    private static FCMPlugin instance;

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
            JSObject data = new JSObject();
            data.put("token", token);
            instance.notifyListeners("fcmTokenReceived", data);
            Log.i(TAG, "New FCM token forwarded to JS");
        }
    }

    public static void onPushReceived(String title, String body, JSObject data) {
        if (instance != null) {
            JSObject event = new JSObject();
            event.put("title", title != null ? title : "");
            event.put("body", body != null ? body : "");
            if (data != null) {
                event.put("data", data);
            }
            instance.notifyListeners("pushNotificationReceived", event);
        }
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        try {
            FirebaseMessaging.getInstance().getToken()
                .addOnSuccessListener(token -> {
                    JSObject result = new JSObject();
                    result.put("token", token);
                    call.resolve(result);
                    Log.i(TAG, "FCM token retrieved successfully");
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            int status = getActivity().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS);
            result.put("receive", status == PackageManager.PERMISSION_GRANTED ? "granted" : "prompt");
        } else {
            result.put("receive", "granted");
        }
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            super.requestPermissionForAlias("notifications", call, "permissionCallback");
        } else {
            JSObject result = new JSObject();
            result.put("receive", "granted");
            call.resolve(result);
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            int status = getActivity().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS);
            result.put("receive", status == PackageManager.PERMISSION_GRANTED ? "granted" : "denied");
        } else {
            result.put("receive", "granted");
        }
        call.resolve(result);
    }
}
