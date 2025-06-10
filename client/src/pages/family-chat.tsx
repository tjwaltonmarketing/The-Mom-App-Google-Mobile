import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Users, MessageCircle, Bell, Calendar, CheckCircle2, Send, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { VoiceNoteModal } from "@/components/voice-note-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FamilyMember, Notification } from "@shared/schema";

export default function FamilyChatPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [newMessage, setNewMessage] = useState({ recipient: "", title: "", message: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Fetch family members
  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  // Fetch family notifications/messages
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { recipient: string; title: string; message: string }) => {
      return apiRequest("POST", "/api/notifications", {
        type: "family_message",
        title: data.title,
        message: data.message,
        recipientId: parseInt(data.recipient),
        deliveryMethod: "in_app"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setNewMessage({ recipient: "", title: "", message: "" });
      setIsMessageModalOpen(false);
      toast({
        title: "Message sent",
        description: "Your message has been delivered to the family member",
      });
    },
    onError: () => {
      toast({
        title: "Failed to send",
        description: "Could not send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.recipient || !newMessage.title || !newMessage.message) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate(newMessage);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getColorForRole = (role: string) => {
    const colors = {
      mom: "bg-pink-500",
      dad: "bg-blue-500", 
      child: "bg-green-500",
      teen: "bg-purple-500",
      other: "bg-gray-500"
    };
    return colors[role as keyof typeof colors] || colors.other;
  };

  // Group notifications by type for better display
  const familyMessages = notifications.filter(n => n.type === "family_message");
  const taskUpdates = notifications.filter(n => n.type === "task_completion" || n.type === "task_assignment");
  const eventReminders = notifications.filter(n => n.type === "event_reminder");

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-primary" size={28} />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white blue-light-filter:text-gray-900">
              Family Hub
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 blue-light-filter:text-gray-700">
            Stay connected with your family
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Communication
                  </div>
                  <Dialog open={isMessageModalOpen} onOpenChange={setIsMessageModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Send Message
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-16 flex flex-col gap-2">
                    <Bell className="h-5 w-5" />
                    <span className="text-sm">Send Reminder</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col gap-2">
                    <Calendar className="h-5 w-5" />
                    <span className="text-sm">Schedule Message</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Family Messages */}
            {familyMessages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Recent Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {familyMessages.slice(0, 5).map((message) => (
                      <div key={message.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {message.recipientId ? `M${message.recipientId}` : 'F'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{message.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {message.createdAt && typeof message.createdAt === 'string' ? new Date(message.createdAt).toLocaleDateString() : 'Today'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{message.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Family Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...taskUpdates, ...eventReminders].slice(0, 8).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className={`h-2 w-2 rounded-full ${
                        activity.type === 'task_completion' ? 'bg-green-500' :
                        activity.type === 'task_assignment' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-gray-600">{activity.message}</p>
                        <p className="text-xs text-gray-400">
                          {activity.createdAt && typeof activity.createdAt === 'string' ? new Date(activity.createdAt).toLocaleString() : 'Recently'}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {[...taskUpdates, ...eventReminders].length === 0 && (
                    <p className="text-gray-500 text-center py-8">No recent family activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Family Members Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Family Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Avatar className={`h-10 w-10 ${getColorForRole(member.role)}`}>
                        <AvatarFallback className="text-white font-medium">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-600 capitalize">{member.role}</p>
                      </div>
                      <div className="h-2 w-2 bg-green-500 rounded-full" title="Online" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Messages Today</span>
                  <Badge variant="secondary">{familyMessages.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Members</span>
                  <Badge variant="secondary">{familyMembers.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending Notifications</span>
                  <Badge variant="secondary">{notifications.filter(n => !n.sentAt).length}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <MobileNav />

      {/* Send Message Modal */}
      <Dialog open={isMessageModalOpen} onOpenChange={setIsMessageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Family Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Send to:</label>
              <Select value={newMessage.recipient} onValueChange={(value) => setNewMessage({...newMessage, recipient: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose family member" />
                </SelectTrigger>
                <SelectContent>
                  {familyMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Subject:</label>
              <Input
                placeholder="Message subject"
                value={newMessage.title}
                onChange={(e) => setNewMessage({...newMessage, title: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Message:</label>
              <Textarea
                placeholder="Type your message here..."
                value={newMessage.message}
                onChange={(e) => setNewMessage({...newMessage, message: e.target.value})}
                rows={4}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsMessageModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending || !newMessage.recipient || !newMessage.title || !newMessage.message}
                className="flex-1 gap-2"
              >
                <Send className="h-4 w-4" />
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <VoiceNoteModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
      />
    </div>
  );
}