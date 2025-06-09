import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mic, MicOff, Bot, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function VoiceWakeUp() {
  const [isListening, setIsListening] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [lastCommand, setLastCommand] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  // Check if browser supports speech recognition
  const speechRecognitionSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const processVoiceCommandMutation = useMutation({
    mutationFn: async (command: string) => {
      return apiRequest("POST", "/api/ai/voice-command", {
        message: command,
        familyContext: {
          members: [], // Would fetch from API in real implementation
          upcomingEvents: [],
          pendingTasks: []
        }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Command processed",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
    onError: () => {
      toast({
        title: "Command failed",
        description: "Could not process voice command",
        variant: "destructive",
      });
    }
  });

  const startListening = () => {
    if (!speechRecognitionSupported) {
      toast({
        title: "Not supported",
        description: "Speech recognition not available in this browser",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      console.log('Voice wake-up listening started');
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript.toLowerCase())
        .join('');

      console.log('Heard:', transcript);

      // Check for wake word "hey lisa"
      if (transcript.includes('hey lisa') && !wakeWordDetected) {
        setWakeWordDetected(true);
        toast({
          title: "Hey Lisa!",
          description: "I'm listening for your command...",
        });
        
        // Clear transcript after wake word
        setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
            startCommandListening();
          }
        }, 1000);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access to use voice wake-up",
          variant: "destructive",
        });
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isActive && !wakeWordDetected) {
        // Restart listening for wake word
        setTimeout(() => startListening(), 1000);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const startCommandListening = () => {
    if (!speechRecognitionSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript;
      setLastCommand(command);
      setIsProcessing(true);
      
      toast({
        title: "Processing command",
        description: `"${command}"`,
      });

      // Process the command with AI
      processVoiceCommandMutation.mutate(command);
    };

    recognition.onend = () => {
      setWakeWordDetected(false);
      setIsProcessing(false);
      if (isActive) {
        // Return to wake word listening
        setTimeout(() => startListening(), 2000);
      }
    };

    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setWakeWordDetected(false);
    setIsActive(false);
  };

  const toggleVoiceWakeUp = (enabled: boolean) => {
    setIsActive(enabled);
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  if (!speechRecognitionSupported) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Hey Lisa Voice Wake-up
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Speech recognition is not supported in this browser. Try using Chrome or Safari.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Hey Lisa Voice Wake-up
          <Sparkles className="h-4 w-4 text-yellow-500" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Always listening</span>
          <Switch
            checked={isActive}
            onCheckedChange={toggleVoiceWakeUp}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isListening ? (
              <Mic className="h-4 w-4 text-red-500 animate-pulse" />
            ) : (
              <MicOff className="h-4 w-4 text-gray-400" />
            )}
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? (wakeWordDetected ? "Listening for command" : "Listening for 'Hey Lisa'") : "Inactive"}
            </Badge>
          </div>

          {wakeWordDetected && (
            <Badge variant="outline" className="animate-pulse">
              Wake word detected! Speak your command...
            </Badge>
          )}

          {isProcessing && (
            <Badge variant="outline">
              Processing command...
            </Badge>
          )}
        </div>

        {lastCommand && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Last command:</p>
            <p className="text-sm text-muted-foreground">"{lastCommand}"</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Try saying:</strong></p>
          <p>"Hey Lisa, add soccer practice to calendar for Thursday at 4pm"</p>
          <p>"Hey Lisa, remind me to call mom tomorrow"</p>
          <p>"Hey Lisa, create a task to buy groceries"</p>
        </div>
      </CardContent>
    </Card>
  );
}