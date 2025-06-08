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
    <header className="md:hidden bg-white dark:bg-card shadow-sm border-b border-gray-200 dark:border-border sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Logo className="h-8 w-8 flex-shrink-0" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white font-logo uppercase">THE MOM APP</h1>
          </Link>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={onStartVoiceNote}
              className="bg-accent hover:bg-accent/90 text-white"
              size="sm"
            >
              <Mic className="h-4 w-4" />
            </Button>
            
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
              <Link href="/ai-assistant">
                <Bot className="h-4 w-4" />
              </Link>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
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