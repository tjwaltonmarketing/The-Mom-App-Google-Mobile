import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, Bell, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import type { FamilyMember } from "@shared/schema";

interface HeaderProps {
  onStartVoiceNote: () => void;
}

export function Header({ onStartVoiceNote }: HeaderProps) {
  const [dndEnabled, setDndEnabled] = useState(false);

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  return (
    <header className="bg-white dark:bg-card blue-light-filter:bg-card shadow-sm border-b border-gray-200 dark:border-border blue-light-filter:border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Home className="text-primary text-2xl" />
              <h1 className="text-xl font-bold text-primary">The Mom App</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a href="#" className="text-primary font-medium border-b-2 border-primary pb-1">
                Dashboard
              </a>
              <a href="#" className="text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-600 hover:text-primary transition-colors">
                Calendar
              </a>
              <a href="#" className="text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-600 hover:text-primary transition-colors">
                Tasks
              </a>
              <a href="#" className="text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-600 hover:text-primary transition-colors">
                Meal Plan
              </a>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Do Not Disturb Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-600">DND</span>
              <Switch
                checked={dndEnabled}
                onCheckedChange={setDndEnabled}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Voice Note Button */}
            <Button
              onClick={onStartVoiceNote}
              className="bg-accent hover:bg-orange-400 text-white p-2 rounded-full transition-colors"
              size="icon"
            >
              <Mic className="h-4 w-4" />
            </Button>
            
            {/* Notifications */}
            <div className="relative">
              <Button variant="ghost" size="icon" className="text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary blue-light-filter:text-gray-600 blue-light-filter:hover:text-primary">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-error text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  3
                </span>
              </Button>
            </div>
            
            {/* Family Members Quick Access */}
            <div className="flex items-center space-x-1">
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
          </div>
        </div>
      </div>
    </header>
  );
}
