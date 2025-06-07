import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Plus, Filter } from "lucide-react";
import { useState } from "react";
import { VoiceNoteModal } from "@/components/voice-note-modal";
import { Button } from "@/components/ui/button";
import { QuickTasks } from "@/components/dashboard/quick-tasks";

export default function TasksPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <CheckSquare className="text-primary" size={28} />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white blue-light-filter:text-gray-900">
                Family Tasks
              </h1>
            </div>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus size={16} className="mr-2" />
              Add Task
            </Button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 blue-light-filter:text-gray-700">
            Manage and assign tasks for the whole family
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <QuickTasks />
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Tasks</CardTitle>
                  <Button variant="outline" size="sm">
                    <Filter size={16} className="mr-2" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <CheckSquare size={48} className="mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Advanced Task Management</h3>
                  <p>Detailed task views and filtering options coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Completed Today</span>
                    <span className="font-semibold text-green-600">3</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Pending Tasks</span>
                    <span className="font-semibold text-orange-600">5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">This Week</span>
                    <span className="font-semibold text-blue-600">12</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Plus size={16} className="mr-2" />
                  Create Task Template
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <CheckSquare size={16} className="mr-2" />
                  Bulk Complete
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Filter size={16} className="mr-2" />
                  View Overdue
                </Button>
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