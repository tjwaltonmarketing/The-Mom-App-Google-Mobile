import { useEffect, useState } from "react";
import logoPath from "@assets/The_Mom_app_(5)_1766014062224.png";

interface SplashScreenProps {
  isLoading: boolean;
  onComplete: () => void;
}

export function SplashScreen({ isLoading, onComplete }: SplashScreenProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Show splash for minimum 1.5 seconds, then fade out
      const timer = setTimeout(() => {
        setFadeOut(true);
        // Complete fade out after animation
        setTimeout(() => {
          setShowSplash(false);
          onComplete();
        }, 500);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isLoading, onComplete]);

  if (!showSplash) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Logo with gentle animation */}
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <img 
            src={logoPath} 
            alt="Logo" 
            className="w-64 h-64 object-contain animate-pulse"
          />
          {/* Subtle glow effect behind the logo */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-200/20 to-purple-200/20 rounded-full blur-xl animate-pulse -z-10" />
        </div>
        
        {/* Loading indicator */}
        <div className="flex items-center space-x-2 mt-8">
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
        </div>
      </div>

      {/* Version info at bottom */}
      <div className="absolute bottom-8 text-center">
        <p className="text-gray-400 text-sm">
          Version 3.0
        </p>
      </div>
    </div>
  );
}