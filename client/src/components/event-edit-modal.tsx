import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Edit, Trash2, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertEventSchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import type { Event, FamilyMember } from "@shared/schema";
import { LocationAutocomplete } from "@/components/location-autocomplete";

const eventFormSchema = insertEventSchema.extend({
  startDate: z.string(),
  startTime: z.string(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface EventEditModalProps {
  event: Event;
  trigger?: React.ReactNode;
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
}

export function EventEditModal({ event, trigger, onEventUpdated, onEventDeleted }: EventEditModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAllDay, setIsAllDay] = useState(event.isAllDay || false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event.title,
      description: event.description || "",
      location: event.location || "",
      assignedTo: event.assignedTo || undefined,
      isAllDay: event.isAllDay || false,
      startDate: format(new Date(event.startTime), "yyyy-MM-dd"),
      startTime: format(new Date(event.startTime), "HH:mm"),
      endDate: event.endTime ? format(new Date(event.endTime), "yyyy-MM-dd") : format(new Date(event.startTime), "yyyy-MM-dd"),
      endTime: event.endTime ? format(new Date(event.endTime), "HH:mm") : "10:00",
    },
  });

  useEffect(() => {
    form.setValue("isAllDay", isAllDay);
  }, [isAllDay, form]);

  const updateEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const { startDate, startTime, endDate, endTime, ...eventData } = data;
      
      let startDateTime: Date;
      let endDateTime: Date | null = null;

      if (isAllDay) {
        startDateTime = new Date(startDate + "T00:00:00");
        endDateTime = new Date(startDate + "T23:59:59");
      } else {
        startDateTime = new Date(startDate + "T" + startTime);
        if (endDate && endTime) {
          endDateTime = new Date(endDate + "T" + endTime);
        }
      }

      const eventPayload = {
        ...eventData,
        startTime: startDateTime,
        endTime: endDateTime,
        isAllDay,
      };

      return apiRequest("PUT", `/api/events/${event.id}`, eventPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/today"] });
      toast({
        title: "Event Updated",
        description: "Event has been successfully updated.",
      });
      setIsOpen(false);
      onEventUpdated?.();
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/events/${event.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/today"] });
      toast({
        title: "Event Deleted",
        description: "Event has been successfully deleted.",
      });
      setIsOpen(false);
      onEventDeleted?.();
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: EventFormData) => {
    updateEventMutation.mutate(data);
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteEventMutation.mutate();
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Edit size={16} />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar size={20} />
            Edit Event
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              {...form.register("title")}
              placeholder="Enter event title"
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Event description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <LocationAutocomplete
              value={form.watch("location") || ""}
              onChange={(value) => form.setValue("location", value)}
              placeholder="Enter event location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assign to</Label>
            <Select 
              value={form.watch("assignedTo")?.toString() || ""} 
              onValueChange={(value) => form.setValue("assignedTo", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select family member" />
              </SelectTrigger>
              <SelectContent>
                {familyMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: member.color }}
                      />
                      {member.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="allDay"
              checked={isAllDay}
              onCheckedChange={setIsAllDay}
            />
            <Label htmlFor="allDay">All day event</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
              />
            </div>
            
            {!isAllDay && (
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...form.register("startTime")}
                />
              </div>
            )}
          </div>

          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...form.register("endDate")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...form.register("endTime")}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant={showDeleteConfirm ? "destructive" : "outline"}
              onClick={handleDelete}
              disabled={deleteEventMutation.isPending}
            >
              <Trash2 size={16} className="mr-2" />
              {showDeleteConfirm ? "Confirm Delete" : "Delete Event"}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                <X size={16} className="mr-2" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateEventMutation.isPending}
              >
                <Save size={16} className="mr-2" />
                {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}