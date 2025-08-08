import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Users, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Password, FamilyMember } from "@shared/schema";

interface PasswordEditModalProps {
  password: Password;
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordEditModal({ password, isOpen, onClose }: PasswordEditModalProps) {
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  // Initialize selected members based on password's shared_with array
  useEffect(() => {
    if (password && password.sharedWith) {
      try {
        const parsed = typeof password.sharedWith === 'string' 
          ? JSON.parse(password.sharedWith) 
          : password.sharedWith;
        setSelectedMembers(new Set(parsed.map((id: any) => Number(id))));
      } catch {
        setSelectedMembers(new Set());
      }
    }
  }, [password]);

  const updateSharingMutation = useMutation({
    mutationFn: async (sharedWith: number[]) => {
      return apiRequest("PATCH", `/api/passwords/${password.id}/sharing`, { 
        shared_with: sharedWith 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/passwords"] });
      toast({
        title: "Sharing updated",
        description: "Password sharing permissions have been updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating sharing",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleToggleMember = (memberId: number) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleSave = () => {
    updateSharingMutation.mutate(Array.from(selectedMembers));
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'mom':
        return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'dad':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'teen':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'child':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Edit Password Sharing
          </DialogTitle>
          <DialogDescription>
            Choose which family members can access "{password.title}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="font-medium text-sm mb-2">Password Details</h3>
            <div className="text-sm text-gray-600">
              <div><strong>Title:</strong> {password.title}</div>
              <div><strong>Category:</strong> {password.category}</div>
              {password.website && <div><strong>Website:</strong> {password.website}</div>}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Family Members</Label>
            
            {familyMembers.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No family members found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {familyMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={selectedMembers.has(member.id)}
                      onCheckedChange={() => handleToggleMember(member.id)}
                    />
                    
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.avatar}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`member-${member.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {member.name}
                          </Label>
                          <span className={`px-2 py-1 text-xs rounded border ${getRoleColor(member.role)}`}>
                            {member.role}
                          </span>
                        </div>
                      </div>
                      
                      {selectedMembers.has(member.id) && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-xs text-gray-500 mt-2">
              Selected members will be able to view this password in their password vault.
            </div>
          </div>

          <Separator />

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateSharingMutation.isPending}
              className="flex-1"
            >
              {updateSharingMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}