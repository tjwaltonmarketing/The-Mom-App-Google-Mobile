package com.momapp.family;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MomApp";
    private static final int MICROPHONE_PERMISSION_REQUEST_CODE = 1001;
    private PermissionRequest pendingPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this);
                Log.i(TAG, "Firebase initialized successfully");
            } else {
                Log.i(TAG, "Firebase already initialized");
            }
        } catch (Exception e) {
            Log.e(TAG, "Firebase initialization failed (non-fatal): " + e.getMessage());
        }

        createNotificationChannel();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                NotificationChannel channel = new NotificationChannel(
                    "mom_app_notifications",
                    "Mom App Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Task reminders, event alerts, and family updates");
                channel.enableVibration(true);
                channel.setShowBadge(true);

                NotificationManager manager = getSystemService(NotificationManager.class);
                if (manager != null) {
                    manager.createNotificationChannel(channel);
                    Log.i(TAG, "Notification channel created");
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to create notification channel: " + e.getMessage());
            }
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
