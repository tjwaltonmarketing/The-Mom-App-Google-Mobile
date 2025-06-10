import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { VoiceNoteModal } from "@/components/voice-note-modal";
import { EventModal } from "@/components/event-modal";
import { useQuery } from "@tanstack/react-query";
import type { Event, FamilyMember } from "@shared/schema";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  startOfDay,
  endOfDay,
  getHours,
  getMinutes
} from "date-fns";

type CalendarView = "month" | "week" | "day";

export default function CalendarPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<CalendarView>("month");

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.startTime), day));
  };

  const getMemberById = (id: number | null) => {
    return familyMembers.find(member => member.id === id);
  };

  // Navigation functions for different views
  const navigateNext = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const navigatePrev = () => {
    if (view === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    setView("day");
  };

  const backToMonth = () => {
    setView("month");
    setSelectedDate(null);
  };

  // Get date ranges for different views
  const getDateRange = () => {
    if (view === "month") {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
        days: eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
      };
    } else if (view === "week") {
      return {
        start: startOfWeek(currentDate),
        end: endOfWeek(currentDate),
        days: eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) })
      };
    } else {
      return {
        start: startOfDay(currentDate),
        end: endOfDay(currentDate),
        days: [currentDate]
      };
    }
  };

  const { days } = getDateRange();

  const getViewTitle = () => {
    if (view === "month") {
      return format(currentDate, 'MMMM yyyy');
    } else if (view === "week") {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
  };

  const renderMonthView = () => (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isCurrentDay = isToday(day);
          const hasEvents = dayEvents.length > 0;
          
          return (
            <div 
              key={day.toISOString()} 
              onClick={() => hasEvents ? handleDateClick(day) : null}
              className={`min-h-[80px] p-2 border rounded-lg transition-all ${
                isCurrentDay 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              } ${hasEvents ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''}`}
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
                      className="text-xs p-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 truncate"
                      style={{ backgroundColor: member?.color ? `${member.color}20` : undefined }}
                    >
                      {format(new Date(event.startTime), 'HH:mm')} {event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeekView = () => (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {days.map(day => (
          <div key={day.toISOString()} className="text-center">
            <div className="text-sm font-medium text-gray-500 mb-1">
              {format(day, 'EEE')}
            </div>
            <div className={`text-lg font-bold p-2 rounded ${
              isToday(day) ? 'bg-primary text-white' : 'text-gray-900 dark:text-white'
            }`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const hasEvents = dayEvents.length > 0;
          
          return (
            <div 
              key={day.toISOString()}
              onClick={() => hasEvents ? handleDateClick(day) : null}
              className={`min-h-[300px] p-2 border rounded-lg ${
                isToday(day) 
                  ? 'bg-primary/5 border-primary' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              } ${hasEvents ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''}`}
            >
              <div className="space-y-1">
                {dayEvents.map(event => {
                  const member = getMemberById(event.assignedTo);
                  return (
                    <div 
                      key={event.id} 
                      className="text-xs p-2 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      style={{ backgroundColor: member?.color ? `${member.color}20` : undefined }}
                    >
                      <div className="font-medium">{format(new Date(event.startTime), 'HH:mm')}</div>
                      <div className="truncate">{event.title}</div>
                      {event.location && (
                        <div className="text-gray-600 dark:text-gray-400 truncate">{event.location}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" onClick={backToMonth}>
            <ArrowLeft size={16} className="mr-1" />
            Back to Month
          </Button>
          <div className="text-lg font-medium">
            {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
          {hours.map(hour => {
            const hourEvents = dayEvents.filter(event => {
              const eventHour = getHours(new Date(event.startTime));
              return eventHour === hour;
            });
            
            return (
              <div key={hour} className="flex border-b border-gray-200 dark:border-gray-700 py-2">
                <div className="w-20 text-sm text-gray-500 font-medium">
                  {format(new Date().setHours(hour, 0), 'HH:mm')}
                </div>
                <div className="flex-1 pl-4">
                  {hourEvents.map(event => {
                    const member = getMemberById(event.assignedTo);
                    return (
                      <div 
                        key={event.id} 
                        className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 mb-2"
                        style={{ 
                          backgroundColor: member?.color ? `${member.color}20` : undefined,
                          borderLeftColor: member?.color || '#3b82f6'
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">{event.title}</h3>
                          <span className="text-sm text-gray-500">
                            {format(new Date(event.startTime), 'HH:mm')} - {format(new Date(event.endTime), 'HH:mm')}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{event.description}</p>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock size={12} />
                            {event.location}
                          </div>
                        )}
                        {member && (
                          <div className="flex items-center gap-2 mt-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: member.color }}
                            ></div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{member.name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {hourEvents.length === 0 && hour >= 6 && hour <= 22 && (
                    <div className="text-gray-400 text-sm py-2">No events</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-primary" size={28} />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white blue-light-filter:text-gray-900">
                  Family Calendar
                </h1>
                <p className="text-gray-600 dark:text-gray-400 blue-light-filter:text-gray-700">
                  Manage your family's schedule and events
                </p>
              </div>
            </div>
            <EventModal />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar size={20} />
                    {getViewTitle()}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={navigatePrev}>
                      <ChevronLeft size={16} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={navigateNext}>
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
                
                <Tabs value={view} onValueChange={(value) => setView(value as CalendarView)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="month">Month</TabsTrigger>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="day">Day</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              
              <CardContent>
                {view === "month" && renderMonthView()}
                {view === "week" && renderWeekView()}
                {view === "day" && renderDayView()}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Today's Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock size={20} />
                  Today's Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getEventsForDay(new Date()).length === 0 ? (
                  <p className="text-gray-500 text-sm">No events scheduled for today</p>
                ) : (
                  <div className="space-y-3">
                    {getEventsForDay(new Date()).map(event => {
                      const member = getMemberById(event.assignedTo);
                      return (
                        <div key={event.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">{event.title}</h4>
                            <span className="text-sm text-gray-500">
                              {format(new Date(event.startTime), 'HH:mm')}
                            </span>
                          </div>
                          {event.location && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{event.location}</p>
                          )}
                          {member && (
                            <div className="flex items-center gap-2 mt-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: member.color }}
                              ></div>
                              <span className="text-sm text-gray-500">{member.name}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Calendar Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Events</span>
                    <span className="font-medium">{events.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">This Week</span>
                    <span className="font-medium">
                      {events.filter(event => {
                        const eventDate = new Date(event.startTime);
                        const weekStart = startOfWeek(new Date());
                        const weekEnd = endOfWeek(new Date());
                        return eventDate >= weekStart && eventDate <= weekEnd;
                      }).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Today</span>
                    <span className="font-medium">{getEventsForDay(new Date()).length}</span>
                  </div>
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