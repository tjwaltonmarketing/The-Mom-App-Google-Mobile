import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Phone, UserPlus, Copy } from "lucide-react";

const parentInviteSchema = z.object({
  phone: z.string().min(10, "Please enter a valid phone number"),
  role: z.enum(["mom", "dad", "parent"], {
    required_error: "Please select a parent role",
  }),
});

type ParentInviteForm = z.infer<typeof parentInviteSchema>;

interface ParentInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ParentInviteModal({ isOpen, onClose }: ParentInviteModalProps) {
  const [inviteResult, setInviteResult] = useState<{
    inviteCode: string;
    phone: string;
    role: string;
    smsSent: boolean;
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ParentInviteForm>({
    resolver: zodResolver(parentInviteSchema),
    defaultValues: {
      phone: "",
      role: "parent",
    },
  });

  const inviteParentMutation = useMutation({
    mutationFn: async (data: ParentInviteForm) => {
      const response = await apiRequest("POST", "/api/family/invite-parent", data);
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Invite response:", data);
      setInviteResult({
        inviteCode: data.inviteCode,
        phone: data.invitedPhone,
        role: data.role,
        smsSent: data.smsSent,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/family-members"] });
      toast({
        title: data.smsSent ? "Invitation Sent" : "Invite Created",
        description: data.smsSent 
          ? `Text message sent to ${data.invitedPhone}` 
          : `Invite code created. Share it with the parent.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send parent invitation",
        variant: "destructive",
      });
    },
  });

  const copyInviteCode = () => {
    if (inviteResult?.inviteCode) {
      navigator.clipboard.writeText(inviteResult.inviteCode);
      toast({
        title: "Copied",
        description: "Invite code copied to clipboard",
      });
    }
  };

  const handleClose = () => {
    setInviteResult(null);
    form.reset();
    onClose();
  };

  const onSubmit = (data: ParentInviteForm) => {
    inviteParentMutation.mutate(data);
  };

  // Handle mobile keyboard visibility
  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target && target.tagName === 'INPUT') {
        // Small delay to ensure keyboard is shown
        setTimeout(() => {
          target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }, 300);
      }
    };

    const handleBlur = () => {
      // Reset viewport when keyboard closes
      setTimeout(() => {
        if (window.innerHeight < window.outerHeight * 0.75) {
          // Keyboard might still be open, don't scroll yet
          return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    };

    if (isOpen) {
      document.addEventListener('focusin', handleFocus);
      document.addEventListener('focusout', handleBlur);
    }

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Parent to Family
          </DialogTitle>
          <DialogDescription>
            Send an invitation to another parent to join your family coordination.
          </DialogDescription>
        </DialogHeader>

        {!inviteResult ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent's Phone Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="+1 (555) 123-4567"
                          type="tel"
                          className="pl-10"
                          {...field}
                          onFocus={(e) => {
                            // Ensure input is visible on mobile
                            setTimeout(() => {
                              e.target.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'center' 
                              });
                            }, 100);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mom">Mom</SelectItem>
                        <SelectItem value="dad">Dad</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={inviteParentMutation.isPending}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  {inviteParentMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {inviteResult.smsSent ? "Invitation Sent!" : "Invite Created!"}
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                {inviteResult.smsSent 
                  ? `Text message sent to ${inviteResult.phone}`
                  : "Share the invite code below with the parent"}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-700">
                Invite Code (share this with the parent):
              </label>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border font-mono text-lg tracking-wider">
                  {inviteResult.inviteCode}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyInviteCode}
                  className="flex items-center gap-1"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p className="font-medium">Next steps:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Share the invite code with the parent</li>
                <li>They can create an account or log in if they have one</li>
                <li>They'll be automatically added to your family</li>
                <li>You'll both have access to shared family coordination</li>
              </ol>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}