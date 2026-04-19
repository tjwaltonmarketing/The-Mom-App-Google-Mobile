import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Save, CheckCircle, CloudOff, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { TextNote } from "@shared/schema";

const NEW_NOTE_DRAFT_KEY = "mom_app_new_note_draft";

interface FullScreenNoteEditorProps {
  note?: TextNote | null;
  onSave: (note: { id?: number; title: string; content: string }) => void;
  onClose: () => void;
  isSaving?: boolean;
  isNewNote?: boolean;
}

export function FullScreenNoteEditor({ 
  note, 
  onSave, 
  onClose,
  isSaving = false,
  isNewNote = false
}: FullScreenNoteEditorProps) {
  const savedRef = useRef(false);
  const draftSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Restore draft from localStorage for new notes
  const getInitialTitle = () => {
    if (isNewNote) {
      try {
        const draft = localStorage.getItem(NEW_NOTE_DRAFT_KEY);
        if (draft) return JSON.parse(draft).title || "";
      } catch {}
    }
    return note?.title || "";
  };

  const getInitialContent = () => {
    if (isNewNote) {
      try {
        const draft = localStorage.getItem(NEW_NOTE_DRAFT_KEY);
        if (draft) return JSON.parse(draft).content || "";
      } catch {}
    }
    return note?.content || "";
  };

  const [title, setTitle] = useState(getInitialTitle);
  const [content, setContent] = useState(getInitialContent);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we restored a draft on mount
  useEffect(() => {
    if (isNewNote) {
      try {
        const draft = localStorage.getItem(NEW_NOTE_DRAFT_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);
          if (parsed.title || parsed.content) setDraftRestored(true);
        }
      } catch {}
    }
  }, []);

  // Track changes
  useEffect(() => {
    if (isNewNote) {
      setHasChanges(title.trim().length > 0 || content.trim().length > 0);
    } else if (note) {
      setHasChanges(title !== note.title || content !== note.content);
    }
  }, [title, content, note, isNewNote]);

  // Save draft to localStorage for new notes (debounced 1s)
  useEffect(() => {
    if (!isNewNote) return;

    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);

    draftSaveTimerRef.current = setTimeout(() => {
      try {
        if (title.trim() || content.trim()) {
          localStorage.setItem(NEW_NOTE_DRAFT_KEY, JSON.stringify({ title, content }));
          setDraftSavedAt(new Date());
        } else {
          localStorage.removeItem(NEW_NOTE_DRAFT_KEY);
          setDraftSavedAt(null);
        }
      } catch {}
    }, 1000);

    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [title, content, isNewNote]);

  // Clear draft from localStorage when component unmounts after a successful save
  useEffect(() => {
    return () => {
      if (isNewNote && savedRef.current) {
        localStorage.removeItem(NEW_NOTE_DRAFT_KEY);
      }
    };
  }, [isNewNote]);

  // Auto-save function (only for existing notes)
  const doAutoSave = useCallback(() => {
    if (!isNewNote && note && title.trim()) {
      onSave({ id: note.id, title, content });
      setLastSaved(new Date());
      setHasChanges(false);
    }
  }, [note, title, content, onSave, isNewNote]);

  // Trigger auto-save after 2 seconds of inactivity (only for existing notes)
  useEffect(() => {
    if (!isNewNote && hasChanges && title.trim()) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(doAutoSave, 2000);
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, content, hasChanges, doAutoSave, isNewNote]);

  // Save before closing (for existing notes)
  const handleClose = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (!isNewNote && hasChanges && title.trim() && note) {
      onSave({ id: note.id, title, content });
    }
    onClose();
  };

  // Manual save / Create
  const handleSave = () => {
    if (!title.trim()) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    if (isNewNote) {
      savedRef.current = true;
      // Also clear draft immediately on save attempt
      try { localStorage.removeItem(NEW_NOTE_DRAFT_KEY); } catch {}
      onSave({ title, content });
    } else if (note) {
      onSave({ id: note.id, title, content });
      setLastSaved(new Date());
      setHasChanges(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
      <div className="bg-white dark:bg-gray-900" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClose}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </Button>
        
        <div className="flex items-center gap-3">
          {/* New note: draft saved / restored indicators */}
          {isNewNote && draftSavedAt && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Cloud className="h-3 w-3" />
              <span>Draft saved</span>
            </div>
          )}
          {isNewNote && draftRestored && !draftSavedAt && (
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <CloudOff className="h-3 w-3" />
              <span>Draft restored</span>
            </div>
          )}
          {/* Existing note: saved / saving indicators */}
          {!isNewNote && lastSaved && !hasChanges && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle className="h-3 w-3" />
              <span>Saved</span>
            </div>
          )}
          {!isNewNote && hasChanges && !isSaving && (
            <span className="text-xs text-gray-500 dark:text-gray-400">Unsaved changes</span>
          )}
          {isSaving && (
            <span className="text-xs text-gray-500 dark:text-gray-400">Saving...</span>
          )}
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isNewNote ? "Create Note" : "Save"}
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="text-xl font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent"
            autoFocus={isNewNote && !draftRestored}
          />
          
          <div className="min-h-[60vh]">
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing your note..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
