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
  Eye,
  CheckSquare
} from "lucide-react";
import { useState } from "react";
import TeenNotifications from "./teen-notifications";

interface TeenNavigationProps {
  currentPath: string;
  teenProfile?: any; // Teen profile data including avatar
}

export default function TeenNavigation({ currentPath, teenProfile }: TeenNavigationProps) {
  const [, setLocation] = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [blueLight, setBlueLight] = useState(false);

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
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto">
        {/* Top Header with Profile & Controls */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-100">
          {/* App Branding + Profile Section */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            {/* The Mom App Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Logo className="h-7 w-7 sm:h-8 sm:w-8" />
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white font-logo uppercase">THE MOM APP</h1>
            </div>
            
            {/* Profile Section */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {teenProfile?.avatar ? (
                <img 
                  src={teenProfile.avatar} 
                  alt="Profile"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                />
              ) : (
                <div 
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-semibold border-2 border-gray-200 flex-shrink-0"
                  style={{ backgroundColor: teenProfile?.favoriteColor || "#a855f7" }}
                >
                  {teenProfile?.firstName?.charAt(0) || "A"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-lg font-semibold truncate">Hey, {teenProfile?.firstName || "Adri"}!</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Family Helper</p>
              </div>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Dark Mode Toggle - Hidden on mobile, visible on tablet+ */}
            <Button 
              variant={darkMode ? "default" : "ghost"} 
              size="sm"
              onClick={() => {
                setDarkMode(!darkMode);
                document.documentElement.classList.toggle('dark', !darkMode);
              }}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="hidden sm:flex h-8 w-8 p-0"
            >
              {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
            
            {/* Blue Light Filter Toggle - Hidden on mobile, visible on tablet+ */}
            <Button 
              variant={blueLight ? "default" : "ghost"} 
              size="sm"
              onClick={() => {
                setBlueLight(!blueLight);
                const filter = blueLight ? 'none' : 'sepia(10%) saturate(120%) hue-rotate(15deg)';
                document.documentElement.style.filter = filter;
              }}
              title={blueLight ? "Turn Off Blue Light Filter" : "Turn On Blue Light Filter"}
              className="hidden sm:flex h-8 w-8 p-0"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            
            <TeenNotifications />
            
            {/* Tutorial Button - Hidden on mobile, shown on tablet+ */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/teen-tutorial")}
              title="View Tutorial"
              className="hidden sm:flex h-8 w-8 p-0"
            >
              <BookOpen className="h-3.5 w-3.5" />
            </Button>
            
            {/* Settings Button - Always visible but smaller */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/teen-profile")}
              title="Settings"
              className="h-8 w-8 p-0"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            
            {/* Logout Button - Hidden on mobile, shown on tablet+ */}
            <Button 
              variant="ghost" 
              size="sm"
              title="Logout"
              className="hidden md:flex h-8 w-8 p-0"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "default" : "ghost"}
                onClick={() => setLocation(item.path)}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-none border-b-2 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base ${
                  isActive 
                    ? "border-primary bg-primary text-primary-foreground" 
                    : "border-transparent hover:border-gray-300"
                }`}
              >
                <span className="h-3.5 w-3.5 sm:h-4 sm:w-4">
                  {item.icon}
                </span>
                <span className="hidden xs:inline sm:inline">
                  {item.label}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}