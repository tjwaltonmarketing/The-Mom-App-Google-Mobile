import { useEffect, useRef, useState, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

export function usePullToRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const THRESHOLD = 80;
  const MAX_PULL = 120;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
    } catch (e) {}
    setTimeout(() => {
      setIsRefreshing(false);
      setPullDistance(0);
    }, 500);
  }, []);

  useEffect(() => {
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop <= 0) {
        startY = e.touches[0].clientY;
        touchStartY.current = startY;
        isPulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop > 0) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;
      if (diff > 0) {
        const distance = Math.min(diff * 0.4, MAX_PULL);
        setPullDistance(distance);
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const onTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;
      if (pullDistance >= THRESHOLD && !isRefreshing) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [isRefreshing, pullDistance, handleRefresh]);

  return { isRefreshing, pullDistance, threshold: THRESHOLD };
}
