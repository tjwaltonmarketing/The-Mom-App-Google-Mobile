import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CheckSquare, Globe, Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUserTimezone, COMMON_TIMEZONES, setSavedTimezone, getDeviceTimezone } from "@/lib/timezone";
import { useState, useEffect } from "react";
import { VoiceNoteModal } from "@/components/voice-note-modal";
import { ImportExportModal } from "@/components/import-export-modal";
import { AdvancedTaskManagement } from "@/components/dashboard/advanced-task-management";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function TasksPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [showPrintTip, setShowPrintTip] = useState(
    () => localStorage.getItem("tasks_print_tip_dismissed") !== "true"
  );

  const dismissPrintTip = () => {
    localStorage.setItem("tasks_print_tip_dismissed", "true");
    setShowPrintTip(false);
  };

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

      {/* First-visit print tip */}
      <Dialog open={showPrintTip} onOpenChange={(open) => { if (!open) dismissPrintTip(); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader className="text-center items-center pb-2">
            <div className="w-14 h-14 bg-pink-100 dark:bg-pink-900/40 rounded-full flex items-center justify-center mb-3">
              <Printer className="text-pink-500" size={28} />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Did you know?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 px-1">
            <p className="text-center text-gray-700 dark:text-gray-200">
              For children too young to use a device, you can <strong>print their task list</strong> with points to post on the wall each week!
            </p>
            <div className="bg-pink-50 dark:bg-pink-900/30 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-gray-800 dark:text-gray-100 text-xs uppercase tracking-wide">How to print:</p>
              <div className="flex items-start gap-2">
                <span className="font-bold text-pink-500 mt-0.5">1.</span>
                <p>Find your child's name in the <strong>Family Members</strong> section on this page</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-pink-500 mt-0.5">2.</span>
                <p>Tap the <strong>printer icon</strong> <Printer className="inline h-3.5 w-3.5 text-pink-500" /> next to their name</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-pink-500 mt-0.5">3.</span>
                <p>Print and post it somewhere they can see it — done! 🎉</p>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button onClick={dismissPrintTip} className="w-full bg-pink-500 hover:bg-pink-600 text-white rounded-xl">
              Got it!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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