import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Eye
} from "lucide-react";
import { useState } from "react";
import TeenNotifications from "./teen-notifications";

interface TeenNavigationProps {
  currentPath: string;
}

export default function TeenNavigation({ currentPath }: TeenNavigationProps) {
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
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          {/* Profile Section */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
              A
            </div>
            <div>
              <h1 className="text-lg font-semibold">Hey, Adri!</h1>
              <p className="text-sm text-gray-600">Family Helper</p>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            <Button 
              variant={darkMode ? "default" : "ghost"} 
              size="sm"
              onClick={() => {
                setDarkMode(!darkMode);
                document.documentElement.classList.toggle('dark', !darkMode);
              }}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            
            {/* Blue Light Filter Toggle */}
            <Button 
              variant={blueLight ? "default" : "ghost"} 
              size="sm"
              onClick={() => {
                setBlueLight(!blueLight);
                const filter = blueLight ? 'none' : 'sepia(10%) saturate(120%) hue-rotate(15deg)';
                document.documentElement.style.filter = filter;
              }}
              title={blueLight ? "Turn Off Blue Light Filter" : "Turn On Blue Light Filter"}
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            <TeenNotifications />
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/teen-tutorial")}
              title="View Tutorial"
            >
              <BookOpen className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/teen-profile")}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "default" : "ghost"}
                onClick={() => setLocation(item.path)}
                className={`flex items-center gap-2 rounded-none border-b-2 ${
                  isActive 
                    ? "border-primary bg-primary text-primary-foreground" 
                    : "border-transparent hover:border-gray-300"
                }`}
              >
                {item.icon}
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}