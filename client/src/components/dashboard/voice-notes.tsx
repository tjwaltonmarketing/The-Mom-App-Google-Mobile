import { useQuery } from "@tanstack/react-query";
import { Mic, Quote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { VoiceNote, FamilyMember } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface VoiceNotesProps {
  onStartRecording: () => void;
}

export function VoiceNotes({ onStartRecording }: VoiceNotesProps) {
  const { data: recentNotes = [], isLoading: notesLoading } = useQuery<VoiceNote[]>({
    queryKey: ["/api/voice-notes/recent"],
  });

  const { data: familyMembers = [], isLoading: membersLoading } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const getMemberById = (id: number | null) => {
    return familyMembers.find(member => member.id === id);
  };

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
      
      <CardContent>
        {notesLoading || membersLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner variant="mom" size="md" />
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="text-center text-gray-500 py-8">
                <Mic className="h-12 w-12 text-gray-300 mb-4 mx-auto" />
                <p className="text-sm">Tap the microphone to start a voice note</p>
                <p className="text-xs text-gray-400 mt-2">
                  We'll automatically convert it to text and create tasks!
                </p>
              </div>
            </div>
            
            {recentNotes.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Recent Notes</h4>
                {recentNotes.map((note) => {
                  const member = getMemberById(note.createdBy);
                  return (
                    <div key={note.id} className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-start space-x-3">
                        <Quote className="text-blue-400 text-sm mt-1 h-4 w-4" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">
                            "{note.transcription || note.content}"
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {note.createdAt && formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })} • {member?.name || 'Unknown'}
                            </span>
                            <Button variant="link" className="text-xs text-primary hover:text-blue-600 p-0 h-auto">
                              Create Tasks
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
