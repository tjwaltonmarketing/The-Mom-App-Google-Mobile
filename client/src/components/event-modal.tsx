import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EventForm } from "./event-form";

interface EventModalProps {
  trigger?: React.ReactNode;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedDate?: Date | null;
  onSuccess?: () => void;
}

export function EventModal({ trigger, children, open: externalOpen, onOpenChange, selectedDate, onSuccess }: EventModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const handleSuccess = () => {
    setOpen(false);
    onSuccess?.();
  };

  const dialogContent = (
    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {selectedDate ? `Create Event for ${selectedDate.toLocaleDateString()}` : 'Create New Event'}
        </DialogTitle>
      </DialogHeader>
      <EventForm onSuccess={handleSuccess} selectedDate={selectedDate} />
      {children}
    </DialogContent>
  );

  if (isControlled || !trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <Plus size={16} />
            Add Event
          </Button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}