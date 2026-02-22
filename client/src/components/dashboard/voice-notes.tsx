import { useQuery } from "@tanstack/react-query";
import { Mic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { VoiceNote } from "@shared/schema";
import { authFetch } from "@/lib/queryClient";

interface VoiceNotesProps {
  onStartRecording: () => void;
}

export function VoiceNotes({ onStartRecording }: VoiceNotesProps) {
  const { data: allNotes = [], isLoading: notesLoading } = useQuery<VoiceNote[]>({
    queryKey: ["/api/voice-notes/recent"],
    queryFn: async () => {
      const response = await authFetch('/api/voice-notes/recent');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 0, // Always consider data stale for immediate updates
    gcTime: 0,    // Don't cache in garbage collection
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Mic className="text-accent mr-2 h-5 w-5" />
          Voice Notes & Brain Dump
        </CardTitle>
        <Button
          onClick={onStartRecording}
          className="bg-accent hover:bg-orange-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Mic className="mr-2 h-4 w-4" />
          Start Recording
        </Button>
      </CardHeader>
      
      <CardContent className="pt-0">
        {notesLoading ? (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner variant="mom" size="sm" />
          </div>
        ) : (
          <>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
                <Mic className="h-6 w-6 text-gray-300" />
                <div>
                  <p className="text-sm">Tap the microphone to start a voice note</p>
                  <p className="text-xs text-gray-400">Auto-converts to text & creates tasks!</p>
                </div>
              </div>
            </div>
            
            {/* Quick access to view all notes */}
            {allNotes.length > 0 && (
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-sm"
                  onClick={() => window.location.href = '/notes'}
                  data-testid="view-all-notes-button"
                >
                  View All Notes ({allNotes.length})
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
