package com.momapp.family;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.util.Log;

import com.google.firebase.FirebaseApp;

public class MomApp extends Application {
    private static final String TAG = "MomApp";

    @Override
    public void onCreate() {
        super.onCreate();

        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this);
                Log.i(TAG, "Firebase initialized in Application.onCreate");
            }
        } catch (Exception e) {
            Log.e(TAG, "Firebase init failed: " + e.getMessage());
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
                    Log.i(TAG, "Notification channel created in Application");
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to create notification channel: " + e.getMessage());
            }
        }
    }
}
