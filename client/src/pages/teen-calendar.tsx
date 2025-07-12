import { useState } from "react";
import { useLocation } from "wouter";
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
  ArrowLeft,
  Plus,
  Eye,
  EyeOff,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Grid3X3
} from "lucide-react";

export default function TeenCalendar() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
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

  // Mock combined calendar data - family events + teen's personal events
  const allEvents = [
    // Family shared events (visible to teen)
    {
      id: 1,
      title: "Soccer Practice",
      time: "4:00 PM - 5:30 PM",
      date: "Today",
      fullDate: new Date(),
      type: "sport",
      assignedTo: "Adri",
      location: "Community Park",
      privacy: "shared",
      color: "#22c55e", // Green for shared family events
      source: "family",
      isOwnEvent: false
    },
    {
      id: 2,
      title: "Family Dinner",
      time: "6:30 PM - 8:00 PM",
      date: "Today",
      fullDate: new Date(),
      type: "family",
      assignedTo: "Everyone",
      location: "Home",
      privacy: "shared",
      color: "#3b82f6", // Blue for shared family events
      source: "family",
      isOwnEvent: false
    },
    {
      id: 3,
      title: "Math Test",
      time: "10:00 AM - 11:30 AM",
      date: "Tomorrow",
      fullDate: new Date(Date.now() + 86400000),
      type: "school",
      assignedTo: "Adri",
      location: "Lincoln High School",
      privacy: "shared",
      color: "#3b82f6", // Blue for shared family events
      source: "family",
      isOwnEvent: false
    },
    {
      id: 4,
      title: "Mom's Meeting",
      time: "2:00 PM - 3:00 PM",
      date: "Tomorrow",
      fullDate: new Date(Date.now() + 86400000),
      type: "work",
      assignedTo: "Mom",
      location: "Office",
      privacy: "busy",
      color: "#6b7280", // Gray for busy events
      source: "family",
      isOwnEvent: false
    },
    {
      id: 5,
      title: "Private Appointment",
      time: "11:00 AM - 12:00 PM",
      date: "Friday",
      fullDate: new Date(Date.now() + 4 * 86400000),
      type: "personal",
      assignedTo: "Dad",
      location: "Unknown",
      privacy: "private",
      color: "#6b7280", // Gray for private events
      source: "family",
      isOwnEvent: false
    },
    {
      id: 6,
      title: "Basketball Game",
      time: "7:00 PM - 9:00 PM",
      date: "Saturday",
      fullDate: new Date(Date.now() + 5 * 86400000),
      type: "sport",
      assignedTo: "Adri",
      location: "School Gym",
      privacy: "shared",
      color: "#22c55e", // Green for shared family events
      source: "family",
      isOwnEvent: false
    },
    
    // Teen's personal events (purple theme)
    {
      id: 101,
      title: "Study Group",
      time: "3:00 PM - 5:00 PM",
      date: "Today",
      fullDate: new Date(),
      type: "school",
      assignedTo: "Adri",
      location: "Library",
      privacy: "shared",
      color: "#a855f7", // Purple for teen's own events
      source: "teen",
      isOwnEvent: true
    },
    {
      id: 102,
      title: "Hang with Sarah",
      time: "2:00 PM - 4:00 PM",
      date: "Tomorrow",
      fullDate: new Date(Date.now() + 86400000),
      type: "personal",
      assignedTo: "Adri",
      location: "Downtown",
      privacy: "shared",
      color: "#a855f7", // Purple for teen's own events
      source: "teen",
      isOwnEvent: true
    },
    {
      id: 103,
      title: "Guitar Lesson",
      time: "4:00 PM - 5:00 PM",
      date: "Friday",
      fullDate: new Date(Date.now() + 4 * 86400000),
      type: "personal",
      assignedTo: "Adri",
      location: "Music Studio",
      privacy: "shared",
      color: "#a855f7", // Purple for teen's own events
      source: "teen",
      isOwnEvent: true
    }
  ];

  const getEventsByDate = (dateLabel: string) => {
    return allEvents.filter(event => event.date === dateLabel);
  };

  const getEventsForCalendarDate = (date: Date) => {
    return allEvents.filter(event => {
      return event.fullDate.toDateString() === date.toDateString();
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
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

    toast({
      title: "Event Created!",
      description: `"${newEvent.title}" has been added to the family calendar`,
    });

    setNewEvent({
      title: "",
      date: "",
      time: "",
      endTime: "",
      location: "",
      description: "",
      type: "personal"
    });
    setIsAddEventOpen(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/teen-dashboard")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Family Calendar</h1>
                <p className="text-sm text-gray-600">The Walton Family</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("calendar")}
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Calendar
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                List
              </Button>
              
              <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Event</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Event Title</Label>
                      <Input
                        id="title"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                        placeholder="Enter event title"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newEvent.date}
                          onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="time">Start Time</Label>
                        <Input
                          id="time"
                          type="time"
                          value={newEvent.time}
                          onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="endTime">End Time (Optional)</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                        placeholder="Enter location"
                      />
                    </div>

                    <div>
                      <Label htmlFor="type">Event Type</Label>
                      <Select value={newEvent.type} onValueChange={(value) => setNewEvent({...newEvent, type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="family">Family</SelectItem>
                          <SelectItem value="school">School</SelectItem>
                          <SelectItem value="sport">Sports</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
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
                      <Button onClick={handleAddEvent} className="flex-1">
                        Add Event
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6">
          
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
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
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

          {viewMode === "calendar" ? (
            /* Calendar Grid View */
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {selectedDate.toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {getDaysInMonth(selectedDate).map((date, index) => {
                    if (!date) {
                      return <div key={index} className="p-2 h-20" />;
                    }
                    
                    const dayEvents = getEventsForCalendarDate(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    return (
                      <div 
                        key={index} 
                        className={`p-2 h-20 border rounded-lg ${
                          isToday 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`text-sm font-medium mb-1 ${
                          isToday ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div 
                              key={event.id}
                              className={`text-xs p-1 rounded truncate ${
                                event.privacy === 'private' 
                                  ? 'bg-gray-200 text-gray-600'
                                  : event.privacy === 'busy'
                                  ? 'bg-yellow-200 text-yellow-800'
                                  : 'text-white'
                              }`}
                              style={{
                                backgroundColor: event.privacy === 'shared' ? event.color : undefined
                              }}
                            >
                              {event.privacy === 'private' 
                                ? 'Private' 
                                : event.privacy === 'busy'
                                ? 'Busy'
                                : event.title}
                            </div>
                          ))}
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
          ) : (
            /* List View */
            <>
              {/* Today's Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
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
                    <Calendar className="h-5 w-5 text-green-600" />
                    Tomorrow - {new Date(Date.now() + 86400000).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
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
                    {allEvents.filter(event => !["Today", "Tomorrow"].includes(event.date)).map(renderEvent)}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

        </div>
      </div>
    </div>
  );
}