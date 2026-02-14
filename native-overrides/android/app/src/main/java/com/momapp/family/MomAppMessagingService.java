package com.momapp.family;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class MomAppMessagingService extends FirebaseMessagingService {
    private static final String TAG = "MomAppFCM";
    private static final String CHANNEL_ID = "mom_app_notifications";
    private int notificationId = 1000;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.i(TAG, "Push message received");

        String title = null;
        String body = null;

        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle();
            body = remoteMessage.getNotification().getBody();
        }

        Map<String, String> messageData = remoteMessage.getData();

        if (title == null || title.isEmpty()) {
            title = messageData.getOrDefault("title", "The Mom App");
        }
        if (body == null || body.isEmpty()) {
            body = messageData.getOrDefault("body", "");
        }

        showNotification(title, body, messageData);

        if (FCMPlugin.getInstance() != null) {
            JSObject data = new JSObject();
            for (Map.Entry<String, String> entry : messageData.entrySet()) {
                data.put(entry.getKey(), entry.getValue());
            }
            FCMPlugin.onPushReceived(title, body, data);
        }
    }

    private void showNotification(String title, String body, Map<String, String> data) {
        try {
            ensureChannel();

            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            intent.putExtra("fromNotification", "true");

            if (data != null) {
                for (Map.Entry<String, String> entry : data.entrySet()) {
                    intent.putExtra(entry.getKey(), entry.getValue());
                }
            }

            int currentId = notificationId++;
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(this, currentId, intent, flags);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.themomappicon)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setDefaults(NotificationCompat.DEFAULT_ALL);

            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.notify(currentId, builder.build());
                Log.i(TAG, "Notification displayed: " + title);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to show notification: " + e.getMessage());
        }
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null && manager.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Mom App Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Task reminders, event alerts, and family updates");
                channel.enableVibration(true);
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.i(TAG, "New FCM token generated");
        FCMPlugin.onNewFCMToken(token);
    }
}
