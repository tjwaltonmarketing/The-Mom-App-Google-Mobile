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
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
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
  const queryClient = useQueryClient();

  // Fetch real events from database
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/events"],
    retry: false,
  });

  // Get teen profile data with avatar
  const { data: teenProfile } = useQuery({
    queryKey: ["/api/teen/auth/user"],
    retry: false,
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      return await apiRequest("POST", "/api/events", eventData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
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

  // Transform database events for display
  const allEvents = events.map((event: any) => {
    const startTime = new Date(event.startTime);
    const endTime = event.endTime ? new Date(event.endTime) : null;
    
    // Determine relative date label
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateLabel = "This Week";
    if (startTime.toDateString() === today.toDateString()) {
      dateLabel = "Today";
    } else if (startTime.toDateString() === tomorrow.toDateString()) {
      dateLabel = "Tomorrow";
    }

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

    const eventData = {
      title: newEvent.title,
      description: newEvent.description,
      startTime: new Date(`${newEvent.date}T${newEvent.time}`).toISOString(),
      endTime: newEvent.endTime ? new Date(`${newEvent.date}T${newEvent.endTime}`).toISOString() : null,
      location: newEvent.location,
      visibilityType: "shared", // Default to shared for teens
      familyId: 1, // Would be dynamic based on teen's family
    };

    createEventMutation.mutate(eventData);
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
      {/* Navigation */}
      <TeenNavigation currentPath="/teen-calendar" teenProfile={teenProfile} />
      
      <div className="max-w-6xl mx-auto p-4">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Calendar</h1>
            <p className="text-gray-600">Your events and family schedule</p>
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
              <Calendar className="h-4 w-4 mr-1" />
              List
            </Button>
            <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Event
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
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-600">Loading calendar events...</span>
          </div>
        ) : (
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
          </div>
        )}
      </div>
    </div>
  );
}