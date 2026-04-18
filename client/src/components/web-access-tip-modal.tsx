import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Monitor, ExternalLink, Bell, ChevronRight, CheckCircle2, Settings, Sun, Moon, Check } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { requestAndRegisterPush, openNotificationSettings, checkPushPermissionStatus } from "@/services/push-notifications";
import { useTheme } from "@/components/theme-provider";

const STORAGE_KEY = "onboarding_slides_shown";

function isMobileOrApp(): boolean {
  if (Capacitor.isNativePlatform()) {
    return true;
  }
  const userAgent = navigator.userAgent || navigator.vendor;
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent);
}

export function WebAccessTipModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [enableLoading, setEnableLoading] = useState(false);
  const [notifResult, setNotifResult] = useState<"idle" | "success" | "failed">("idle");
  const isNative = Capacitor.isNativePlatform();
  const { theme, setTheme } = useTheme();

  // Slide 0: theme picker (everyone)
  // Slide 1: web browser tip (mobile/app only)
  // Slide 2: notifications (native only)
  const totalSlides = isNative ? 3 : isMobileOrApp() ? 2 : 1;

  useEffect(() => {
    const hasSeenSlides = localStorage.getItem(STORAGE_KEY);
    const hasSeenOldTip = localStorage.getItem("web_access_tip_shown");
    if (!hasSeenSlides) {
      // If they've already seen the old web tip but not the new sequence,
      // skip to the right slide for native users
      if (hasSeenOldTip && isNative) {
        setCurrentSlide(2);
      }
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isNative]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.setItem("push_prompt_dismissed", "true");
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleDismiss();
    }
  };

  const handleEnableNotifications = async () => {
    setEnableLoading(true);
    let settled = false;
    const resolveResult = async () => {
      if (settled) return;
      settled = true;
      try {
        const actualStatus = await checkPushPermissionStatus();
        console.log("Onboarding: final permission status =", actualStatus);
        setNotifResult(actualStatus === "granted" ? "success" : "failed");
      } catch {
        setNotifResult("failed");
      }
      setEnableLoading(false);
    };
    const safetyTimeout = setTimeout(resolveResult, 8000);
    try {
      console.log("Onboarding: enabling notifications...");
      const success = await requestAndRegisterPush();
      clearTimeout(safetyTimeout);
      console.log("Onboarding: enable result =", success);
      if (success) {
        settled = true;
        setNotifResult("success");
        setEnableLoading(false);
      } else {
        await resolveResult();
      }
    } catch (err) {
      clearTimeout(safetyTimeout);
      console.error("Onboarding: enable error:", err);
      await resolveResult();
    }
  };

  const handleOpenSettings = async () => {
    await openNotificationSettings();
  };

  const dotCount = isNative ? 3 : isMobileOrApp() ? 2 : 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">

        {/* Slide 0 — Theme picker (all platforms) */}
        {currentSlide === 0 && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-center mb-1">How would you like the app to look?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-5">Pick what feels right. You can always change it later.</p>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <button
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${theme === "light" ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20 shadow-md" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"}`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${theme === "light" ? "bg-pink-100" : "bg-gray-100 dark:bg-gray-800"}`}>
                  <Sun className={`h-7 w-7 ${theme === "light" ? "text-pink-500" : "text-gray-400"}`} />
                </div>
                <span className={`font-semibold text-base ${theme === "light" ? "text-pink-600" : "text-gray-600 dark:text-gray-300"}`}>Light</span>
                <span className="text-xs text-gray-400 leading-tight text-center">Clean &amp; bright</span>
                {theme === "light" && (
                  <div className="w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>

              <button
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${theme === "dark" ? "border-pink-500 bg-gray-800 shadow-md" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"}`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-gray-700" : "bg-gray-100 dark:bg-gray-800"}`}>
                  <Moon className={`h-7 w-7 ${theme === "dark" ? "text-pink-400" : "text-gray-400"}`} />
                </div>
                <span className={`font-semibold text-base ${theme === "dark" ? "text-pink-300" : "text-gray-600 dark:text-gray-300"}`}>Dark</span>
                <span className="text-xs text-gray-400 leading-tight text-center">Easy on the eyes</span>
                {theme === "dark" && (
                  <div className="w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-5">
              You can change this later in Settings if need be.
            </p>

            <div className="flex items-center justify-between">
              {dotCount > 1 && (
                <div className="flex gap-1.5">
                  {Array.from({ length: dotCount }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === currentSlide
                          ? "w-6 bg-pink-600"
                          : "w-1.5 bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                  ))}
                </div>
              )}
              <Button
                onClick={handleNext}
                className="ml-auto bg-pink-600 hover:bg-pink-700"
              >
                {theme === "dark" ? "Dark it is!" : "Light it is!"}
                {dotCount > 1 && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        )}

        {/* Slide 1 — Web browser tip (mobile/app only) */}
        {currentSlide === 1 && isMobileOrApp() && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
                <Monitor className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              </div>
              <h2 className="text-xl font-semibold">Did You Know?</h2>
            </div>
            <div className="space-y-4 text-left">
              <p className="text-base text-gray-700 dark:text-gray-300">
                You can also log in to your account from a web browser! This is great for:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                <li>Easy printing of schedules and lists</li>
                <li>Managing your family from work</li>
                <li>Using a larger screen for planning</li>
              </ul>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Just visit:</p>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-pink-600 dark:text-pink-400 text-lg">themom.app</span>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Select "Login" from the navigation menu and use your normal credentials.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-1.5">
                {Array.from({ length: dotCount }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentSlide
                        ? "w-6 bg-pink-600"
                        : "w-1.5 bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                ))}
              </div>
              <Button
                onClick={handleNext}
                className="ml-auto bg-pink-600 hover:bg-pink-700"
              >
                {isNative ? (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  "Okay, got it!"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Slide 2 — Notifications (native only) */}
        {currentSlide === 2 && isNative && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
                <Bell className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              </div>
              <h2 className="text-xl font-semibold">Stay in the Loop</h2>
            </div>
            <div className="space-y-4 text-left">
              <p className="text-base text-gray-700 dark:text-gray-300">
                Enable notifications so The Mom App can work at its best:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm">⏰</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Task Reminders</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Never forget a task — get gentle nudges before deadlines</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm">👨‍👩‍👧‍👦</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Family Updates</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Know when tasks are completed or new events are added</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm">📅</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Calendar Alerts</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Upcoming events and schedule changes, right to your phone</p>
                  </div>
                </div>
              </div>

              {notifResult === "success" && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">Notifications enabled! You're all set.</p>
                </div>
              )}

              {notifResult === "failed" && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                    We couldn't enable notifications automatically. You can turn them on in your phone's settings:
                  </p>
                  <Button size="sm" variant="outline" onClick={handleOpenSettings} className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Open Phone Settings
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-1.5">
                {Array.from({ length: dotCount }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentSlide
                        ? "w-6 bg-pink-600"
                        : "w-1.5 bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {notifResult === "idle" && (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleDismiss}>
                      Skip
                    </Button>
                    <Button
                      onClick={handleEnableNotifications}
                      disabled={enableLoading}
                      className="bg-pink-600 hover:bg-pink-700"
                    >
                      {enableLoading ? "Setting up…" : "Enable Notifications"}
                    </Button>
                  </>
                )}
                {notifResult === "success" && (
                  <Button onClick={handleDismiss} className="bg-pink-600 hover:bg-pink-700">
                    Done
                  </Button>
                )}
                {notifResult === "failed" && (
                  <Button onClick={handleDismiss} className="bg-pink-600 hover:bg-pink-700">
                    Continue
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
