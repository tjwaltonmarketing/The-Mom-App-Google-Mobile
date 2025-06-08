import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mic, Square, Check, Calendar, CheckSquare, Bot, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface VoiceNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SmartAction {
  type: "task" | "event" | "reminder";
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
      setSmartActions(data.tasks || []);
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
    mutationFn: async (event: SmartAction) => {
      return apiRequest("POST", "/api/events", {
        title: event.title,
        description: event.description,
        startTime: event.dueDate,
        assignedTo: event.assignedTo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
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

  const handleCreateAction = (action: SmartAction) => {
    if (action.type === "task") {
      createTaskMutation.mutate(action);
    } else if (action.type === "event") {
      createEventMutation.mutate(action);
    }
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
              <div className="space-y-2">
                {smartActions.map((action, index) => (
                  <div key={index} className="flex items-center justify-between bg-white rounded p-3">
                    <div className="flex items-center space-x-2">
                      {action.type === "task" ? (
                        <CheckSquare className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Calendar className="h-4 w-4 text-purple-500" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{action.title}</p>
                        {action.description && (
                          <p className="text-xs text-gray-600">{action.description}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {action.type}
                    </Badge>
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
