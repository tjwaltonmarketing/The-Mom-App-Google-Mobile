import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Smartphone, Heart, Clock, Bell, Palette, User, Download, Shield, Users, Mic, Plus, Edit, Trash2, Camera } from "lucide-react";
import { Link } from "wouter";
import { CalendarSync } from "@/components/calendar-sync";
import { ImportExportModal } from "@/components/import-export-modal";
import { useTheme } from "@/components/theme-provider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FamilyMember } from "@shared/schema";

const addFamilyMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  role: z.string().min(1, "Role is required"),
  color: z.string().optional(),
  avatar: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  notificationPreference: z.string().optional(),
});

const editMemberSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  role: z.string().min(1, "Role is required"),
  color: z.string().optional(),
  avatar: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  notificationPreference: z.string().optional(),
});

type AddFamilyMemberForm = z.infer<typeof addFamilyMemberSchema>;
type EditMemberForm = z.infer<typeof editMemberSchema>;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mindfulUsageEnabled, setMindfulUsageEnabled] = useState(true);
  const [reminderInterval, setReminderInterval] = useState("20");
  const [breakDuration, setBreakDuration] = useState([5]);
  const [dailyLimit, setDailyLimit] = useState([120]);
  const [notifications, setNotifications] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<"tasks" | "notes" | "passwords" | "events">("tasks");
  const [activeTab, setActiveTab] = useState("general");
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showEditMemberDialog, setShowEditMemberDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  // Fetch existing family members
  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  // Form for adding family member
  const form = useForm<AddFamilyMemberForm>({
    resolver: zodResolver(addFamilyMemberSchema),
    defaultValues: {
      name: "",
      role: "",
      color: "#3b82f6",
      avatar: "",
      phone: "",
      email: "",
      notificationPreference: "sms",
    },
  });

  // Form for editing family member
  const editForm = useForm<EditMemberForm>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      id: 0,
      name: "",
      role: "",
      color: "#3b82f6",
      avatar: "",
      phone: "",
      email: "",
      notificationPreference: "sms",
    },
  });

  // Mutation for adding family member
  const addMemberMutation = useMutation({
    mutationFn: async (data: AddFamilyMemberForm) => {
      return apiRequest("POST", "/api/family-members", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-members"] });
      toast({
        title: "Success",
        description: "Family member added successfully!",
      });
      setShowAddMemberDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add family member",
        variant: "destructive",
      });
    },
  });

  // Mutation for editing family member
  const editMemberMutation = useMutation({
    mutationFn: async (data: EditMemberForm) => {
      return apiRequest("PATCH", `/api/family-members/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-members"] });
      toast({
        title: "Success",
        description: "Family member updated successfully!",
      });
      setShowEditMemberDialog(false);
      setSelectedMember(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update family member",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting family member
  const deleteMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/family-members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-members"] });
      toast({
        title: "Success",
        description: "Family member removed successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove family member",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'family') {
      setActiveTab('family');
    }
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('mindfulUsageSettings', JSON.stringify({
      enabled: mindfulUsageEnabled,
      reminderInterval: parseInt(reminderInterval),
      breakDuration: breakDuration[0],
      dailyLimit: dailyLimit[0],
      notifications
    }));
    // Theme is automatically saved by the theme provider
    alert('Settings saved successfully!');
  };

  const handleAddFamilyMember = () => {
    setShowAddMemberDialog(true);
  };

  const handleEditMemberRoles = () => {
    setShowEditMemberDialog(true);
  };

  const handleManagePermissions = () => {
    setShowPermissionsDialog(true);
  };

  const handleEditMember = (member: FamilyMember) => {
    setSelectedMember(member);
    editForm.reset({
      id: member.id,
      name: member.name,
      role: member.role,
      color: member.color || "#3b82f6",
      avatar: member.avatar || "",
      phone: member.phone || "",
      email: member.email || "",
      notificationPreference: member.notificationPreference || "sms",
    });
    setShowEditMemberDialog(true);
  };

  const handleDeleteMember = (id: number, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from your family?`)) {
      deleteMemberMutation.mutate(id);
    }
  };

  const onSubmitAddMember = (data: AddFamilyMemberForm) => {
    addMemberMutation.mutate(data);
  };

  const onSubmitEditMember = (data: EditMemberForm) => {
    editMemberMutation.mutate(data);
  };

  const handleProfileSettings = () => {
    setShowProfileDialog(true);
  };

  const handlePrivacySettings = () => {
    setShowPrivacyDialog(true);
  };

  const handleSecuritySettings = () => {
    toast({
      title: "Security Settings",
      description: "Security settings feature coming soon! This will allow you to manage passwords, two-factor authentication, and security preferences.",
    });
  };

  const handleDownloadData = async () => {
    try {
      // Generate family data export
      const exportData = {
        familyMembers,
        exportDate: new Date().toISOString(),
        version: "1.0"
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `family-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Data Export Complete",
        description: "Your family data has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your family's data.")) {
      toast({
        title: "Account Deletion",
        description: "Account deletion feature coming soon! Please contact support if you need immediate assistance.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onStartVoiceNote={() => {}} />
      
      <main className="max-w-4xl mx-auto px-4 py-6 mb-20 md:mb-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Customize your family coordination experience</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="family">Family</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">


            <CalendarSync />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Mindful Usage
                </CardTitle>
                <CardDescription>
                  Gentle reminders to take breaks and maintain healthy app usage habits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="mindful-usage">Enable mindful usage reminders</Label>
                  <Switch
                    id="mindful-usage"
                    checked={mindfulUsageEnabled}
                    onCheckedChange={setMindfulUsageEnabled}
                  />
                </div>

                {mindfulUsageEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label>Reminder interval</Label>
                      <Select value={reminderInterval} onValueChange={setReminderInterval}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">Every 10 minutes</SelectItem>
                          <SelectItem value="15">Every 15 minutes</SelectItem>
                          <SelectItem value="20">Every 20 minutes</SelectItem>
                          <SelectItem value="30">Every 30 minutes</SelectItem>
                          <SelectItem value="45">Every 45 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Suggested break duration: {breakDuration[0]} minutes</Label>
                      <Slider
                        value={breakDuration}
                        onValueChange={setBreakDuration}
                        max={15}
                        min={2}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Daily usage goal: {dailyLimit[0]} minutes</Label>
                      <Slider
                        value={dailyLimit}
                        onValueChange={setDailyLimit}
                        max={300}
                        min={30}
                        step={15}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Manage your notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications">Push notifications</Label>
                  <Switch
                    id="notifications"
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize how the app looks and feels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div 
                    className={`text-center p-3 border rounded-lg cursor-pointer hover:border-primary ${
                      theme === "light" ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setTheme("light")}
                  >
                    <div className="w-full h-8 bg-white border rounded mb-2"></div>
                    <span className="text-sm">Light</span>
                  </div>
                  <div 
                    className={`text-center p-3 border rounded-lg cursor-pointer hover:border-primary ${
                      theme === "dark" ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setTheme("dark")}
                  >
                    <div className="w-full h-8 bg-gray-900 rounded mb-2"></div>
                    <span className="text-sm">Dark</span>
                  </div>
                  <div 
                    className={`text-center p-3 border rounded-lg cursor-pointer hover:border-primary ${
                      theme === "blue-light-filter" ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setTheme("blue-light-filter")}
                  >
                    <div className="w-full h-8 bg-gradient-to-r from-orange-100 to-yellow-100 rounded mb-2"></div>
                    <span className="text-sm">Blue Light</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSaveSettings} className="w-full">
              Save Settings
            </Button>
          </TabsContent>

          <TabsContent value="family" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Family Members
                </CardTitle>
                <CardDescription>
                  Manage your family member profiles and permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Family Members */}
                {familyMembers.length > 0 && (
                  <div className="space-y-2 mb-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm">Current Family Members:</h4>
                    <div className="grid gap-3">
                      {familyMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full text-white font-medium text-sm" 
                                 style={{ backgroundColor: member.color || '#3b82f6' }}>
                              {member.avatar || member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{member.name}</div>
                              <div className="text-xs text-muted-foreground capitalize">{member.role}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditMember(member)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMember(member.id, member.name)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button variant="outline" className="w-full justify-start" onClick={handleAddFamilyMember}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Family Member
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleEditMemberRoles}>
                  Edit Member Roles
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleManagePermissions}>
                  Manage Permissions
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Data Management
                </CardTitle>
                <CardDescription>
                  Import and export your family's data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    setImportType("tasks");
                    setShowImportModal(true);
                  }}
                >
                  Import/Export Tasks
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    setImportType("notes");
                    setShowImportModal(true);
                  }}
                >
                  Import/Export Notes
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    setImportType("passwords");
                    setShowImportModal(true);
                  }}
                >
                  Import/Export Passwords
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Account Settings
                </CardTitle>
                <CardDescription>
                  Manage your account preferences and privacy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start" onClick={handleProfileSettings}>
                  Profile Settings
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handlePrivacySettings}>
                  Privacy Settings
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleSecuritySettings}>
                  Security Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Data & Privacy
                </CardTitle>
                <CardDescription>
                  Control your data and privacy preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start" onClick={handleDownloadData}>
                  Download My Data
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleDeleteAccount}>
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ImportExportModal 
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          type={importType}
        />

        {/* Add Family Member Dialog */}
        <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Add Family Member
              </DialogTitle>
              <DialogDescription>
                Add a new family member to your coordination system.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitAddMember)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter family member's name" {...field} />
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
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mom">Mom</SelectItem>
                            <SelectItem value="dad">Dad</SelectItem>
                            <SelectItem value="child">Child</SelectItem>
                            <SelectItem value="teen">Teen</SelectItem>
                            <SelectItem value="grandparent">Grandparent</SelectItem>
                            <SelectItem value="caregiver">Caregiver</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter email address" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notificationPreference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notification Preference</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select preference" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color (Optional)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="color" 
                            {...field} 
                            className="w-16 h-10 rounded border cursor-pointer"
                          />
                          <Input 
                            placeholder="#3b82f6" 
                            {...field}
                            className="flex-1"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddMemberDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addMemberMutation.isPending}>
                    {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Family Member Dialog */}
        <Dialog open={showEditMemberDialog} onOpenChange={setShowEditMemberDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                Edit Family Member
              </DialogTitle>
              <DialogDescription>
                Update family member information and preferences.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onSubmitEditMember)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter family member's name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mom">Mom</SelectItem>
                            <SelectItem value="dad">Dad</SelectItem>
                            <SelectItem value="child">Child</SelectItem>
                            <SelectItem value="teen">Teen</SelectItem>
                            <SelectItem value="grandparent">Grandparent</SelectItem>
                            <SelectItem value="caregiver">Caregiver</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter email address" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="notificationPreference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notification Preference</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select preference" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="color" 
                            {...field} 
                            className="w-16 h-10 rounded border cursor-pointer"
                          />
                          <Input 
                            placeholder="#3b82f6" 
                            {...field}
                            className="flex-1"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditMemberDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editMemberMutation.isPending}>
                    {editMemberMutation.isPending ? "Updating..." : "Update Member"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Manage Permissions Dialog */}
        <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Manage Permissions
              </DialogTitle>
              <DialogDescription>
                Control what each family member can access and modify.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {familyMembers.map((member) => (
                <div key={member.id} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full text-white font-medium text-sm" 
                         style={{ backgroundColor: member.color || '#3b82f6' }}>
                      {member.avatar || member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground capitalize">{member.role}</div>
                    </div>
                  </div>
                  <div className="ml-11 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Can create tasks</Label>
                      <Switch defaultChecked={member.role !== 'child'} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Can edit events</Label>
                      <Switch defaultChecked={member.role !== 'child'} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Can manage grocery lists</Label>
                      <Switch defaultChecked={true} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Can view passwords</Label>
                      <Switch defaultChecked={member.role === 'mom' || member.role === 'dad'} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Receives notifications</Label>
                      <Switch defaultChecked={member.notificationPreference !== 'none'} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPermissionsDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => {
                toast({
                  title: "Success",
                  description: "Permissions updated successfully!",
                });
                setShowPermissionsDialog(false);
              }}>
                Save Permissions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Profile Settings Dialog */}
        <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Profile Settings
              </DialogTitle>
              <DialogDescription>
                Manage your personal information and app preferences.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Display Name</Label>
                  <Input defaultValue="Mom" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium">App Theme</Label>
                  <Select defaultValue={theme}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Time Format</Label>
                  <Select defaultValue="12h">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowProfileDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => {
                toast({
                  title: "Profile Updated",
                  description: "Your profile settings have been saved successfully.",
                });
                setShowProfileDialog(false);
              }}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Privacy Settings Dialog */}
        <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Privacy Settings
              </DialogTitle>
              <DialogDescription>
                Control your privacy and data sharing preferences.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Share Activity Status</Label>
                    <p className="text-xs text-muted-foreground">Let family members see when you're active</p>
                  </div>
                  <Switch defaultChecked={true} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Location Sharing</Label>
                    <p className="text-xs text-muted-foreground">Share your location for family coordination</p>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Usage Analytics</Label>
                    <p className="text-xs text-muted-foreground">Help improve the app by sharing usage data</p>
                  </div>
                  <Switch defaultChecked={true} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Marketing Communications</Label>
                    <p className="text-xs text-muted-foreground">Receive updates about new features</p>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Data Backup to Cloud</Label>
                    <p className="text-xs text-muted-foreground">Automatically backup your family data</p>
                  </div>
                  <Switch defaultChecked={true} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPrivacyDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => {
                toast({
                  title: "Privacy Settings Updated",
                  description: "Your privacy preferences have been saved successfully.",
                });
                setShowPrivacyDialog(false);
              }}>
                Save Preferences
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <MobileNav />
    </div>
  );
}