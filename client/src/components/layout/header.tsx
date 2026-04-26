import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, Bell, Mic, Settings, Crown, User, Bot, HelpCircle, BookOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Link, useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { FamilyMember } from "@shared/schema";
import { Logo } from "@/components/logo";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  onStartVoiceNote: () => void;
}

export function Header({ onStartVoiceNote }: HeaderProps) {
  const [dndEnabled, setDndEnabled] = useState(false);
  const [location] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const handleSignOut = () => {
    logout();
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out.",
    });
  };

  return (
    <header className="bg-white dark:bg-card blue-light-filter:bg-card shadow-sm border-b border-gray-200 dark:border-border blue-light-filter:border-border sticky top-0 z-50 ios-safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
              <Logo className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 flex-shrink-0" />
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white blue-light-filter:text-gray-900 truncate font-logo uppercase">THE MOM APP</h1>
            </Link>
            <nav className="hidden lg:flex space-x-4 xl:space-x-6">
              <Link href="/" className={location === "/" ? "text-primary font-medium border-b-2 border-primary pb-1" : "text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-600 hover:text-primary transition-colors"}>
                Dashboard
              </Link>
              <Link href="/calendar" className={location === "/calendar" ? "text-primary font-medium border-b-2 border-primary pb-1" : "text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-600 hover:text-primary transition-colors"}>
                Calendar
              </Link>
              <Link href="/tasks" className={location === "/tasks" ? "text-primary font-medium border-b-2 border-primary pb-1" : "text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-600 hover:text-primary transition-colors"}>
                Tasks
              </Link>
              <Link href="/notes" className={location === "/notes" ? "text-primary font-medium border-b-2 border-primary pb-1" : "text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-600 hover:text-primary transition-colors"}>
                Notes
              </Link>
              <Link href="/meal-plan" className={location === "/meal-plan" ? "text-primary font-medium border-b-2 border-primary pb-1" : "text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-600 hover:text-primary transition-colors"}>
                Meal Plan
              </Link>
            </nav>
          </div>
          
          {/* Spacer to push everything to the right */}
          <div className="flex-1"></div>
          
          {/* Desktop: Action buttons - circular design */}
          <div className="hidden md:flex items-center space-x-3">
            <Button
              onClick={onStartVoiceNote}
              size="sm"
              className="bg-accent hover:bg-orange-400 text-white w-11 h-11 p-0 rounded-full shadow-md"
            >
              <Mic className="h-6 w-6" />
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white w-11 h-11 p-0 rounded-full shadow-md">
              <Link href="/ai-assistant">
                <Bot className="h-6 w-6" />
              </Link>
            </Button>
          </div>
          
          {/* User Name and Settings */}
          <div className="flex items-center space-x-3 ml-4">
            <NotificationBell />
            
            {/* User Name Display */}
            {user && (
              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 blue-light-filter:text-gray-700">
                <User className="h-4 w-4 mr-1" />
                {/* Mobile: Show only first name, Desktop: Show full name */}
                <span className="font-medium">
                  <span className="sm:hidden">{user.firstName}</span>
                  <span className="hidden sm:inline">{user.firstName} {user.lastName}</span>
                </span>
              </div>
            )}
            
            {/* Settings Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/tutorials" className="w-full flex items-center">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Tutorials & Help
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/ai-assistant" className="w-full flex items-center">
                    <Bot className="mr-2 h-4 w-4" />
                    AI Assistant
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/subscription" className="w-full flex items-center">
                    <Crown className="mr-2 h-4 w-4" />
                    Subscription
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="w-full flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    App Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings?tab=family" className="w-full flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Family Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="w-full flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? "Signing Out..." : "Sign Out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
