import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { EventEditModal } from "@/components/event-edit-modal";
import type { Event, FamilyMember } from "@shared/schema";
import { format } from "date-fns";
import { formatTimeInUserTimezone } from "@/lib/timezone";
import { useState } from "react";
import { WeatherDisplay } from "@/components/weather-display";

export function TodaySchedule() {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events/today"],
    queryFn: async () => {
      const response = await fetch('/api/events/today', {
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

  const getMemberById = (id: number | null) => {
    return familyMembers.find(member => member.id === id);
  };

  return (
    <Card className="animate-slideUp">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center">
          <CalendarDays className="text-primary mr-2 h-5 w-5" />
          Today's Schedule
        </CardTitle>
        <Link href="/calendar">
          <Button variant="link" className="text-primary hover:text-blue-600 text-sm font-medium p-0">
            View All
          </Button>
        </Link>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {events.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No events scheduled for today</p>
          ) : (
            events.map((event) => {
              const member = getMemberById(event.assignedTo);
              return (
                <div 
                  key={event.id} 
                  className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => setEditingEvent(event)}
                >
                  <div className="flex-shrink-0">
                    <div 
                      className="w-3 h-3 rounded-full mt-2"
                      style={{ backgroundColor: member?.color || '#6B7280' }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{event.title}</p>
                      <span className="text-sm text-gray-500">
                        {formatTimeInUserTimezone(event.startTime)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{event.description}</p>
                    {event.location && (
                      <div className="mt-2">
                        <WeatherDisplay location={event.location} compact={true} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
      
      {/* Event Edit Modal */}
      {editingEvent && (
        <EventEditModal 
          event={editingEvent}
          onEventUpdated={() => setEditingEvent(null)}
          onEventDeleted={() => setEditingEvent(null)}
        />
      )}
    </Card>
  );
}
