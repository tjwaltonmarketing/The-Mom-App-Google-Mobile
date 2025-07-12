import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Users, 
  ArrowLeft,
  Plus,
  Eye,
  EyeOff,
  MapPin
} from "lucide-react";

export default function TeenCalendar() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Mock family calendar data
  const familyEvents = [
    {
      id: 1,
      title: "Soccer Practice",
      time: "4:00 PM - 5:30 PM",
      date: "Today",
      type: "sport",
      assignedTo: "Adri",
      location: "Community Park",
      privacy: "shared",
      color: "green"
    },
    {
      id: 2,
      title: "Family Dinner",
      time: "6:30 PM - 8:00 PM",
      date: "Today",
      type: "family",
      assignedTo: "Everyone",
      location: "Home",
      privacy: "shared",
      color: "blue"
    },
    {
      id: 3,
      title: "Math Test",
      time: "10:00 AM - 11:30 AM",
      date: "Tomorrow",
      type: "school",
      assignedTo: "Adri",
      location: "Lincoln High School",
      privacy: "shared",
      color: "purple"
    },
    {
      id: 4,
      title: "Mom's Meeting",
      time: "2:00 PM - 3:00 PM",
      date: "Tomorrow",
      type: "work",
      assignedTo: "Mom",
      location: "Office",
      privacy: "busy",
      color: "gray"
    },
    {
      id: 5,
      title: "Private Appointment",
      time: "11:00 AM - 12:00 PM",
      date: "Friday",
      type: "personal",
      assignedTo: "Dad",
      location: "Unknown",
      privacy: "private",
      color: "gray"
    },
    {
      id: 6,
      title: "Basketball Game",
      time: "7:00 PM - 9:00 PM",
      date: "Saturday",
      type: "sport",
      assignedTo: "Adri",
      location: "School Gym",
      privacy: "shared",
      color: "orange"
    }
  ];

  const getEventsByDate = (dateLabel: string) => {
    return familyEvents.filter(event => event.date === dateLabel);
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
      <div key={event.id} className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: event.color }}
              />
              <h4 className="font-medium text-sm">{event.title}</h4>
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
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Event
            </Button>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span><strong>Shared:</strong> Full details visible</span>
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
                {familyEvents.filter(event => !["Today", "Tomorrow"].includes(event.date)).map(renderEvent)}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}