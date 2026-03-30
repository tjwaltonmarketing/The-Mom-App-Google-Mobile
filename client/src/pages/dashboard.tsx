import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { TodaySchedule } from "@/components/dashboard/today-schedule";
import { QuickTasks } from "@/components/dashboard/quick-tasks";
import { VoiceNotes } from "@/components/dashboard/voice-notes";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { FamilyPoints } from "@/components/dashboard/family-points";
import { PasswordVault } from "@/components/dashboard/password-vault";
import { TrialBanner } from "@/components/dashboard/trial-banner";
import { VideoBanner } from "@/components/dashboard/video-banner";
import { FamilyDishwasher } from "@/components/family-dishwasher";
import { VoiceNoteModal } from "@/components/voice-note-modal";
import { MindfulUsage } from "@/components/mindful-usage";
import { FeedbackPromptModal } from "@/components/feedback-prompt-modal";
import { WebAccessTipModal } from "@/components/web-access-tip-modal";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-36 lg:pb-6">
        {/* Mobile: Video + Trial Banners at top */}
        <div className="md:hidden">
          <VideoBanner />
          <TrialBanner />
        </div>
        
        <WelcomeHeader onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
        
        
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="w-full mb-6 h-auto p-1">
            <div className="grid grid-cols-2 gap-1 w-full">
              <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Dashboard</TabsTrigger>
              <TabsTrigger value="passwords" className="text-xs sm:text-sm">Passwords</TabsTrigger>
            </div>
          </TabsList>
          
          <TabsContent value="dashboard">
            {/* Desktop: Video + Trial Banners */}
            <div className="hidden md:block mb-6">
              <VideoBanner />
              <TrialBanner />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                <WeatherWidget />
                <TodaySchedule />
                <QuickTasks />
                <VoiceNotes onStartRecording={() => setIsVoiceModalOpen(true)} />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <FamilyDishwasher 
                  apiEndpoint="/api/household-settings" 
                  updateEndpoint="/api/household-settings/dishwasher" 
                />
              </div>
            </div>
            
            {/* Family Points at Bottom */}
            <div className="mt-6">
              <FamilyPoints />
            </div>
          </TabsContent>
          
          <TabsContent value="passwords">
            <PasswordVault />
          </TabsContent>
        </Tabs>
      </main>

      <VoiceNoteModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
      />
      
      <MindfulUsage />
      <FeedbackPromptModal />
      <WebAccessTipModal />

      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border/40 mt-4">
        <a href="/privacy" className="hover:underline">Privacy Policy</a>
        <span className="mx-2">·</span>
        <a href="/terms" className="hover:underline">Terms of Service</a>
      </footer>
    </div>
  );
}
