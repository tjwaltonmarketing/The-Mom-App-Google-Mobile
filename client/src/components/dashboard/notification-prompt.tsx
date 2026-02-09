import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { checkPushPermissionStatus, requestAndRegisterPush, initializePushListeners } from "@/services/push-notifications";

const NOTIFICATION_PROMPT_DISMISSED_KEY = "mom_app_notification_prompt_dismissed";

export function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const dismissed = localStorage.getItem(NOTIFICATION_PROMPT_DISMISSED_KEY);
    if (dismissed === "true") {
      initializePushListeners().catch(() => {});
      return;
    }

    checkPushPermissionStatus().then((status) => {
      if (status === "prompt") {
        setVisible(true);
      } else if (status === "granted") {
        initializePushListeners().catch(() => {});
      }
    });
  }, []);

  if (!visible) {
    return null;
  }

  const handleEnable = async () => {
    setLoading(true);
    try {
      await requestAndRegisterPush();
    } catch {
      console.warn("Push notification registration failed");
    }
    setVisible(false);
    localStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_KEY, "true");
    setLoading(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_KEY, "true");
  };

  return (
    <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10 mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 rounded-full p-2 mt-0.5">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground">Stay in the loop</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Get reminders for tasks, events, and family updates so nothing slips through the cracks.
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleEnable}
                disabled={loading}
                className="text-xs h-8"
              >
                {loading ? "Setting up..." : "Enable Notifications"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-xs h-8 text-muted-foreground"
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
