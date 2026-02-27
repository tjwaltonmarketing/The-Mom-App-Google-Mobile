import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CheckSquare, Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUserTimezone, COMMON_TIMEZONES, setSavedTimezone, getDeviceTimezone } from "@/lib/timezone";
import { useState, useEffect } from "react";
import { VoiceNoteModal } from "@/components/voice-note-modal";
import { ImportExportModal } from "@/components/import-export-modal";
import { AdvancedTaskManagement } from "@/components/dashboard/advanced-task-management";
import { queryClient } from "@/lib/queryClient";

export default function TasksPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Add pull-to-refresh functionality for mobile users
  useEffect(() => {
    let startY = 0;
    let isRefreshing = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && !isRefreshing) {
        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 100) { // 100px pull threshold
          isRefreshing = true;
          console.log("Pull-to-refresh triggered, refreshing tasks...");
          
          // Refresh all task-related data
          queryClient.refetchQueries({ queryKey: ["/api/tasks"] });
          queryClient.refetchQueries({ queryKey: ["/api/tasks/pending"] });
          queryClient.refetchQueries({ queryKey: ["/api/dashboard/stats"] });
          queryClient.refetchQueries({ queryKey: ["/api/family-members"] });
          
          // Reset flag after delay
          setTimeout(() => {
            isRefreshing = false;
          }, 2000);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-36 lg:pb-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckSquare className="text-primary" size={28} />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white blue-light-filter:text-gray-900">
              Family Tasks
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 blue-light-filter:text-gray-700">
            Manage and assign tasks for the whole family
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <Globe size={12} className="text-muted-foreground" />
            <Select value={getUserTimezone()} onValueChange={(tz) => { setSavedTimezone(tz === getDeviceTimezone() ? null : tz); window.location.reload(); }}>
              <SelectTrigger className="h-6 text-xs border-none shadow-none p-0 w-auto gap-1 text-muted-foreground hover:text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-6">
          <AdvancedTaskManagement />
        </div>
      </main>

      <VoiceNoteModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        type="tasks"
      />
    </div>
  );
}