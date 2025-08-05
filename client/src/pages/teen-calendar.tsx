import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus,
  Eye,
  EyeOff,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Grid3X3
} from "lucide-react";
import TeenNavigation from "@/components/teen/teen-navigation";

export default function TeenCalendar() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isDayEventsOpen, setIsDayEventsOpen] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    time: "",
    endTime: "",
    location: "",
    description: "",
    type: "personal"
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get teen profile data first
  const { data: authData } = useQuery({
    queryKey: ["/api/teen/auth/user"],
    retry: false,
  });

  const isAuthenticated = (authData as any)?.isAuthenticated;
  const teenProfile = isAuthenticated ? (authData as any).teenProfile : null;

  // Fetch real events from database using teen events endpoint
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/teen/events"],
    retry: false,
    enabled: !!teenProfile,
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      return await apiRequest("POST", "/api/teen/events", eventData);
    },
    onSuccess: () => {
      // Force refetch instead of just invalidating
      queryClient.refetchQueries({ queryKey: ["/api/teen/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] }); // Also invalidate main events for dashboard
      setIsAddEventOpen(false);
      setNewEvent({ title: "", date: "", time: "", endTime: "", location: "", description: "", type: "personal" });
      toast({
        title: "Event Created",
        description: "Your event has been added to the calendar",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Event",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    },
  });

  // Helper function to convert UTC to MST for display
  const convertToMST = (utcDate: Date) => {
    // MST is UTC-7, so we add 7 hours to get the correct MST time
    const mstOffset = -7 * 60; // MST offset in minutes
    const utc = utcDate.getTime() + (utcDate.getTimezoneOffset() * 60000);
    return new Date(utc + (mstOffset * 60000));
  };

  // Transform database events for display
  const allEvents = events.map((event: any) => {
    const startTimeUTC = new Date(event.startTime);
    const endTimeUTC = event.endTime ? new Date(event.endTime) : null;
    
    // Convert to MST for display
    const startTime = convertToMST(startTimeUTC);
    const endTime = endTimeUTC ? convertToMST(endTimeUTC) : null;
    
    // Determine relative date label
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const eventDate = new Date(startTime);
    eventDate.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    
    let dateLabel = "This Week";
    if (eventDate.getTime() === today.getTime()) {
      dateLabel = "Today";
    } else if (eventDate.getTime() === tomorrow.getTime()) {
      dateLabel = "Tomorrow";
    }
    
    // Format the full date display
    const fullDateStr = startTime.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });

    // Format time display
    const timeStr = startTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    const endTimeStr = endTime ? endTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    }) : null;
    const timeDisplay = endTimeStr ? `${timeStr} - ${endTimeStr}` : timeStr;

    // Determine if this is the teen's own event (currently simulated)
    const isOwnEvent = event.createdBy === 1; // Assume teen is family member ID 1 for demo
    
    // Color coding based on privacy and ownership
    let color = "#6b7280"; // Default gray
    if (event.visibilityType === "shared") {
      color = isOwnEvent ? "#a855f7" : "#3b82f6"; // Purple for own, blue for family
    } else if (event.visibilityType === "busy") {
      color = "#f59e0b"; // Yellow for busy
    }

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      time: timeDisplay,
      date: dateLabel,
      fullDate: startTime,
      fullDateStr: fullDateStr, // Add formatted date string
      type: "personal", // Could be determined from event categories
      assignedTo: "Family Member", // Would come from relation
      location: event.location || "",
      privacy: event.visibilityType,
      color,
      source: isOwnEvent ? "teen" : "family",
      isOwnEvent
    };
  });

  const getEventsByDate = (dateLabel: string) => {
    return allEvents.filter(event => event.date === dateLabel);
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) {
      toast({
        title: "Missing Information",
        description: "Please fill in title, date, and time",
        variant: "destructive",
      });
      return;
    }

    // Send the data in the format the backend expects
    const eventData = {
      title: newEvent.title,
      date: newEvent.date,
      time: newEvent.time,
      endTime: newEvent.endTime || "",
      location: newEvent.location || "",
      description: newEvent.description || "",
      type: newEvent.type || "personal"
    };

    createEventMutation.mutate(eventData);
  };

  // Month navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // Handle day click
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    // Get events for this day
    const dayEvents = allEvents.filter(event => {
      const eventDate = new Date(event.fullDate);
      return eventDate.toDateString() === date.toDateString();
    });
    
    setSelectedDayEvents(dayEvents);
    
    if (dayEvents.length > 0) {
      // Show events for this day
      setIsDayEventsOpen(true);
    } else {
      // Allow creating a new event for this day
      setNewEvent({
        ...newEvent,
        date: date.toISOString().split('T')[0], // Set date in YYYY-MM-DD format
      });
      setIsAddEventOpen(true);
    }
  };





  const renderEvent = (event: any) => {
    if (event.privacy === "private") {
      return (
        <div key={event.id} className="p-3 bg-gray-100 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500 italic">Private Event</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {event.time.split(' - ')[0]}
            </Badge>
          </div>
        </div>
      );
    }

    if (event.privacy === "busy") {
      return (
        <div key={event.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-700">Busy - {event.assignedTo}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {event.time.split(' - ')[0]}
            </Badge>
          </div>
        </div>
      );
    }

    return (
      <div key={event.id} className={`p-3 border rounded-lg hover:shadow-sm transition-shadow ${
        event.isOwnEvent ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: event.color }}
              />
              <h4 className="font-medium text-sm">{event.title}</h4>
              {event.isOwnEvent && (
                <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                  Mine
                </Badge>
              )}
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{event.fullDateStr}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{event.time}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{event.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{event.assignedTo}</span>
                {event.source === "family" && (
                  <span className="text-blue-600 font-medium">(Family)</span>
                )}
              </div>
            </div>
          </div>
          <Badge 
            variant={event.type === 'sport' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {event.type}
          </Badge>
        </div>
      </div>
    );
  };

  // List view rendering (current implementation)
  const renderListView = () => (
    <>
      {/* Privacy Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Privacy Levels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full" />
              <span><strong>My Events:</strong> Your personal events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span><strong>Family Shared:</strong> Everyone can see</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span><strong>Busy:</strong> Time blocked only</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full" />
              <span><strong>Private:</strong> Hidden details</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Today - {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getEventsByDate("Today").length > 0 ? (
              getEventsByDate("Today").map(renderEvent)
            ) : (
              <p className="text-gray-500 text-center py-4">No events today</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tomorrow's Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Tomorrow - {(() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              return tomorrow.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              });
            })()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getEventsByDate("Tomorrow").length > 0 ? (
              getEventsByDate("Tomorrow").map(renderEvent)
            ) : (
              <p className="text-gray-500 text-center py-4">No events tomorrow</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allEvents.filter(event => !["Today", "Tomorrow"].includes(event.date)).length > 0 ? (
              allEvents.filter(event => !["Today", "Tomorrow"].includes(event.date)).map(renderEvent)
            ) : (
              <p className="text-gray-500 text-center py-4">No other events this week</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );

  // Calendar view rendering (grid format)
  const renderCalendarView = () => {
    const today = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Get first day of month and how many days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Create calendar grid
    const calendarDays = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(new Date(currentYear, currentMonth, day));
    }
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Days of week headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={index} className="aspect-square p-1"></div>;
              }
              
              const isToday = date.toDateString() === today.toDateString();
              const dayEvents = allEvents.filter(event => {
                const eventDate = new Date(event.fullDate);
                return eventDate.toDateString() === date.toDateString();
              });
              
              return (
                <div 
                  key={index} 
                  className={`aspect-square p-1 sm:p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    isToday ? 'bg-primary/10 border-primary' : 'border-gray-200'
                  } ${
                    selectedDate?.toDateString() === date.toDateString() ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleDayClick(date)}
                >
                  <div className={`text-xs sm:text-sm font-medium mb-1 ${
                    isToday ? 'text-primary' : 'text-gray-900'
                  }`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 1).map(event => (
                      <div 
                        key={event.id}
                        className="text-xs p-0.5 sm:p-1 rounded truncate bg-blue-100 text-blue-800"
                        title={event.title}
                      >
                        {event.title.length > 8 ? event.title.substring(0, 8) + '...' : event.title}
                      </div>
                    ))}
                    {dayEvents.length > 1 && (
                      <div className="text-xs text-gray-500 text-center">+{dayEvents.length - 1}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      {/* Navigation */}
      <TeenNavigation currentPath="/teen-calendar" teenProfile={teenProfile} />
      
      <div className="max-w-6xl mx-auto p-4">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">My Calendar</h1>
            <p className="text-sm sm:text-base text-gray-600 truncate">Your events and family schedule</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant={viewMode === "calendar" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              <span>Calendar</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              <span>List</span>
            </Button>
            <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <span>Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title</Label>
                    <Input
                      id="title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                      placeholder="Enter event title"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newEvent.date}
                        onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Start Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time (Optional)</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location (Optional)</Label>
                    <Input
                      id="location"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                      placeholder="Add location"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                      placeholder="Add any notes or details"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={handleAddEvent} 
                      className="flex-1"
                      disabled={createEventMutation.isPending}
                    >
                      {createEventMutation.isPending ? "Adding..." : "Add Event"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddEventOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Day Events Dialog */}
            <Dialog open={isDayEventsOpen} onOpenChange={setIsDayEventsOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    Events for {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {selectedDayEvents.map((event) => (
                    <Card key={event.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">{event.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Clock className="h-4 w-4" />
                            <span>{event.time}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <MapPin className="h-4 w-4" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.description && (
                            <p className="text-sm text-gray-700 mt-2">{event.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge 
                              variant={event.type === 'sport' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {event.type}
                            </Badge>
                            {event.source === "family" && (
                              <Badge variant="outline" className="text-xs">
                                Family Event
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={() => {
                        setNewEvent({
                          ...newEvent,
                          date: selectedDate.toISOString().split('T')[0],
                        });
                        setIsDayEventsOpen(false);
                        setIsAddEventOpen(true);
                      }}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Event This Day
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDayEventsOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-600">Loading calendar events...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {viewMode === "list" && renderListView()}
            {viewMode === "calendar" && renderCalendarView()}
          </div>
        )}
      </div>
    </div>
  );
}