import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, User, Eye, EyeOff, Users, Repeat, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, authFetch } from "@/lib/queryClient";
import { insertEventSchema, type FamilyMember } from "@shared/schema";
import { format } from "date-fns";
import * as z from "zod";
import { useSubscription } from "@/hooks/use-subscription";
import { Link } from "wouter";

const eventFormSchema = insertEventSchema.extend({
  startDate: z.string(),
  startTime: z.string(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  visibilityType: z.enum(["shared", "private", "busy"]).default("shared"),
  sharedWith: z.array(z.number()).default([]),
  recurrenceType: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).default("none"),
  recurrenceInterval: z.number().min(1).default(1),
  recurrenceEndDate: z.string().optional(),
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  onSuccess?: () => void;
  selectedDate?: Date | null;
}

export function EventForm({ onSuccess, selectedDate }: EventFormProps) {
  const [isAllDay, setIsAllDay] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isIndividualPlan, canShareCalendar } = useSubscription();

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
    queryFn: async () => {
      const response = await authFetch('/api/family-members');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }
  });

  const defaultDate = selectedDate || new Date();
  
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      assignedTo: [],
      isAllDay: false,
      visibilityType: isIndividualPlan ? "private" : "shared",
      sharedWith: [],
      startDate: format(defaultDate, "yyyy-MM-dd"),
      startTime: "09:00",
      endDate: format(defaultDate, "yyyy-MM-dd"),
      endTime: "22:00",
      recurrenceType: "none",
      recurrenceInterval: 1,
      recurrenceEndDate: "",
    },
  });

  // Force private visibility for individual plan users
  useEffect(() => {
    if (isIndividualPlan) {
      form.setValue("visibilityType", "private");
      form.setValue("sharedWith", []);
    }
  }, [isIndividualPlan, form]);

  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const { startDate, startTime, endDate, endTime, visibilityType, sharedWith, recurrenceType, recurrenceInterval, recurrenceEndDate, ...eventData } = data;
      
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

      // Set privacy fields based on visibility type to match database schema
      let isPrivate = false;
      let finalSharedWith: number[] = [];

      switch (visibilityType) {
        case "private":
          isPrivate = true;
          break;
        case "busy":
          isPrivate = false;
          finalSharedWith = [];
          break;
        case "shared":
        default:
          isPrivate = false;
          finalSharedWith = sharedWith.length > 0 ? sharedWith : [];
          break;
      }

      const eventPayload = {
        ...eventData,
        startTime: startDateTime,
        endTime: endDateTime,
        isAllDay,
        isPrivate,
        visibilityType,
        sharedWith: finalSharedWith,
        recurrenceType: recurrenceType || "none",
        recurrenceInterval: recurrenceInterval || 1,
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
      };

      return apiRequest("POST", "/api/events", eventPayload);
    },
    onSuccess: () => {
      // Use the same simple pattern as teen tasks
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Also refetch immediately for better UX
      queryClient.refetchQueries({ queryKey: ["/api/events"] });
      
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
            <Label htmlFor="assignedTo">Assign to Family Members</Label>
            <div className="space-y-3">
              {/* Select All / None buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allMemberIds = familyMembers.map(m => m.id);
                    form.setValue("assignedTo", allMemberIds);
                  }}
                  disabled={familyMembers.length === 0}
                >
                  <Users className="h-4 w-4 mr-1" />
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => form.setValue("assignedTo", [])}
                >
                  Clear All
                </Button>
                <div className="text-sm text-gray-500 ml-auto">
                  {(form.watch("assignedTo") || []).length} of {familyMembers.length} selected
                </div>
              </div>
              
              {/* Family member checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`assigned-${member.id}`}
                      checked={(form.watch("assignedTo") || []).includes(member.id)}
                      onChange={(e) => {
                        const currentAssigned = form.watch("assignedTo") || [];
                        if (e.target.checked) {
                          form.setValue("assignedTo", [...currentAssigned, member.id]);
                        } else {
                          form.setValue("assignedTo", currentAssigned.filter(id => id !== member.id));
                        }
                      }}
                      className="rounded"
                    />
                    <Label htmlFor={`assigned-${member.id}`} className="text-sm font-normal flex items-center gap-2 cursor-pointer">
                      <span>{member.name}</span>
                      <span className="text-xs text-gray-500 capitalize">({member.role})</span>
                    </Label>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-gray-500">
                Select which family members this event is assigned to. Everyone will see the event, but only assigned members get notifications.
              </p>
            </div>
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

          {/* Recurrence Options */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <Repeat size={18} className="text-gray-600 dark:text-gray-400" />
              <Label className="text-sm font-medium">Repeat</Label>
            </div>
            
            <div>
              <Select
                value={form.watch("recurrenceType")}
                onValueChange={(value: "none" | "daily" | "weekly" | "monthly" | "yearly") => 
                  form.setValue("recurrenceType", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select repeat frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.watch("recurrenceType") !== "none" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="recurrenceInterval">Repeat every</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="recurrenceInterval"
                        type="number"
                        min={1}
                        max={99}
                        className="w-20"
                        value={form.watch("recurrenceInterval")}
                        onChange={(e) => form.setValue("recurrenceInterval", parseInt(e.target.value) || 1)}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {form.watch("recurrenceType") === "daily" && "day(s)"}
                        {form.watch("recurrenceType") === "weekly" && "week(s)"}
                        {form.watch("recurrenceType") === "monthly" && "month(s)"}
                        {form.watch("recurrenceType") === "yearly" && "year(s)"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="recurrenceEndDate">End repeat (optional)</Label>
                    <Input
                      id="recurrenceEndDate"
                      type="date"
                      {...form.register("recurrenceEndDate")}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Leave end date empty to repeat indefinitely
                </p>
              </>
            )}
          </div>

          {/* Calendar Privacy Controls */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <Eye size={18} className="text-gray-600 dark:text-gray-400" />
              <Label className="text-sm font-medium">Privacy & Sharing</Label>
            </div>
            
            {isIndividualPlan && (
              <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-md border border-pink-200 dark:border-pink-800">
                <div className="flex items-center gap-2 text-sm text-pink-700 dark:text-pink-300">
                  <Crown className="h-4 w-4 text-pink-500" />
                  <span>Calendar sharing requires Family Plan</span>
                </div>
                <Link href="/plans">
                  <Button variant="link" size="sm" className="text-pink-500 p-0 h-auto mt-1">
                    Upgrade to share events
                  </Button>
                </Link>
              </div>
            )}
            
            <div>
              <Label htmlFor="visibilityType" className="text-sm">Visibility</Label>
              <Select
                value={isIndividualPlan ? "private" : form.watch("visibilityType")}
                onValueChange={(value: "shared" | "private" | "busy") => 
                  form.setValue("visibilityType", value)
                }
                disabled={isIndividualPlan}
              >
                <SelectTrigger className={isIndividualPlan ? "opacity-50" : ""}>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared" disabled={isIndividualPlan}>
                    <div className="flex items-center gap-2">
                      <Users size={16} />
                      <span>Shared - Everyone can see details</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="busy" disabled={isIndividualPlan}>
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

            {form.watch("visibilityType") === "shared" && familyMembers.length > 1 && !isIndividualPlan && (
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