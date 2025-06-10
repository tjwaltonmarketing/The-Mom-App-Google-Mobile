import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Notification } from "@shared/schema";

export function useNotifications() {
  const [lastCheck, setLastCheck] = useState(new Date());
  const { toast } = useToast();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications/pending"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Request notification permission on first load
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Check for due notifications
  useEffect(() => {
    const now = new Date();
    const dueNotifications = notifications.filter(notification => {
      const scheduledTime = new Date(notification.scheduledFor);
      return scheduledTime <= now && scheduledTime > lastCheck;
    });

    dueNotifications.forEach(notification => {
      // Show toast notification
      toast({
        title: notification.title,
        description: notification.message,
        duration: 8000,
      });

      // Show browser notification if permission granted
      if ("Notification" in window && Notification.permission === "granted") {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
          tag: `notification-${notification.id}`,
        });

        // Auto-close after 8 seconds
        setTimeout(() => {
          browserNotification.close();
        }, 8000);
      }
    });

    if (dueNotifications.length > 0) {
      setLastCheck(now);
    }
  }, [notifications, lastCheck, toast]);

  return {
    notifications,
    pendingCount: notifications.length,
  };
}