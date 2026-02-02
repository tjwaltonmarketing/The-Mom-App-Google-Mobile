import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, ArrowLeft, Edit, List, Grid3X3 } from "lucide-react";
import { useState, useEffect } from "react";
import { VoiceNoteModal } from "@/components/voice-note-modal";
import { EventModal } from "@/components/event-modal";
import { EventEditModal } from "@/components/event-edit-modal";
// import { CalendarSync } from "@/components/calendar-sync"; // Disabled until Google OAuth verification
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
import { formatTimeInUserTimezone } from "@/lib/timezone";
import { formatInTimeZone } from 'date-fns-tz';
import { WeatherDisplay } from "@/components/weather-display";

type CalendarView = "month" | "week" | "day" | "list";

export default function CalendarPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<CalendarView>("month");
  const [showEventModal, setShowEventModal] = useState(false);

  // Remove automatic scroll to avoid conflicts with quick actions
  // Quick actions handle their own scrolling

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const response = await fetch('/api/events', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 0, // Always consider data stale for immediate updates
    gcTime: 0,    // Don't cache in garbage collection
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
    queryFn: async () => {
      const response = await fetch('/api/family-members', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }
  });

  // List view rendering function - moved after data loading
  const renderListView = () => {
    const now = new Date();
    const today = startOfDay(now);
    
    // Filter to only show upcoming events (today and future)
    const upcomingEvents = events.filter(event => {
      const eventDate = startOfDay(new Date(event.startTime));
      return eventDate >= today;
    });

    const sortedEvents = [...upcomingEvents].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const groupedEvents = sortedEvents.reduce((groups: Record<string, Event[]>, event) => {
      // Use the timezone utility to get proper local date
      const eventTime = new Date(event.startTime);
      
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Format the date in user's timezone using formatInTimeZone
      const date = formatInTimeZone(eventTime, userTimezone, 'yyyy-MM-dd');
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    }, {});

    return (
      <div className="space-y-6">
        {Object.entries(groupedEvents).map(([date, dayEvents]) => {
          // Create a proper date object from the date string, ensuring it's treated as local date
          const [year, month, day] = date.split('-').map(Number);
          const eventDate = new Date(year, month - 1, day); // month is 0-indexed
          const now = new Date();
          
          // Create dates at start of day for accurate comparison
          const todayStart = startOfDay(now);
          const eventDateStart = startOfDay(eventDate);
          
          const isToday = eventDateStart.getTime() === todayStart.getTime();
          
          // Format the date label using the properly constructed date
          const dateLabel = format(eventDate, 'EEEE, MMMM d, yyyy');

          return (
            <div key={date} className={`rounded-lg border p-4 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-900 dark:border-gray-700'}`}>
              <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-100">{dateLabel}</h3>
              <div className="space-y-2">
                {dayEvents.map(event => {
                  const eventStart = new Date(event.startTime);
                  const eventEnd = event.endTime ? new Date(event.endTime) : null;
                  const timeStr = formatTimeInUserTimezone(eventStart, 'h:mm a');
                  const endTimeStr = eventEnd ? formatTimeInUserTimezone(eventEnd, 'h:mm a') : null;
                  const timeDisplay = endTimeStr ? `${timeStr} - ${endTimeStr}` : timeStr;

                  return (
                    <div 
                      key={event.id} 
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{event.title}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Clock size={14} />
                            {timeDisplay}
                          </div>
                          {event.description && (
                            <div className="text-sm text-gray-500 mt-1">{event.description}</div>
                          )}
                          {event.location && (
                            <div className="mt-2">
                              <WeatherDisplay location={event.location} compact={true} />
                            </div>
                          )}
                        </div>
                      </div>
                      <EventEditModal 
                        event={event}
                        trigger={
                          <Button variant="ghost" size="sm">
                            <Edit size={16} />
                          </Button>
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {events.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
            <p>No events scheduled</p>
          </div>
        )}
      </div>
    );
  };

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
    const dayEvents = getEventsForDay(date);
    if (dayEvents.length > 0) {
      setSelectedDate(date);
      setCurrentDate(date);
      setView("day");
    } else {
      // Show create event modal for empty days
      setSelectedDate(date);
      setShowEventModal(true);
    }
  };

  const backToMonth = () => {
    setView("month");
    setSelectedDate(null);
  };

  // Get date ranges for different views
  const getDateRange = () => {
    if (view === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      
      return {
        start: monthStart,
        end: monthEnd,
        days: eachDayOfInterval({ start: calendarStart, end: calendarEnd })
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

  const renderMonthView = () => {
    const { start: monthStart, end: monthEnd } = getDateRange();
    
    return (
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
            const isCurrentMonth = day >= monthStart && day <= monthEnd;
            
            return (
              <div 
                key={day.toISOString()} 
                onClick={() => handleDateClick(day)}
                className={`min-h-[80px] p-2 border rounded-lg transition-all cursor-pointer ${
                  isCurrentDay 
                    ? 'bg-primary/10 border-primary' 
                    : isCurrentMonth
                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-50'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentDay 
                    ? 'text-primary' 
                    : isCurrentMonth 
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map(event => {
                    const member = getMemberById(event.assignedTo);
                    return (
                      <div 
                        key={event.id} 
                        className="text-xs p-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 truncate group relative"
                        style={{ backgroundColor: member?.color ? `${member.color}20` : undefined }}
                      >
                        <div className="flex items-center justify-between">
                          <span>{format(new Date(event.startTime), 'h:mm a')} {event.title}</span>
                          <EventEditModal 
                            event={event}
                            trigger={
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Edit size={8} />
                              </Button>
                            }
                          />
                        </div>
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
  };

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
          const dayEvents = getEventsForDay(day).sort((a, b) => 
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
          const hasEvents = dayEvents.length > 0;
          
          return (
            <div 
              key={day.toISOString()}
              onClick={() => hasEvents ? handleDateClick(day) : null}
              className={`min-h-[200px] p-1 border rounded-lg ${
                isToday(day) 
                  ? 'bg-primary/5 border-primary' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              } ${hasEvents ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''}`}
            >
              <div className="space-y-1">
                {dayEvents.slice(0, 4).map((event, index) => {
                  const member = getMemberById(event.assignedTo);
                  return (
                    <div 
                      key={event.id} 
                      className="text-xs p-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 group relative"
                      style={{ backgroundColor: member?.color ? `${member.color}20` : undefined }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs truncate">
                            {formatTimeInUserTimezone(event.startTime)}
                          </div>
                          <div className="text-xs truncate">
                            {event.title}
                          </div>
                        </div>
                        <EventEditModal 
                          event={event}
                          trigger={
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-3 w-3 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Edit size={6} />
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  );
                })}
                {dayEvents.length > 4 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{dayEvents.length - 4} more
                  </div>
                )}
                {dayEvents.length === 0 && (
                  <div 
                    className="text-xs text-gray-400 text-center py-4 cursor-pointer hover:text-gray-600 transition-colors"
                    onClick={() => {
                      setSelectedDate(day);
                      setShowEventModal(true);
                    }}
                  >
                    Click to add event
                  </div>
                )}
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={backToMonth}>
              <ArrowLeft size={16} className="mr-1" />
              Back to Month
            </Button>
            <div className="text-lg font-medium">
              {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled
            </div>
          </div>
          <Button 
            onClick={() => {
              setSelectedDate(currentDate);
              setShowEventModal(true);
            }}
            className="sm:ml-auto bg-primary hover:bg-primary/90 w-full sm:w-auto"
          >
            <Plus size={16} className="mr-1" />
            Add Event
          </Button>
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
                  {format(new Date().setHours(hour, 0), 'h a')}
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
                            {formatTimeInUserTimezone(event.startTime)} - {event.endTime ? formatTimeInUserTimezone(event.endTime) : 'End time TBD'}
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
                        <div className="flex items-center justify-between mt-2">
                          {member && (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: member.color }}
                              ></div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">{member.name}</span>
                            </div>
                          )}
                          <EventEditModal 
                            event={event}
                            trigger={
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Edit size={12} />
                              </Button>
                            }
                          />
                        </div>
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
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
            <div className="flex-shrink-0">
              <EventModal />
            </div>
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
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="month">Month</TabsTrigger>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="day">Day</TabsTrigger>
                    <TabsTrigger value="list">List</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              
              <CardContent>
                {view === "month" && renderMonthView()}
                {view === "week" && renderWeekView()}
                {view === "day" && renderDayView()}
                {view === "list" && renderListView()}
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
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">
                                {format(new Date(event.startTime), 'h:mm a')}
                              </span>
                              <EventEditModal 
                                event={event}
                                trigger={
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <Edit size={12} />
                                  </Button>
                                }
                              />
                            </div>
                          </div>
                          {event.location && (
                            <div className="mt-2">
                              <WeatherDisplay location={event.location} compact={true} />
                            </div>
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

            {/* Google Calendar Sync - Disabled until Google OAuth verification is complete
            <CalendarSync />
            */}
          </div>
        </div>
      </main>

      <VoiceNoteModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
      />

      {/* Event Creation Modal for Empty Days */}
      <EventModal 
        trigger={null}
        open={showEventModal}
        onOpenChange={setShowEventModal}
        selectedDate={selectedDate}
        onSuccess={() => {
          setShowEventModal(false);
          setSelectedDate(null);
        }}
      />
    </div>
  );
}