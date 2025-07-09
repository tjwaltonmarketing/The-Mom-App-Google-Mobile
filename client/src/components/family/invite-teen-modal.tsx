import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Send, Smartphone, Mail, QrCode, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface InviteTeenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FamilyInvite {
  id: number;
  inviteCode: string;
  invitedContact: string;
  invitedRole: string;
  status: "pending" | "accepted" | "expired";
  expiresAt: string;
  createdAt: string;
}

export function InviteTeenModal({ isOpen, onClose }: InviteTeenModalProps) {
  const [inviteMethod, setInviteMethod] = useState<"phone" | "email">("phone");
  const [contact, setContact] = useState("");
  const [teenName, setTeenName] = useState("");
  const [role, setRole] = useState("teen");
  const [generatedInvite, setGeneratedInvite] = useState<FamilyInvite | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createInviteMutation = useMutation({
    mutationFn: async (inviteData: {
      contact: string;
      contactType: string;
      teenName: string;
      role: string;
    }) => {
      const response = await apiRequest("POST", "/api/family/invites", inviteData);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedInvite(data);
      queryClient.invalidateQueries({ queryKey: ["/api/family/invites"] });
      toast({
        title: "Invitation Created",
        description: `Invite sent to ${contact}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invitation",
        variant: "destructive",
      });
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (inviteId: number) => {
      const response = await apiRequest("POST", `/api/family/invites/${inviteId}/send`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "Your teen will receive the invitation shortly",
      });
    },
  });

  const handleCreateInvite = () => {
    if (!contact || !teenName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createInviteMutation.mutate({
      contact,
      contactType: inviteMethod,
      teenName,
      role,
    });
  };

  const handleCopyInviteCode = () => {
    if (generatedInvite) {
      navigator.clipboard.writeText(generatedInvite.inviteCode);
      toast({
        title: "Copied",
        description: "Invite code copied to clipboard",
      });
    }
  };

  const handleSendInvite = () => {
    if (generatedInvite) {
      sendInviteMutation.mutate(generatedInvite.id);
    }
  };

  const handleClose = () => {
    setContact("");
    setTeenName("");
    setRole("teen");
    setGeneratedInvite(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Teen to Family
          </DialogTitle>
        </DialogHeader>

        {!generatedInvite ? (
          <div className="space-y-6">
            {/* Teen Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="teenName">Teen's Name</Label>
                <Input
                  id="teenName"
                  value={teenName}
                  onChange={(e) => setTeenName(e.target.value)}
                  placeholder="Enter teen's name"
                />
              </div>

              <div>
                <Label>Account Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teen">Teen (Ages 13-17)</SelectItem>
                    <SelectItem value="child">Child (Ages 8-12)</SelectItem>
                    <SelectItem value="young-adult">Young Adult (18+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Method */}
            <div className="space-y-4">
              <Label>How to send invitation</Label>
              <div className="flex gap-2">
                <Button
                  variant={inviteMethod === "phone" ? "default" : "outline"}
                  onClick={() => setInviteMethod("phone")}
                  className="flex items-center gap-2"
                >
                  <Smartphone className="h-4 w-4" />
                  Text Message
                </Button>
                <Button
                  variant={inviteMethod === "email" ? "default" : "outline"}
                  onClick={() => setInviteMethod("email")}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              </div>

              <div>
                <Label htmlFor="contact">
                  {inviteMethod === "phone" ? "Phone Number" : "Email Address"}
                </Label>
                <Input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={
                    inviteMethod === "phone" ? "(555) 123-4567" : "teen@example.com"
                  }
                  type={inviteMethod === "phone" ? "tel" : "email"}
                />
              </div>
            </div>

            {/* Permissions Preview */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Teen Account Permissions</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <div>✓ View assigned tasks and mark complete</div>
                <div>✓ See family calendar events</div>
                <div>✓ Receive push notifications for assignments</div>
                <div>✓ Basic profile management</div>
                <div className="text-blue-600">✗ Cannot assign tasks to others</div>
                <div className="text-blue-600">✗ Cannot access family passwords</div>
              </div>
            </div>

            <Button
              onClick={handleCreateInvite}
              disabled={createInviteMutation.isPending}
              className="w-full"
            >
              {createInviteMutation.isPending ? "Creating Invitation..." : "Create Invitation"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Invitation Created */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Send className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Invitation Created!</h3>
                <p className="text-gray-600">
                  {teenName} can now join your family using this invite code
                </p>
              </div>
            </div>

            {/* Invite Code Display */}
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="space-y-3">
                <QrCode className="h-12 w-12 mx-auto text-gray-600" />
                <div>
                  <Label className="text-sm font-medium">Invite Code</Label>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <code className="bg-white px-3 py-2 rounded border font-mono text-lg">
                      {generatedInvite.inviteCode}
                    </code>
                    <Button variant="outline" size="sm" onClick={handleCopyInviteCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Expires in 7 days • {new Date(generatedInvite.expiresAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Send Options */}
            <div className="space-y-3">
              <Button onClick={handleSendInvite} className="w-full" disabled={sendInviteMutation.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {sendInviteMutation.isPending ? "Sending..." : `Send via ${inviteMethod === "phone" ? "Text" : "Email"}`}
              </Button>
              
              <div className="text-center text-sm text-gray-600">
                Or share the invite code manually: <strong>{generatedInvite.inviteCode}</strong>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Next Steps for {teenName}</h4>
              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                <li>Download "The Mom App" from the app store</li>
                <li>Tap "Join Family" and enter code: <strong>{generatedInvite.inviteCode}</strong></li>
                <li>Create their account and complete setup</li>
                <li>Start receiving task assignments and notifications!</li>
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}