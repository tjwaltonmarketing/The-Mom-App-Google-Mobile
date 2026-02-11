import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Bell, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkPushPermissionStatus, requestAndRegisterPush, openNotificationSettings } from "@/services/push-notifications";

export function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSettingsOption, setShowSettingsOption] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const dismissed = localStorage.getItem("push_prompt_dismissed");
    if (dismissed) return;

    checkPushPermissionStatus().then((status) => {
      if (status !== "granted") {
        setVisible(true);
        if (status === "denied") {
          setShowSettingsOption(true);
        }
      }
    });
  }, []);

  if (!visible) return null;

  const handleEnable = async () => {
    setLoading(true);
    try {
      const success = await requestAndRegisterPush();
      if (success) {
        setVisible(false);
      } else {
        setShowSettingsOption(true);
      }
    } catch {
      setShowSettingsOption(true);
    }
    setLoading(false);
  };

  const handleOpenSettings = async () => {
    await openNotificationSettings();
  };

  const handleDismiss = () => {
    localStorage.setItem("push_prompt_dismissed", "true");
    setVisible(false);
  };

  return (
    <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
      <div className="rounded-full bg-primary/10 p-2 mt-0.5">
        <Bell className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">Turn on notifications</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Get reminders about tasks, events, and family updates — even when the app is closed.
        </p>
        <div className="flex gap-2 mt-3">
          {showSettingsOption ? (
            <Button size="sm" onClick={handleOpenSettings}>
              <Settings className="h-4 w-4 mr-1" />
              Open Settings
            </Button>
          ) : (
            <Button size="sm" onClick={handleEnable} disabled={loading}>
              {loading ? "Setting up…" : "Enable"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            Not now
          </Button>
        </div>
      </div>
      <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
