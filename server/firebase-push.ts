import admin from "firebase-admin";
import { storage } from "./storage";

let messagingInstance: admin.messaging.Messaging | null = null;
let isInitialized = false;

export function initializeFirebase(): boolean {
  if (isInitialized) return true;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_KEY not set - push notifications disabled");
    return false;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    messagingInstance = admin.messaging();
    isInitialized = true;
    console.log("🔔 Firebase Cloud Messaging initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    return false;
  }
}

export function getMessaging(): admin.messaging.Messaging | null {
  return messagingInstance;
}

export async function sendPushNotification(params: {
  userId: number;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  const { userId, title, body, data } = params;

  if (!messagingInstance) {
    return { success: false, sentCount: 0, failedCount: 0 };
  }

  try {
    const tokens = await storage.getPushTokensByUser(userId);
    const activeTokens = tokens.filter(t => t.isActive && t.token);

    if (activeTokens.length === 0) {
      console.log(`🔕 No active push tokens found for user ${userId} — skipping push`);
      return { success: true, sentCount: 0, failedCount: 0 };
    }

    const tokenStrings = activeTokens.map(t => t.token);

    const message: admin.messaging.MulticastMessage = {
      notification: { title, body },
      data: data || {},
      tokens: tokenStrings,
      android: {
        priority: "high" as const,
        notification: {
          channelId: "mom_app_notifications",
          priority: "high" as const,
          defaultSound: true,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: "default",
            badge: 1,
          },
        },
        headers: {
          "apns-priority": "10",
        },
      },
    };

    const response = await messagingInstance.sendEachForMulticast(message);

    let failedCount = 0;
    if (response.failureCount > 0) {
      const failedTokenIds: number[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          console.warn(`🔴 Push failed for token ID ${activeTokens[idx].id} (${activeTokens[idx].platform}): ${errorCode || resp.error?.message || "unknown error"}`);
          if (
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/registration-token-not-registered"
          ) {
            failedTokenIds.push(activeTokens[idx].id);
          }
          failedCount++;
        }
      });

      for (const tokenId of failedTokenIds) {
        await storage.updatePushToken(tokenId, { isActive: false } as any);
        console.log(`🗑️ Deactivated invalid push token ID: ${tokenId}`);
      }
    }

    console.log(
      `🔔 Push sent to user ${userId}: ${response.successCount} success, ${failedCount} failed`
    );

    return {
      success: response.successCount > 0,
      sentCount: response.successCount,
      failedCount,
    };
  } catch (error) {
    console.error(`Failed to send push notification to user ${userId}:`, error);
    return { success: false, sentCount: 0, failedCount: 0 };
  }
}

export async function sendPushToFamilyMember(params: {
  familyMemberId: number;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  const { familyMemberId, title, body, data } = params;

  const member = await storage.getFamilyMember(familyMemberId);
  if (!member?.userId) {
    return { success: false, sentCount: 0, failedCount: 0 };
  }

  return sendPushNotification({
    userId: member.userId,
    title,
    body,
    data,
  });
}
