import { useState, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";

interface UseVoiceRecordingOptions {
  onTranscript: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceRecording({ onTranscript, onError }: UseVoiceRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const recognitionRef = useRef<any>(null);
  const fullTranscriptRef = useRef<string>("");

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      // On native platforms, we need to explicitly request permission
      if (Capacitor.isNativePlatform()) {
        // For Capacitor, try to get user media which triggers native permission dialog
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          setPermissionStatus('granted');
          return true;
        } catch (nativeError: any) {
          console.error('Native microphone permission error:', nativeError);
          setPermissionStatus('denied');
          
          // On native, provide more specific guidance
          const isAndroid = Capacitor.getPlatform() === 'android';
          const settingsPath = isAndroid 
            ? 'Go to Settings > Apps > The Mom App > Permissions > Microphone'
            : 'Go to Settings > The Mom App > Microphone';
          
          onError?.(`Microphone access was denied. ${settingsPath} to enable it.`);
          return false;
        }
      }
      
      // Web browser permission request
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
      return true;
    } catch (error: any) {
      console.error('Microphone permission error:', error);
      setPermissionStatus('denied');
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        onError?.('Microphone access was denied. Please enable microphone permissions in your device settings.');
      } else if (error.name === 'NotFoundError') {
        onError?.('No microphone found. Please connect a microphone and try again.');
      } else {
        onError?.('Could not access microphone. Please check your device settings.');
      }
      return false;
    }
  }, [onError]);

  const startRecording = useCallback(async () => {
    // Check for Speech Recognition support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech recognition not supported in this browser");
      onError?.('Voice recognition is not supported on this device. Please try using a different browser or device.');
      return;
    }

    // Request microphone permission first
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      return;
    }

    try {
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

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        
        // Only process new results starting from resultIndex to avoid repetition
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            // Add final results to our accumulated transcript
            fullTranscriptRef.current += transcript + ' ';
          } else {
            // Collect interim results for live preview
            interimTranscript += transcript;
          }
        }
        
        // Send current complete transcript (final + interim for live preview)
        const currentTranscript = fullTranscriptRef.current + interimTranscript;
        if (currentTranscript.trim()) {
          onTranscript(currentTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
        // Provide user-friendly error messages
        switch (event.error) {
          case 'not-allowed':
            onError?.('Microphone access was denied. Please enable microphone permissions and try again.');
            break;
          case 'no-speech':
            onError?.('No speech was detected. Please try speaking louder or check your microphone.');
            break;
          case 'audio-capture':
            onError?.('Could not capture audio. Please check if another app is using the microphone.');
            break;
          case 'network':
            onError?.('Network error occurred. Please check your internet connection.');
            break;
          default:
            onError?.('An error occurred with voice recognition. Please try again.');
        }
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
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      onError?.('Failed to start voice recording. Please try again.');
      setIsRecording(false);
    }
  }, [onTranscript, onError, requestMicrophonePermission]);

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
    permissionStatus,
  };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
