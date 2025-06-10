import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertEventSchema, type FamilyMember } from "@shared/schema";
import { format } from "date-fns";
import * as z from "zod";

const eventFormSchema = insertEventSchema.extend({
  startDate: z.string(),
  startTime: z.string(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  onSuccess?: () => void;
}

export function EventForm({ onSuccess }: EventFormProps) {
  const [isAllDay, setIsAllDay] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      assignedTo: null,
      isAllDay: false,
      startDate: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      endDate: format(new Date(), "yyyy-MM-dd"),
      endTime: "22:00",
    },
  });

  const createEventMutation = useMutation({
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

      return apiRequest("POST", "/api/events", eventPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/today"] });
      toast({
        title: "Event created",
        description: "Your event has been added to the calendar.",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventFormData) => {
    createEventMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar size={20} />
          Create New Event
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              placeholder="Enter event title"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Event description (optional)"
              {...form.register("description")}
            />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <LocationAutocomplete
              value={form.watch("location") || ""}
              onChange={(value) => form.setValue("location", value)}
              placeholder="Enter event location (optional)"
            />
          </div>

          <div>
            <Label htmlFor="assignedTo">Assign to Family Member</Label>
            <Select
              onValueChange={(value) => 
                form.setValue("assignedTo", value === "none" ? null : parseInt(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select family member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No one assigned</SelectItem>
                {familyMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{member.avatar}</span>
                      <span>{member.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="all-day"
              checked={isAllDay}
              onCheckedChange={setIsAllDay}
            />
            <Label htmlFor="all-day">All day event</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
              />
            </div>
            {!isAllDay && (
              <div>
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
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...form.register("endDate")}
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...form.register("endTime")}
                />
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={createEventMutation.isPending}
          >
            {createEventMutation.isPending ? "Creating..." : "Create Event"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}