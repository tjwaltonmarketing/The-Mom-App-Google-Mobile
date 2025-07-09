import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mic, Square, Check, Calendar, CheckSquare, Bot, Sparkles, Utensils, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface VoiceNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SmartAction {
  type: "task" | "event" | "reminder" | "meal";
  title: string;
  description?: string;
  dueDate?: Date;
  assignedTo?: number;
  priority?: string;
}

export function VoiceNoteModal({ isOpen, onClose }: VoiceNoteModalProps) {
  const [transcript, setTranscript] = useState("");
  const [smartActions, setSmartActions] = useState<SmartAction[]>([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [mealScheduling, setMealScheduling] = useState<{[key: number]: {day: string, mealType: string}}>({});
  const [eventScheduling, setEventScheduling] = useState<{[key: number]: {date: string, time: string}}>({});
  const { isRecording, startRecording, stopRecording } = useVoiceRecording({
    onTranscript: setTranscript,
  });

  const createVoiceNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/voice-notes", {
        content,
        transcription: content,
        createdBy: 1, // Assuming Mom (id: 1) is creating the note
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-notes"] });
    },
  });

  const processAIMutation = useMutation({
    mutationFn: async (voiceInput: string) => {
      const response = await apiRequest("POST", "/api/ai/smart-task-creation", {
        voiceInput,
        familyMembers: [
          { id: 1, name: "Mom", role: "mom" },
          { id: 2, name: "Dad", role: "dad" },
          { id: 3, name: "Emma", role: "child" },
          { id: 4, name: "Sam", role: "child" }
        ]
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      const tasks = data.tasks || [];
      setSmartActions(tasks);
      
      // Pre-populate event scheduling with extracted date/time
      const eventSchedulingDefaults: {[key: number]: {date: string, time: string}} = {};
      tasks.forEach((task: SmartAction, index: number) => {
        if (task.type === "event" && task.dueDate) {
          const date = new Date(task.dueDate);
          // Format for HTML time input (24-hour format HH:MM)
          const hours24 = date.getUTCHours();
          const minutes = date.getUTCMinutes();
          const timeString = `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          
          eventSchedulingDefaults[index] = {
            date: date.toISOString().split('T')[0], // YYYY-MM-DD format
            time: timeString // HH:MM 24-hour format for HTML input
          };
        }
      });
      setEventScheduling(eventSchedulingDefaults);
      
      setIsProcessingAI(false);
    },
    onError: () => {
      setIsProcessingAI(false);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: SmartAction) => {
      return apiRequest("POST", "/api/tasks", {
        title: task.title,
        description: task.description,
        priority: task.priority || "medium",
        assignedTo: task.assignedTo,
        dueDate: task.dueDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async ({ event, date, time }: { event: SmartAction, date: string, time: string }) => {
      const startTime = new Date(`${date}T${time}:00`);
      return apiRequest("POST", "/api/events", {
        title: event.title,
        description: event.description,
        startTime: startTime.toISOString(),
        assignedTo: event.assignedTo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const createMealPlanMutation = useMutation({
    mutationFn: async ({ meal, day, mealType }: { meal: SmartAction, day: string, mealType: string }) => {
      return apiRequest("POST", "/api/meal-plans", {
        meal: meal.title,
        day: day,
        mealType: mealType,
        ingredients: meal.description ? meal.description.split("Ingredients: ")[1]?.split(".")[0]?.split(", ") : [],
        notes: meal.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
    },
  });

  const handleStartRecording = () => {
    setTranscript("");
    setSmartActions([]);
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
    if (transcript.trim()) {
      setIsProcessingAI(true);
      processAIMutation.mutate(transcript);
    }
  };

  const handleSaveNote = () => {
    if (transcript.trim()) {
      createVoiceNoteMutation.mutate(transcript);
    }
  };

  const handleCreateAction = (action: SmartAction, index?: number) => {
    if (action.type === "task") {
      createTaskMutation.mutate(action);
    } else if (action.type === "event" && index !== undefined) {
      const scheduling = eventScheduling[index];
      if (scheduling?.date && scheduling?.time) {
        createEventMutation.mutate({ 
          event: action, 
          date: scheduling.date, 
          time: scheduling.time 
        });
      }
    } else if (action.type === "meal" && index !== undefined) {
      const scheduling = mealScheduling[index];
      if (scheduling?.day && scheduling?.mealType) {
        createMealPlanMutation.mutate({ 
          meal: action, 
          day: scheduling.day, 
          mealType: scheduling.mealType 
        });
      }
    }
  };

  const handleScheduleMeal = (index: number, day: string, mealType: string) => {
    setMealScheduling(prev => ({
      ...prev,
      [index]: { day, mealType }
    }));
  };

  const handleScheduleEvent = (index: number, date: string, time: string) => {
    setEventScheduling(prev => ({
      ...prev,
      [index]: { date, time }
    }));
  };

  const handleCreateAll = () => {
    smartActions.forEach(action => {
      handleCreateAction(action);
    });
    handleClose();
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    setTranscript("");
    setSmartActions([]);
    setIsProcessingAI(false);
    setMealScheduling({});
    setEventScheduling({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full mx-4">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isRecording ? "Listening..." : "Voice Note"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center">
          <div className={`w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-4 ${isRecording ? 'animate-pulse' : ''}`}>
            <Mic className="text-white h-8 w-8" />
          </div>
          
          {isRecording ? (
            <p className="text-gray-600 mb-6">Speak naturally, I'll capture everything!</p>
          ) : (
            <p className="text-gray-600 mb-6">Ready to record your voice note?</p>
          )}
          
          {/* Live transcription area */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 min-h-24">
            <p className="text-sm text-gray-500 italic">
              {transcript || (isRecording ? "Start speaking to see your words appear here..." : "Your transcription will appear here")}
            </p>
          </div>

          {/* AI Processing Status */}
          {isProcessingAI && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-3">
                <LoadingSpinner variant="mom" size="sm" />
                <div className="text-center">
                  <p className="text-blue-700 font-medium">AI Assistant is analyzing...</p>
                  <p className="text-blue-600 text-sm">Creating smart tasks and calendar events</p>
                </div>
              </div>
            </div>
          )}

          {/* Smart Actions */}
          {smartActions.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="h-4 w-4 text-green-600" />
                <h4 className="font-medium text-green-800">Smart Suggestions</h4>
              </div>
              <div className="space-y-3">
                {smartActions.map((action, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border">
                    <div className="flex items-start space-x-3">
                      {action.type === "task" ? (
                        <CheckSquare className="h-4 w-4 text-blue-500 mt-1" />
                      ) : action.type === "meal" ? (
                        <Utensils className="h-4 w-4 text-green-500 mt-1" />
                      ) : (
                        <Calendar className="h-4 w-4 text-purple-500 mt-1" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">{action.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {action.type}
                          </Badge>
                        </div>
                        {action.description && (
                          <p className="text-xs text-gray-600 mb-3">{action.description}</p>
                        )}
                        
                        {action.type === "event" && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="date"
                                className="flex-1 h-8 text-xs border rounded px-2"
                                value={eventScheduling[index]?.date || ""}
                                onChange={(e) => handleScheduleEvent(index, e.target.value, eventScheduling[index]?.time || "12:00")}
                                min={new Date().toISOString().split('T')[0]}
                              />
                              
                              <input
                                type="time"
                                className="flex-1 h-8 text-xs border rounded px-2"
                                value={eventScheduling[index]?.time || ""}
                                onChange={(e) => handleScheduleEvent(index, eventScheduling[index]?.date || new Date().toISOString().split('T')[0], e.target.value)}
                              />
                            </div>
                            
                            <Button
                              size="sm"
                              className="w-full h-8 text-xs"
                              onClick={() => handleCreateAction(action, index)}
                              disabled={!eventScheduling[index]?.date || !eventScheduling[index]?.time || createEventMutation.isPending}
                            >
                              {createEventMutation.isPending ? "Adding..." : "Add to Calendar"}
                            </Button>
                          </div>
                        )}

                        {action.type === "meal" && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Select
                                value={mealScheduling[index]?.day || ""}
                                onValueChange={(day) => handleScheduleMeal(index, day, mealScheduling[index]?.mealType || "dinner")}
                              >
                                <SelectTrigger className="flex-1 h-8 text-xs">
                                  <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Monday">Monday</SelectItem>
                                  <SelectItem value="Tuesday">Tuesday</SelectItem>
                                  <SelectItem value="Wednesday">Wednesday</SelectItem>
                                  <SelectItem value="Thursday">Thursday</SelectItem>
                                  <SelectItem value="Friday">Friday</SelectItem>
                                  <SelectItem value="Saturday">Saturday</SelectItem>
                                  <SelectItem value="Sunday">Sunday</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Select
                                value={mealScheduling[index]?.mealType || ""}
                                onValueChange={(mealType) => handleScheduleMeal(index, mealScheduling[index]?.day || "Monday", mealType)}
                              >
                                <SelectTrigger className="flex-1 h-8 text-xs">
                                  <SelectValue placeholder="Meal type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="breakfast">Breakfast</SelectItem>
                                  <SelectItem value="lunch">Lunch</SelectItem>
                                  <SelectItem value="dinner">Dinner</SelectItem>
                                  <SelectItem value="snack">Snack</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <Button
                              size="sm"
                              className="w-full h-8 text-xs"
                              onClick={() => handleCreateAction(action, index)}
                              disabled={!mealScheduling[index]?.day || !mealScheduling[index]?.mealType || createMealPlanMutation.isPending}
                            >
                              {createMealPlanMutation.isPending ? "Adding..." : "Add to Meal Plan"}
                            </Button>
                          </div>
                        )}
                        
                        {action.type === "task" && (
                          <Button
                            size="sm"
                            className="w-full h-8 text-xs mt-2"
                            onClick={() => handleCreateAction(action)}
                          >
                            Create Task
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex space-x-3">
            {!isRecording ? (
              <>
                {smartActions.length > 0 ? (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleSaveNote}
                      disabled={createVoiceNoteMutation.isPending}
                    >
                      Save Note Only
                    </Button>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={handleCreateAll}
                      disabled={createTaskMutation.isPending || createEventMutation.isPending}
                    >
                      <Bot className="mr-2 h-4 w-4" />
                      Create All
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleClose}
                      disabled={createVoiceNoteMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-accent hover:bg-orange-400"
                      onClick={handleStartRecording}
                      disabled={createVoiceNoteMutation.isPending}
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      Start Recording
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleStopRecording}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-blue-600"
                  onClick={() => {
                    handleStopRecording();
                    handleSaveNote();
                  }}
                  disabled={createVoiceNoteMutation.isPending}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Done
                </Button>
              </>
            )}
          </div>

          {transcript && !isRecording && (
            <div className="mt-4">
              <Button
                className="w-full bg-primary hover:bg-blue-600"
                onClick={handleSaveNote}
                disabled={createVoiceNoteMutation.isPending}
              >
                {createVoiceNoteMutation.isPending ? "Saving..." : "Save Voice Note"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
