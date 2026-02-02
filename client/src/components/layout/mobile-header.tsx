import { useState } from "react";
import { Mic, Settings, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/logo";

interface MobileHeaderProps {
  onStartVoiceNote: () => void;
}

export function MobileHeader({ onStartVoiceNote }: MobileHeaderProps) {
  return (
    <header className="lg:hidden bg-white dark:bg-card shadow-sm border-b border-gray-200 dark:border-border sticky top-0 z-50 mobile-container ios-safe-top">
      <div className="px-3 py-3">
        <div className="flex justify-between items-center max-w-full min-w-0">
          <Link href="/" className="flex items-center space-x-2 min-w-0 flex-1">
            <Logo className="h-8 w-8 flex-shrink-0" />
            <h1 className="text-base mobile-header-text font-bold text-gray-900 dark:text-white font-logo uppercase truncate">THE MOM APP</h1>
          </Link>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button
              onClick={onStartVoiceNote}
              className="bg-accent hover:bg-accent/90 text-white p-2 h-8 w-8"
              size="sm"
            >
              <Mic className="h-3 w-3" />
            </Button>
            
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 h-8 w-8" size="sm">
              <Link href="/ai-assistant">
                <Bot className="h-3 w-3" />
              </Link>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-2 h-8 w-8" size="sm">
                  <Settings className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/subscription" className="w-full flex items-center">
                    Subscription
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Profile Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}