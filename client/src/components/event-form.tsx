import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, User, Eye, EyeOff, Users } from "lucide-react";
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
  visibilityType: z.enum(["shared", "private", "busy"]).default("shared"),
  sharedWith: z.array(z.number()).default([]),
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
      visibilityType: "shared",
      sharedWith: [],
      startDate: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      endDate: format(new Date(), "yyyy-MM-dd"),
      endTime: "22:00",
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const { startDate, startTime, endDate, endTime, visibilityType, sharedWith, ...eventData } = data;
      
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

      // Set privacy fields based on visibility type
      let privacyLevel: string;
      let showAsBusy = false;
      let finalSharedWith: number[] = [];

      switch (visibilityType) {
        case "private":
          privacyLevel = "private";
          break;
        case "busy":
          privacyLevel = "public";
          showAsBusy = true;
          break;
        case "shared":
        default:
          privacyLevel = "public";
          finalSharedWith = sharedWith.length > 0 ? sharedWith : [];
          break;
      }

      const eventPayload = {
        ...eventData,
        startTime: startDateTime,
        endTime: endDateTime,
        isAllDay,
        privacyLevel,
        sharedWith: finalSharedWith,
        showAsBusy,
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

          {/* Calendar Privacy Controls */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <Eye size={18} className="text-gray-600 dark:text-gray-400" />
              <Label className="text-sm font-medium">Privacy & Sharing</Label>
            </div>
            
            <div>
              <Label htmlFor="visibilityType" className="text-sm">Visibility</Label>
              <Select
                value={form.watch("visibilityType")}
                onValueChange={(value: "shared" | "private" | "busy") => 
                  form.setValue("visibilityType", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">
                    <div className="flex items-center gap-2">
                      <Users size={16} />
                      <span>Shared - Everyone can see details</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="busy">
                    <div className="flex items-center gap-2">
                      <Eye size={16} />
                      <span>Busy - Time blocked, no details shown</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <EyeOff size={16} />
                      <span>Private - Only visible to you</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {form.watch("visibilityType") === "shared" && "All family members can see event details"}
                {form.watch("visibilityType") === "busy" && "Others see time is blocked but no event details"}
                {form.watch("visibilityType") === "private" && "Only you can see this event"}
              </p>
            </div>

            {form.watch("visibilityType") === "shared" && familyMembers.length > 1 && (
              <div>
                <Label className="text-sm">Share with specific family members (optional)</Label>
                <div className="mt-2 space-y-2">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`member-${member.id}`}
                        checked={form.watch("sharedWith").includes(member.id)}
                        onChange={(e) => {
                          const currentShared = form.watch("sharedWith");
                          if (e.target.checked) {
                            form.setValue("sharedWith", [...currentShared, member.id]);
                          } else {
                            form.setValue("sharedWith", currentShared.filter(id => id !== member.id));
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`member-${member.id}`} className="text-sm font-normal">
                        {member.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Leave unchecked to share with all family members
                </p>
              </div>
            )}
          </div>

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