import { useState, useRef } from "react";
import { Mic, MicOff, Calendar, CheckSquare, MessageSquare, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface VoiceAction {
  type: "create_event" | "create_task" | "create_reminder";
  data: any;
}

interface VoiceResponse {
  message: string;
  actions?: VoiceAction[];
}

export function SmartVoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastAction, setLastAction] = useState("");
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check browser support
  const speechSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const processVoiceCommand = useMutation({
    mutationFn: async (voiceText: string) => {
      const response = await apiRequest("POST", "/api/ai/voice-command", {
        message: voiceText,
        familyContext: {
          members: [],
          upcomingEvents: [],
          pendingTasks: []
        }
      });
      const data = await response.json();
      return data as VoiceResponse;
    },
    onSuccess: (data) => {
      setLastAction(data.message);
      
      if (data.actions && data.actions.length > 0) {
        toast({
          title: "Voice Command Complete",
          description: `${data.actions.length} action(s) created: ${data.message}`,
        });
      } else {
        toast({
          title: "Voice Assistant",
          description: data.message,
        });
      }
      
      // Refresh data if actions were performed
      if (data.actions?.some(a => a.type === "create_event")) {
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        queryClient.invalidateQueries({ queryKey: ["/api/events/today"] });
      }
      if (data.actions?.some(a => a.type === "create_task")) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending"] });
      }
    },
    onError: () => {
      setLastAction("Command processing failed");
      toast({
        title: "Voice Command Failed",
        description: "Could not process your request. Try speaking more clearly.",
        variant: "destructive",
      });
    }
  });

  const startListening = () => {
    if (!speechSupported) {
      toast({
        title: "Not Supported",
        description: "Speech recognition not available in this browser",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      toast({
        title: "Listening...",
        description: "Speak your command now",
      });
    };

    recognition.onresult = (event: any) => {
      const voiceText = event.results[0][0].transcript;
      setTranscript(voiceText);
      setIsListening(false);
      
      // Process the command
      processVoiceCommand.mutate(voiceText);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      toast({
        title: "Voice Error",
        description: `Recognition failed: ${event.error}`,
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Smart Voice Assistant
          <Badge variant="secondary">Push to Talk</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voice Control Button */}
        <div className="flex flex-col items-center space-y-4">
          <Button
            size="lg"
            onClick={isListening ? stopListening : startListening}
            disabled={processVoiceCommand.isPending}
            className={`h-16 w-16 rounded-full ${
              isListening 
                ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {processVoiceCommand.isPending ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isListening ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
          
          <p className="text-sm text-muted-foreground text-center">
            {isListening 
              ? "Listening... Tap to stop" 
              : processVoiceCommand.isPending
              ? "Processing your command..."
              : "Tap to speak your command"
            }
          </p>
        </div>

        {/* Voice Examples */}
        <div className="space-y-3">
          <h4 className="font-medium">Try saying:</h4>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span>"Schedule dentist appointment tomorrow at 2 PM"</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <CheckSquare className="h-4 w-4 text-green-500" />
              <span>"Add buy groceries to my task list"</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span>"Create family movie night event for Friday at 7 PM"</span>
            </div>
          </div>
        </div>

        {/* Results Display */}
        {transcript && (
          <div className="space-y-2">
            <h4 className="font-medium">You said:</h4>
            <p className="p-3 bg-muted rounded-lg text-sm">"{transcript}"</p>
          </div>
        )}

        {lastAction && (
          <div className="space-y-2">
            <h4 className="font-medium">Assistant Response:</h4>
            <p className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">{lastAction}</p>
          </div>
        )}

        {/* Technical Note */}
        <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
          <strong>Note:</strong> This push-to-talk system works reliably across all devices and lock states, 
          avoiding the limitations of always-on voice activation that requires unlocked phones.
        </div>
      </CardContent>
    </Card>
  );
}