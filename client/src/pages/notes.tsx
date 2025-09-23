import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mic, Quote, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { VoiceNote, FamilyMember } from "@shared/schema";
import { formatDistanceToNow, format, isToday, isYesterday, startOfDay } from "date-fns";

export default function Notes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { data: allNotes = [], isLoading: notesLoading } = useQuery<VoiceNote[]>({
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

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const getMemberById = (id: number | null) => {
    return familyMembers.find(member => member.id === id);
  };

  // Filter and group notes
  const groupedNotes = useMemo(() => {
    const filteredNotes = allNotes.filter(note => {
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
  }, [allNotes, searchTerm, familyMembers]);

  const toggleSection = (date: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedSections(newExpanded);
  };

  const NoteCard = ({ note }: { note: VoiceNote }) => {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <Header onStartVoiceNote={() => {}} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Voice Notes</h1>
          <p className="text-gray-600 dark:text-gray-400">All your family's voice notes and brain dumps</p>
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

        {notesLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner variant="mom" size="lg" />
          </div>
        ) : groupedNotes.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Mic className="h-12 w-12 text-gray-300 mb-4 mx-auto" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm ? "No notes found" : "No voice notes yet"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm 
                    ? "Try adjusting your search terms" 
                    : "Start recording voice notes from the dashboard to see them here"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedNotes.map(({ date, notes }) => (
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
                        {notes.map((note) => (
                          <NoteCard key={note.id} note={note} />
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}