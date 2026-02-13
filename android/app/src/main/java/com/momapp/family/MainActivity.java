package com.momapp.family;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.Manifest;
import android.os.Bundle;
import android.util.Log;
import android.webkit.PermissionRequest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MomApp";
    private static final int MICROPHONE_PERMISSION_REQUEST_CODE = 1001;
    private PermissionRequest pendingPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(FCMPlugin.class);
        handleNotificationIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleNotificationIntent(intent);
    }

    private void handleNotificationIntent(Intent intent) {
        if (intent == null) return;
        String fromNotification = intent.getStringExtra("fromNotification");
        if (!"true".equals(fromNotification)) return;

        try {
            String type = intent.getStringExtra("type");
            String route = "/";
            if ("task".equals(type)) {
                route = "/teen/tasks";
            } else if ("event".equals(type)) {
                route = "/teen/calendar";
            } else if ("notification".equals(type)) {
                route = "/teen";
            }

            final String targetRoute = route;
            getBridge().getWebView().post(() -> {
                try {
                    getBridge().getWebView().evaluateJavascript(
                        "window.__NOTIFICATION_ROUTE__ = '" + targetRoute + "'; " +
                        "if (window.__NOTIFICATION_HANDLER__) { window.__NOTIFICATION_HANDLER__('" + targetRoute + "'); }",
                        null
                    );
                    Log.i(TAG, "Notification route injected: " + targetRoute);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to inject notification route: " + e.getMessage());
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error handling notification intent: " + e.getMessage());
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == MICROPHONE_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                    pendingPermissionRequest = null;
                }
            } else {
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.deny();
                    pendingPermissionRequest = null;
                }
            }
        }
    }

    public void requestMicrophonePermission(PermissionRequest request) {
        pendingPermissionRequest = request;
        
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) 
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, 
                new String[]{Manifest.permission.RECORD_AUDIO}, 
                MICROPHONE_PERMISSION_REQUEST_CODE);
        } else {
            request.grant(request.getResources());
        }
    }
}
