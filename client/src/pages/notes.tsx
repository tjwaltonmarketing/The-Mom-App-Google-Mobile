import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mic, Quote, ChevronDown, ChevronUp, Search, Plus, FileText, Edit, Trash2, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { VoiceNoteModal } from "@/components/voice-note-modal";
import { FullScreenNoteEditor } from "@/components/full-screen-note-editor";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RichTextEditor, RichTextDisplay } from "@/components/ui/rich-text-editor";
import type { VoiceNote, TextNote, FamilyMember } from "@shared/schema";
import { formatDistanceToNow, format, isToday, isYesterday, startOfDay } from "date-fns";

export default function Notes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showFullScreenNewNote, setShowFullScreenNewNote] = useState(false);
  const [fullScreenEditNote, setFullScreenEditNote] = useState<TextNote | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Voice Notes Query
  const { data: voiceNotes = [], isLoading: voiceNotesLoading } = useQuery<VoiceNote[]>({
    queryKey: ["/api/voice-notes/recent"],
    queryFn: async () => {
      const response = await fetch('/api/voice-notes/recent', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Text Notes Query
  const { data: textNotes = [], isLoading: textNotesLoading } = useQuery<TextNote[]>({
    queryKey: ["/api/text-notes"],
    queryFn: async () => {
      const response = await fetch('/api/text-notes', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
  });

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  // Text Notes Mutations
  const createTextNoteMutation = useMutation({
    mutationFn: async (noteData: { title: string; content: string }) => {
      const response = await fetch('/api/text-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(noteData),
      });
      if (!response.ok) {
        throw new Error('Failed to create note');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/text-notes"] });
      setShowFullScreenNewNote(false);
      toast({
        title: "Note Created",
        description: "Your text note has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTextNoteMutation = useMutation({
    mutationFn: async ({ id, ...noteData }: { id: number; title: string; content: string }) => {
      const response = await fetch(`/api/text-notes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(noteData),
      });
      if (!response.ok) {
        throw new Error('Failed to update note');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/text-notes"] });
      // Don't close full screen editor - just show success (auto-save behavior)
      toast({
        title: "Note Updated",
        description: "Your text note has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTextNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/text-notes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete note');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/text-notes"] });
      toast({
        title: "Note Deleted",
        description: "Your text note has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getMemberById = (id: number | null) => {
    return familyMembers.find(member => member.id === id);
  };

  // Handle form submissions
  const handleCreateNote = (noteData: { title: string; content: string }) => {
    if (!noteData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title.",
        variant: "destructive",
      });
      return;
    }
    
    createTextNoteMutation.mutate({
      title: noteData.title.trim(),
      content: noteData.content.trim(),
    });
  };

  const handleUpdateNote = (note: TextNote) => {
    if (!note.title.trim() || !note.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and content.",
        variant: "destructive",
      });
      return;
    }
    
    updateTextNoteMutation.mutate({
      id: note.id,
      title: note.title.trim(),
      content: note.content.trim(),
    });
  };

  const handleDeleteNote = (id: number) => {
    if (confirm("Are you sure you want to delete this note?")) {
      deleteTextNoteMutation.mutate(id);
    }
  };

  // Filter and group voice notes
  const groupedVoiceNotes = useMemo(() => {
    const filteredNotes = voiceNotes.filter(note => {
      if (!searchTerm) return true;
      const content = (note.transcription || note.content || "").toLowerCase();
      const member = getMemberById(note.createdBy);
      const memberName = (member?.name || "").toLowerCase();
      return content.includes(searchTerm.toLowerCase()) || memberName.includes(searchTerm.toLowerCase());
    });

    const sortedNotes = [...filteredNotes].sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Group by date
    const groups = new Map<string, VoiceNote[]>();
    
    sortedNotes.forEach(note => {
      if (!note.createdAt) {
        const key = "No Date";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(note);
        return;
      }

      const noteDate = new Date(note.createdAt);
      let key: string;
      
      if (isToday(noteDate)) {
        key = "Today";
      } else if (isYesterday(noteDate)) {
        key = "Yesterday";
      } else {
        key = format(noteDate, "EEEE, MMMM d, yyyy");
      }
      
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(note);
    });

    return Array.from(groups.entries()).map(([date, notes]) => ({ date, notes }));
  }, [voiceNotes, searchTerm, familyMembers]);

  // Filter and group text notes
  const groupedTextNotes = useMemo(() => {
    const filteredNotes = textNotes.filter(note => {
      if (!searchTerm) return true;
      const title = note.title.toLowerCase();
      const content = note.content.toLowerCase();
      const member = getMemberById(note.createdBy);
      const memberName = (member?.name || "").toLowerCase();
      return title.includes(searchTerm.toLowerCase()) || 
             content.includes(searchTerm.toLowerCase()) || 
             memberName.includes(searchTerm.toLowerCase());
    });

    const sortedNotes = [...filteredNotes].sort((a, b) => {
      if (!a.updatedAt && !b.updatedAt) return 0;
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    // Group by date
    const groups = new Map<string, TextNote[]>();
    
    sortedNotes.forEach(note => {
      if (!note.updatedAt) {
        const key = "No Date";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(note);
        return;
      }

      const noteDate = new Date(note.updatedAt);
      let key: string;
      
      if (isToday(noteDate)) {
        key = "Today";
      } else if (isYesterday(noteDate)) {
        key = "Yesterday";
      } else {
        key = format(noteDate, "EEEE, MMMM d, yyyy");
      }
      
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(note);
    });

    return Array.from(groups.entries()).map(([date, notes]) => ({ date, notes }));
  }, [textNotes, searchTerm, familyMembers]);

  const toggleSection = (date: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedSections(newExpanded);
  };

  const VoiceNoteCard = ({ note }: { note: VoiceNote }) => {
    const member = getMemberById(note.createdBy);
    return (
      <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start space-x-3">
          <Quote className="text-primary text-sm mt-1 h-4 w-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              "{note.transcription || note.content}"
            </p>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {note.createdAt && formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {member?.name || 'Unknown'}
                </span>
              </div>
              <Button variant="link" className="text-xs text-primary hover:text-primary/80 p-0 h-auto">
                Create Tasks
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TextNoteCard = ({ note }: { note: TextNote }) => {
    const member = getMemberById(note.createdBy);

    return (
      <div 
        className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setFullScreenEditNote(note)}
      >
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <FileText className="text-primary text-sm mt-1 h-4 w-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                {note.title}
              </h3>
              <RichTextDisplay 
                content={note.content} 
                className="text-sm text-gray-700 dark:text-gray-300"
                truncate={true}
                maxLength={80}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {note.updatedAt && formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {member?.name || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={(e) => {
                  e.stopPropagation();
                  setFullScreenEditNote(note);
                }}
                className="h-7 px-2"
                data-testid="edit-note"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNote(note.id);
                }}
                className="h-7 px-2 text-red-600 hover:text-red-700"
                disabled={deleteTextNoteMutation.isPending}
                data-testid="delete-note"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <Header onStartVoiceNote={() => {}} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Notes</h1>
          <p className="text-gray-600 dark:text-gray-400">Voice notes and text notes for your family</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-notes-input"
            />
          </div>
        </div>

        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Text Notes</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center space-x-2">
              <Mic className="h-4 w-4" />
              <span>Voice Notes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-6">
            <div className="mb-4">
              <Button 
                className="w-full" 
                data-testid="create-text-note"
                onClick={() => setShowFullScreenNewNote(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Text Note
              </Button>
            </div>

            {textNotesLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner variant="mom" size="lg" />
              </div>
            ) : groupedTextNotes.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-300 mb-4 mx-auto" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {searchTerm ? "No text notes found" : "No text notes yet"}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm 
                        ? "Try adjusting your search terms" 
                        : "Create your first text note to get started"
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {groupedTextNotes.map(({ date, notes }: { date: string; notes: TextNote[] }) => (
                  <Card key={date}>
                    <CardHeader className="pb-4">
                      <Collapsible
                        open={expandedSections.has(date)}
                        onOpenChange={() => toggleSection(date)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-between p-0 h-auto hover:bg-transparent"
                            data-testid={`toggle-section-${date}`}
                          >
                            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                              {date} ({notes.length})
                            </CardTitle>
                            {expandedSections.has(date) ? 
                              <ChevronUp className="h-5 w-5 text-gray-500" /> : 
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-4 space-y-4">
                            {notes.map((note: TextNote) => (
                              <TextNoteCard key={note.id} note={note} />
                            ))}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="voice" className="mt-6">
            <Button
              onClick={() => setIsVoiceModalOpen(true)}
              className="w-full mb-6 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Voice Note
            </Button>
            
            {voiceNotesLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner variant="mom" size="lg" />
              </div>
            ) : groupedVoiceNotes.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Mic className="h-12 w-12 text-gray-300 mb-4 mx-auto" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {searchTerm ? "No voice notes found" : "No voice notes yet"}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm 
                        ? "Try adjusting your search terms" 
                        : "Tap the button above to record your first voice note"
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {groupedVoiceNotes.map(({ date, notes }: { date: string; notes: VoiceNote[] }) => (
                  <Card key={date}>
                    <CardHeader className="pb-4">
                      <Collapsible
                        open={expandedSections.has(date)}
                        onOpenChange={() => toggleSection(date)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-between p-0 h-auto hover:bg-transparent"
                            data-testid={`toggle-section-${date}`}
                          >
                            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                              {date} ({notes.length})
                            </CardTitle>
                            {expandedSections.has(date) ? 
                              <ChevronUp className="h-5 w-5 text-gray-500" /> : 
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-4 space-y-4">
                            {notes.map((note: VoiceNote) => (
                              <VoiceNoteCard key={note.id} note={note} />
                            ))}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <MobileNav />
      
      <VoiceNoteModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
      />

      {/* Full Screen Note Editor - Edit Mode */}
      {fullScreenEditNote && (
        <FullScreenNoteEditor
          note={fullScreenEditNote}
          onSave={(noteData) => {
            updateTextNoteMutation.mutate(noteData as { id: number; title: string; content: string });
          }}
          onClose={() => setFullScreenEditNote(null)}
          isSaving={updateTextNoteMutation.isPending}
        />
      )}

      {/* Full Screen Note Editor - Create Mode */}
      {showFullScreenNewNote && (
        <FullScreenNoteEditor
          isNewNote
          onSave={handleCreateNote}
          onClose={() => setShowFullScreenNewNote(false)}
          isSaving={createTextNoteMutation.isPending}
        />
      )}
    </div>
  );
}