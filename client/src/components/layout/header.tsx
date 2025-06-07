import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, Bell, Mic, Settings, Crown, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
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

interface HeaderProps {
  onStartVoiceNote: () => void;
}

export function Header({ onStartVoiceNote }: HeaderProps) {
  const [dndEnabled, setDndEnabled] = useState(false);
  const [location] = useLocation();

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  return (
    <header className="bg-white dark:bg-card blue-light-filter:bg-card shadow-sm border-b border-gray-200 dark:border-border blue-light-filter:border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
              <Logo className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0" />
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white blue-light-filter:text-gray-900 truncate">The Mom App</h1>
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
              <Link href="/meal-plan" className={location === "/meal-plan" ? "text-primary font-medium border-b-2 border-primary pb-1" : "text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-600 hover:text-primary transition-colors"}>
                Meal Plan
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Do Not Disturb Toggle - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-600">DND</span>
              <Switch
                checked={dndEnabled}
                onCheckedChange={setDndEnabled}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            
            {/* Theme Toggle - Hidden on mobile */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            
            {/* Voice Note Button */}
            <Button
              onClick={onStartVoiceNote}
              className="bg-accent hover:bg-orange-400 text-white p-2 rounded-full transition-colors"
              size="icon"
            >
              <Mic className="h-4 w-4" />
            </Button>

            {/* AI Assistant Button */}
            <Button asChild className="bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-2 rounded-full transition-colors" size="icon">
              <Link href="/ai-assistant">
                <Bot className="h-4 w-4" />
              </Link>
            </Button>
            
            {/* Notifications - Hidden on mobile */}
            <div className="relative hidden sm:block">
              <Button variant="ghost" size="icon" className="text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary blue-light-filter:text-gray-600 blue-light-filter:hover:text-primary">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-error text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  3
                </span>
              </Button>
            </div>
            
            {/* Family Members Quick Access - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-1">
              {familyMembers.map((member) => (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: member.color }}
                >
                  {member.avatar}
                </div>
              ))}
            </div>

            {/* Settings Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Family Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  App Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
