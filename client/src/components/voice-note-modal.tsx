import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mic, Square, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface VoiceNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceNoteModal({ isOpen, onClose }: VoiceNoteModalProps) {
  const [transcript, setTranscript] = useState("");
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
      handleClose();
    },
  });

  const handleStartRecording = () => {
    setTranscript("");
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleSaveNote = () => {
    if (transcript.trim()) {
      createVoiceNoteMutation.mutate(transcript);
    }
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
          
          <div className="flex space-x-3">
            {!isRecording ? (
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
