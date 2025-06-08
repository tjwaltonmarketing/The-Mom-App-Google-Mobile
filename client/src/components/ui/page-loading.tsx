import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useLoading } from "./loading-provider";

const PAGE_LOADING_VARIANTS = {
  "/": "family",
  "/calendar": "calendar", 
  "/tasks": "tasks",
  "/meal-plan": "mom",
  "/ai-assistant": "mom",
  "/settings": "family"
} as const;

export function PageLoadingHandler() {
  const [location] = useLocation();
  const { showLoading } = useLoading();
  const lastLocationRef = useRef<string>("");

  useEffect(() => {
    // Only trigger loading if location actually changed
    if (location !== lastLocationRef.current) {
      lastLocationRef.current = location;
      const variant = PAGE_LOADING_VARIANTS[location as keyof typeof PAGE_LOADING_VARIANTS] || "default";
      
      // Show loading screen for 1.5 seconds on page navigation
      showLoading(variant, undefined, 1500);
    }
  }, [location]); // Removed showLoading from dependencies to prevent loop

  return null;
}