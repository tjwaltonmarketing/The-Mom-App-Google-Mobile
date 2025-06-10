import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MealPlanning } from "@/components/dashboard/meal-planning";
import { useState } from "react";
import { VoiceNoteModal } from "@/components/voice-note-modal";

export default function MealPlanPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <MealPlanning />
      </main>

      <MobileNav />
      <VoiceNoteModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
      />
    </div>
  );
}