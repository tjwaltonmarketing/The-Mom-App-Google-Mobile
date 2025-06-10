import { useState, useRef } from "react";
import { Mic, MicOff, Bot, Calendar, CheckSquare, MessageSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function VoiceWakeTest() {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastCommand, setLastCommand] = useState("");
  const [processing, setProcessing] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check browser support
  const speechSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = () => {
    if (!speechSupported) {
      toast({
        title: "Not supported",
        description: "Speech recognition not available in this browser",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      console.log('Voice detection started');
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript.toLowerCase())
        .join('');

      setLastTranscript(transcript);
      console.log('Heard:', transcript);

      // Check for wake word "hey lisa"
      if (transcript.includes('hey lisa')) {
        if (!wakeWordDetected) {
          setWakeWordDetected(true);
          toast({
            title: "Hey Lisa detected!",
            description: "Wake word activated. Listening for command...",
          });
        }
        
        // Extract command after wake word
        const commandPart = transcript.split('hey lisa')[1]?.trim();
        if (commandPart && commandPart.length > 2) {
          setLastCommand(commandPart);
          toast({
            title: "Command received",
            description: `"${commandPart}"`,
          });
          
          // Reset wake word detection after processing command
          setTimeout(() => {
            setWakeWordDetected(false);
            setLastTranscript(""); // Clear transcript for next command
          }, 2000);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access",
          variant: "destructive",
        });
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('Recognition ended, isActive:', isActive);
      setIsListening(false);
      if (isActive) {
        // Automatically restart listening for continuous wake word detection
        setTimeout(() => {
          console.log('Auto-restarting recognition...');
          startListening();
        }, 500);
      }
    };

    recognitionRef.current = recognition;
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

  const testCommand = () => {
    setWakeWordDetected(true);
    setLastCommand("add soccer practice to calendar Thursday at 4pm");
    toast({
      title: "Test command simulated",
      description: "Testing voice command processing",
    });
    setTimeout(() => setWakeWordDetected(false), 3000);
  };

  if (!speechSupported) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Hey Lisa Voice Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Speech recognition is not supported in this browser. Try Chrome or Safari.
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
          Hey Lisa Voice Test
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
              {isActive ? (wakeWordDetected ? "Command mode" : "Listening for 'Hey Lisa'") : "Inactive"}
            </Badge>
          </div>

          {wakeWordDetected && (
            <Badge variant="outline" className="animate-pulse">
              Wake word detected!
            </Badge>
          )}
        </div>

        {lastTranscript && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Last heard:</p>
            <p className="text-sm text-muted-foreground">"{lastTranscript}"</p>
          </div>
        )}

        {lastCommand && (
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-sm font-medium">Command extracted:</p>
            <p className="text-sm text-green-700 dark:text-green-300">"{lastCommand}"</p>
          </div>
        )}

        <div className="space-y-2">
          <Button onClick={testCommand} variant="outline" size="sm" className="w-full">
            Test Command
          </Button>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Try saying:</strong></p>
            <p>"Hey Lisa, add soccer practice to calendar Thursday at 4pm"</p>
            <p>"Hey Lisa, remind me to call mom tomorrow"</p>
            <p>"Hey Lisa, create a task to buy groceries"</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}