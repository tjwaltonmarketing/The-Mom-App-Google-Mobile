import { Play, X } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export function VideoBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("video_banner_dismissed") === "true"
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem("video_banner_dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="relative flex items-center gap-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl px-4 py-3 shadow-sm mb-4">
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        <Play className="w-4 h-4 fill-white text-white" />
      </div>
      <Link href="/video-tutorials" className="flex-1 min-w-0">
        <p className="font-semibold text-sm">New here? Watch this video to get started!</p>
        <p className="text-xs text-white/80">Learn how to get the most out of The Mom App</p>
      </Link>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
