import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Monitor, ExternalLink } from "lucide-react";

const STORAGE_KEY = "web_access_tip_shown";

export function WebAccessTipModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenTip = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenTip) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
              <Monitor className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            </div>
            <DialogTitle className="text-xl">Did You Know?</DialogTitle>
          </div>
          <DialogDescription asChild>
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
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Button 
            onClick={handleDismiss} 
            className="w-full bg-pink-600 hover:bg-pink-700"
          >
            Okay, got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
