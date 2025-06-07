import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { useState } from "react";
import { VoiceNoteModal } from "@/components/voice-note-modal";

export default function CalendarPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-primary" size={28} />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white blue-light-filter:text-gray-900">
              Family Calendar
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 blue-light-filter:text-gray-700">
            Manage your family's schedule and events
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar size={20} />
                  Monthly View
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Calendar View Coming Soon</h3>
                  <p>Interactive monthly calendar with family events and appointments</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock size={20} />
                  Today's Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 blue-light-filter:bg-green-25 rounded-lg border border-green-200 dark:border-green-800 blue-light-filter:border-green-200">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-green-800 dark:text-green-200 blue-light-filter:text-green-800">Emma's Soccer Practice</h4>
                      <span className="text-sm text-green-600 dark:text-green-400 blue-light-filter:text-green-700">4:00 PM</span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 blue-light-filter:text-green-700">Riverside Sports Complex</p>
                  </div>
                  
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 blue-light-filter:bg-blue-25 rounded-lg border border-blue-200 dark:border-blue-800 blue-light-filter:border-blue-200">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 blue-light-filter:text-blue-800">Sam's Piano Lesson</h4>
                      <span className="text-sm text-blue-600 dark:text-blue-400 blue-light-filter:text-blue-700">6:00 PM</span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 blue-light-filter:text-blue-700">Music Academy Downtown</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Add Event</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">Event creation form coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <VoiceNoteModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
      />
    </div>
  );
}