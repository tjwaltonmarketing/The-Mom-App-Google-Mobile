import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import { format } from "date-fns";
import type { Event } from "@shared/schema";

interface TeenEventDetailModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
}

export function TeenEventDetailModal({ event, isOpen, onClose }: TeenEventDetailModalProps) {
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return format(date, "EEEE, MMMM d, yyyy");
    }
  };

  const formatEventTime = (startTime: string, endTime?: string) => {
    const start = format(new Date(startTime), "h:mm a");
    if (endTime) {
      const end = format(new Date(endTime), "h:mm a");
      return `${start} - ${end}`;
    }
    return start;
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'sport':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'family':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'school':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Event Details
          </DialogTitle>
          <DialogDescription>
            View event information and schedule details
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Event Title */}
          <div>
            <h3 className="text-lg font-semibold">
              {event.title}
            </h3>
            {(event as any).type && (
              <div className="mt-1">
                <Badge className={getEventTypeColor((event as any).type)}>
                  {(event as any).type.charAt(0).toUpperCase() + (event as any).type.slice(1)}
                </Badge>
              </div>
            )}
          </div>

          {/* Event Description */}
          {event.description && (
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <p className="text-sm text-gray-600 mt-1 p-3 bg-gray-50 rounded-lg">
                {event.description}
              </p>
            </div>
          )}

          {/* Event Details Grid */}
          <div className="space-y-3">
            {/* Date & Time */}
            <div>
              <label className="text-sm font-medium text-gray-700">When</label>
              <div className="mt-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {formatEventDate(event.startTime)}
                  </span>
                </div>
                {!event.isAllDay && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {formatEventTime(event.startTime, event.endTime)}
                    </span>
                  </div>
                )}
                {event.isAllDay && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">All day</span>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div>
                <label className="text-sm font-medium text-gray-700">Location</label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{event.location}</span>
                </div>
              </div>
            )}

            {/* Organizer */}
            <div>
              <label className="text-sm font-medium text-gray-700">Organized By</label>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {event.assignedTo ? "Family Member" : "Family"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4">
            <Button 
              onClick={onClose}
              className="w-full"
              variant="outline"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}