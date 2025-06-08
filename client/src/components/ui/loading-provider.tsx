import { createContext, useContext, useState, ReactNode } from "react";
import { LoadingScreen } from "./loading-screen";

interface LoadingContextType {
  showLoading: (variant?: "mom" | "family" | "calendar" | "tasks" | "default", message?: string, duration?: number) => void;
  hideLoading: () => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [loading, setLoading] = useState<{
    visible: boolean;
    variant: "mom" | "family" | "calendar" | "tasks" | "default";
    message?: string;
    duration?: number;
  }>({
    visible: false,
    variant: "default",
    duration: 0,
  });

  const showLoading = (
    variant: "mom" | "family" | "calendar" | "tasks" | "default" = "default",
    message?: string,
    duration: number = 0
  ) => {
    setLoading({ visible: true, variant, message, duration });
  };

  const hideLoading = () => {
    setLoading(prev => ({ ...prev, visible: false }));
  };

  return (
    <LoadingContext.Provider value={{ 
      showLoading, 
      hideLoading, 
      isLoading: loading.visible 
    }}>
      {children}
      {loading.visible && (
        <LoadingScreen
          variant={loading.variant}
          message={loading.message}
          duration={loading.duration}
          onComplete={hideLoading}
        />
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}