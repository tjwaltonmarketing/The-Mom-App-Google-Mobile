import { RefreshCw } from "lucide-react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

export function PullToRefreshIndicator() {
  const { isRefreshing, pullDistance, threshold } = usePullToRefresh();

  if (pullDistance <= 5 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center pointer-events-none"
      style={{
        height: isRefreshing ? 48 : Math.max(pullDistance, 0),
        transition: isRefreshing ? "height 0.2s ease" : "none",
        opacity: Math.min(progress * 1.5, 1),
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg p-2 flex items-center gap-2">
        <RefreshCw
          className={`h-4 w-4 text-pink-500 ${isRefreshing ? "animate-spin" : ""}`}
          style={{ transform: isRefreshing ? undefined : `rotate(${rotation}deg)` }}
        />
        {isRefreshing && (
          <span className="text-xs text-pink-500 font-medium pr-1">Refreshing...</span>
        )}
      </div>
    </div>
  );
}
