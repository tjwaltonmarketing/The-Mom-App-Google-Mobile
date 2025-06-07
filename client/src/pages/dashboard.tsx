import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { TodaySchedule } from "@/components/dashboard/today-schedule";
import { QuickTasks } from "@/components/dashboard/quick-tasks";
import { VoiceNotes } from "@/components/dashboard/voice-notes";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { FamilyProgress } from "@/components/dashboard/family-progress";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { NotificationDemo } from "@/components/dashboard/notification-demo";
import { PasswordVault } from "@/components/dashboard/password-vault";
import { TrialBanner } from "@/components/dashboard/trial-banner";
import { TutorialCards } from "@/components/dashboard/tutorial-cards";
import { VoiceNoteModal } from "@/components/voice-note-modal";
import { MindfulUsage } from "@/components/mindful-usage";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <WelcomeHeader />
        
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="passwords">Password Vault</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <div className="mb-6">
              <TrialBanner />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                <TodaySchedule />
                <QuickTasks />
                <VoiceNotes onStartRecording={() => setIsVoiceModalOpen(true)} />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <TutorialCards />
                <NotificationDemo />
                <WeatherWidget />
                <FamilyProgress />
                <QuickActions />
                <UpcomingDeadlines />
              </div>
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
    </div>
  );
}
