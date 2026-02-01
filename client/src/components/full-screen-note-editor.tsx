import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { TextNote } from "@shared/schema";

interface FullScreenNoteEditorProps {
  note: TextNote;
  onSave: (note: { id: number; title: string; content: string }) => void;
  onClose: () => void;
  isSaving?: boolean;
}

export function FullScreenNoteEditor({ 
  note, 
  onSave, 
  onClose,
  isSaving = false 
}: FullScreenNoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track changes
  useEffect(() => {
    const titleChanged = title !== note.title;
    const contentChanged = content !== note.content;
    setHasChanges(titleChanged || contentChanged);
  }, [title, content, note.title, note.content]);

  // Auto-save function
  const doAutoSave = useCallback(() => {
    if (title.trim()) {
      onSave({ id: note.id, title, content });
      setLastSaved(new Date());
      setHasChanges(false);
    }
  }, [note.id, title, content, onSave]);

  // Trigger auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (hasChanges && title.trim()) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // Set new timer
      autoSaveTimerRef.current = setTimeout(() => {
        doAutoSave();
      }, 2000);
    }

    // Cleanup on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content, hasChanges, doAutoSave]);

  // Save before closing
  const handleClose = () => {
    // Clear any pending auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Save if there are changes
    if (hasChanges && title.trim()) {
      onSave({ id: note.id, title, content });
    }
    onClose();
  };

  // Manual save
  const handleManualSave = () => {
    if (title.trim()) {
      // Clear any pending auto-save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      onSave({ id: note.id, title, content });
      setLastSaved(new Date());
      setHasChanges(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
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
          {lastSaved && !hasChanges && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle className="h-3 w-3" />
              <span>Saved</span>
            </div>
          )}
          {hasChanges && !isSaving && (
            <span className="text-xs text-gray-500 dark:text-gray-400">Unsaved changes</span>
          )}
          {isSaving && (
            <span className="text-xs text-gray-500 dark:text-gray-400">Saving...</span>
          )}
          <Button 
            size="sm" 
            onClick={handleManualSave}
            disabled={!hasChanges || isSaving || !title.trim()}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save
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
