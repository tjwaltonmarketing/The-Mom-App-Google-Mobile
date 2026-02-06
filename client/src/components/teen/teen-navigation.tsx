import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { 
  Calendar,
  Lock,
  Home,
  Settings,
  BookOpen,
  Bell,
  LogOut,
  Moon,
  Sun,
  CheckSquare
} from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import TeenNotifications from "./teen-notifications";

interface TeenNavigationProps {
  currentPath: string;
  teenProfile?: any; // Teen profile data including avatar
}

export default function TeenNavigation({ currentPath, teenProfile }: TeenNavigationProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/teen/logout", {});
      return response;
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out",
      });
      // Navigate back to login
      setLocation("/teen-login");
    },
    onError: (error: any) => {
      toast({
        title: "Sign Out Failed", 
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
    },
  });

  const navItems = [
    {
      path: "/teen-dashboard",
      label: "Home",
      icon: <Home className="h-4 w-4" />
    },
    {
      path: "/teen-tasks",
      label: "Tasks", 
      icon: <CheckSquare className="h-4 w-4" />
    },
    {
      path: "/teen-calendar", 
      label: "Calendar",
      icon: <Calendar className="h-4 w-4" />
    },
    {
      path: "/teen-passwords",
      label: "Passwords", 
      icon: <Lock className="h-4 w-4" />
    }
  ];

  return (
    <>
      {/* Top Header - Simplified */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 ios-safe-top">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
            {/* App Branding + Profile Section */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              {/* The Mom App Logo */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Logo className="h-7 w-7 sm:h-8 sm:w-8" />
                <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white font-logo uppercase">THE MOM APP</h1>
              </div>
              
              {/* Profile Section - Avatar + Greeting */}
              <div className="flex items-center gap-2 sm:gap-3">
                {teenProfile?.avatar ? (
                  <img 
                    src={teenProfile.avatar} 
                    alt="Profile"
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 flex-shrink-0"
                  />
                ) : (
                  <div 
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-semibold border-2 border-gray-200 dark:border-gray-600 flex-shrink-0"
                    style={{ backgroundColor: teenProfile?.favoriteColor || "#a855f7" }}
                  >
                    {teenProfile?.firstName?.charAt(0) || "A"}
                  </div>
                )}
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                  Hey, {teenProfile?.firstName || "Adri"}!
                </div>
              </div>
            </div>

            {/* Desktop Controls - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-2">
              <Button 
                variant={theme === "dark" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="h-8 w-8 p-0"
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>
              
              <TeenNotifications />
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/teen-tutorial")}
                title="View Tutorial"
                className="h-8 w-8 p-0"
              >
                <BookOpen className="h-3.5 w-3.5" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/teen-profile")}
                title="Settings"
                className="h-8 w-8 p-0"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                title="Logout"
                className="h-8 w-8 p-0"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Mobile Controls */}
            <div className="md:hidden flex items-center gap-1">
              <Button 
                variant={theme === "dark" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="h-8 w-8 p-0"
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/teen-profile")}
                title="Settings"
                className="h-8 w-8 p-0"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Mobile/Tablet */}
      <nav className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 fixed bottom-0 left-0 right-0 z-50 ios-safe-bottom">
        <div className="flex justify-around py-2 px-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`flex flex-col items-center py-2 px-2 flex-1 ${
                  isActive ? "text-primary" : "text-gray-600 dark:text-gray-400"
                }`}
              >
                <span className="text-lg mb-1">
                  {item.icon}
                </span>
                <span className="text-xs">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Navigation Tabs - Hidden on mobile */}
      <div className="hidden md:block bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center px-4">
            {navItems.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => setLocation(item.path)}
                  className={`flex items-center gap-2 rounded-none border-b-2 px-4 py-3 ${
                    isActive 
                      ? "border-primary bg-primary text-primary-foreground" 
                      : "border-transparent hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}