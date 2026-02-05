import { useState, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

interface UseVoiceRecordingOptions {
  onTranscript: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceRecording({ onTranscript, onError }: UseVoiceRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const recognitionRef = useRef<any>(null);
  const fullTranscriptRef = useRef<string>("");
  const isNativeRef = useRef(Capacitor.isNativePlatform());

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      if (isNativeRef.current) {
        const { speechRecognition } = await SpeechRecognition.checkPermissions();
        
        if (speechRecognition === 'granted') {
          setPermissionStatus('granted');
          return true;
        }
        
        const result = await SpeechRecognition.requestPermissions();
        
        if (result.speechRecognition === 'granted') {
          setPermissionStatus('granted');
          return true;
        } else {
          setPermissionStatus('denied');
          const isAndroid = Capacitor.getPlatform() === 'android';
          const settingsPath = isAndroid 
            ? 'Go to Settings > Apps > The Mom App > Permissions > Microphone'
            : 'Go to Settings > The Mom App > Microphone';
          
          onError?.(`Microphone access was denied. ${settingsPath} to enable it.`);
          return false;
        }
      }
      
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
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      return;
    }

    try {
      if (isNativeRef.current) {
        const available = await SpeechRecognition.available();
        if (!available.available) {
          onError?.('Voice recognition is not available on this device.');
          return;
        }

        fullTranscriptRef.current = "";
        setIsRecording(true);

        await SpeechRecognition.start({
          language: "en-US",
          partialResults: true,
          popup: false,
        });

        SpeechRecognition.addListener("partialResults", (data: any) => {
          if (data.matches && data.matches.length > 0) {
            const transcript = data.matches[0];
            fullTranscriptRef.current = transcript;
            onTranscript(transcript);
          }
        });

        return;
      }

      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        onError?.('Voice recognition is not supported on this device. Please try using a different browser or device.');
        return;
      }

      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionAPI();
      
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
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            fullTranscriptRef.current += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        const currentTranscript = fullTranscriptRef.current + interimTranscript;
        if (currentTranscript.trim()) {
          onTranscript(currentTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
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

  const stopRecording = useCallback(async () => {
    if (isNativeRef.current) {
      try {
        await SpeechRecognition.stop();
        SpeechRecognition.removeAllListeners();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    } else if (recognitionRef.current) {
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

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
