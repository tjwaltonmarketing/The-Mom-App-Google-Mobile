import { useState, useCallback, useRef } from "react";

interface UseVoiceRecordingOptions {
  onTranscript: (transcript: string) => void;
}

export function useVoiceRecording({ onTranscript }: UseVoiceRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fullTranscriptRef = useRef<string>("");

  const startRecording = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      // Fallback to show proper error message instead of mock data
      console.warn("Speech recognition not supported in this browser");
      onError?.("Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge for voice features.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      fullTranscriptRef.current = "";
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (finalTranscript) {
        fullTranscriptRef.current += finalTranscript;
      }
      
      // Send current complete transcript (final + interim for live preview)
      const currentTranscript = fullTranscriptRef.current + interimTranscript;
      if (currentTranscript.trim()) {
        onTranscript(currentTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      // Send final complete transcript
      if (fullTranscriptRef.current.trim()) {
        onTranscript(fullTranscriptRef.current.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
