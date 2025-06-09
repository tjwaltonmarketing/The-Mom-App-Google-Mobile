import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { VoiceNoteModal } from "@/components/voice-note-modal";
import { EventModal } from "@/components/event-modal";
import { useQuery } from "@tanstack/react-query";
import type { Event, FamilyMember } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";

export default function CalendarPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.startTime), day));
  };

  const getMemberById = (id: number | null) => {
    return familyMembers.find(member => member.id === id);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Calendar className="text-primary" size={28} />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white blue-light-filter:text-gray-900">
                Family Calendar
              </h1>
            </div>
            <EventModal />
          </div>
          <p className="text-gray-600 dark:text-gray-400 blue-light-filter:text-gray-700">
            Manage your family's schedule and events
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar size={20} />
                    {format(currentDate, 'MMMM yyyy')}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={prevMonth}>
                      <ChevronLeft size={16} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextMonth}>
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {daysInMonth.map(day => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentDay = isToday(day);
                    
                    return (
                      <div 
                        key={day.toISOString()} 
                        className={`min-h-[80px] p-2 border rounded-lg ${
                          isCurrentDay 
                            ? 'bg-primary/10 border-primary' 
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className={`text-sm font-medium mb-1 ${
                          isCurrentDay ? 'text-primary' : 'text-gray-900 dark:text-white'
                        }`}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map(event => {
                            const member = getMemberById(event.assignedTo);
                            return (
                              <div 
                                key={event.id}
                                className="text-xs p-1 rounded truncate"
                                style={{ 
                                  backgroundColor: `${member?.color || '#6B7280'}20`,
                                  borderLeft: `3px solid ${member?.color || '#6B7280'}`
                                }}
                              >
                                {event.title}
                              </div>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                <EventModal 
                  trigger={
                    <Button variant="outline" className="w-full">
                      <Plus size={16} className="mr-2" />
                      Create Event
                    </Button>
                  }
                />
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