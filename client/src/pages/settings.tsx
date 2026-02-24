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
import { Badge } from "@/components/ui/badge";
import { Smartphone, Heart, Clock, Bell, Palette, User, Download, Shield, Users, Mic, Plus, Edit, Trash2, Camera, Lock, UserPlus, Star, Mail, KeyRound, CheckSquare, Crown, Check, MessageSquare, Send, Lightbulb, Bug } from "lucide-react";
import { Link } from "wouter";
// import { CalendarSync } from "@/components/calendar-sync"; // Disabled until Google OAuth verification
import { ImportExportModal } from "@/components/import-export-modal";
import { useTheme } from "@/components/theme-provider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, authFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FamilyMember } from "@shared/schema";
import { InviteTeenModal } from "@/components/family/invite-teen-modal";
import { ParentInviteModal } from "@/components/parent-invite-modal";
import { KidPointManager } from "@/components/family/kid-point-manager";
import { useSubscription } from "@/hooks/use-subscription";
import { Capacitor } from "@capacitor/core";
import { getUserTimezone, getDeviceTimezone, setSavedTimezone, COMMON_TIMEZONES } from "@/lib/timezone";
import { checkPushPermissionStatus, requestAndRegisterPush, openNotificationSettings } from "@/services/push-notifications";

function PushNotificationSetting() {
  const [status, setStatus] = useState<"loading" | "granted" | "denied" | "prompt" | "not-native">("loading");
  const [enabling, setEnabling] = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setStatus("not-native");
      return;
    }
    checkPushPermissionStatus().then(setStatus).catch(() => setStatus("denied"));
    fetch("/api/admin/check", { credentials: "include" })
      .then(r => setIsAdmin(r.ok))
      .catch(() => setIsAdmin(false));
  }, []);

  if (status === "not-native" || status === "loading") return null;

  const handleEnable = async () => {
    setEnabling(true);
    const success = await requestAndRegisterPush();
    if (success) {
      setStatus("granted");
    } else {
      setStatus("denied");
    }
    setEnabling(false);
  };

  const handleTestPush = async () => {
    setTestingSend(true);
    setTestResult(null);
    try {
      const res = await authFetch("/api/push-notifications/test", { method: "POST" });
      const data = await res.json();
      setTestResult(data.message);
      toast({
        title: data.success ? "Test Sent" : "No Devices Found",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    } catch (e) {
      setTestResult("Failed to send test notification");
      toast({ title: "Error", description: "Failed to send test notification", variant: "destructive" });
    }
    setTestingSend(false);
  };

  return (
    <div className="pt-2 border-t">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Device Push Notifications</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {status === "granted"
              ? "Notifications are enabled on this device"
              : "Notifications are turned off on this device"}
          </p>
        </div>
        {status === "granted" ? (
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20">
            <Check className="h-3 w-3 mr-1" /> On
          </Badge>
        ) : status === "prompt" ? (
          <Button size="sm" variant="outline" onClick={handleEnable} disabled={enabling}>
            {enabling ? "Enabling…" : "Enable"}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => openNotificationSettings()}>
            Open Settings
          </Button>
        )}
      </div>
      {status === "granted" && isAdmin && (
        <div className="mt-2">
          <Button size="sm" variant="outline" onClick={handleTestPush} disabled={testingSend} className="w-full">
            {testingSend ? "Sending…" : "Send Test Notification"}
          </Button>
          {testResult && (
            <p className="text-xs text-muted-foreground mt-1">{testResult}</p>
          )}
        </div>
      )}
    </div>
  );
}

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

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters long"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AddFamilyMemberForm = z.infer<typeof addFamilyMemberSchema>;
type EditMemberForm = z.infer<typeof editMemberSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isIndividualPlan, canAddFamilyMembers, canAccessPasswordVault } = useSubscription();
  // Load mindful usage settings from localStorage
  const loadMindfulSettings = () => {
    const saved = localStorage.getItem('mindfulUsageSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };
  
  const savedSettings = loadMindfulSettings();
  const [mindfulUsageEnabled, setMindfulUsageEnabled] = useState(savedSettings?.enabled ?? true);
  const [reminderInterval, setReminderInterval] = useState(savedSettings?.reminderInterval?.toString() ?? "20");
  const [breakDuration, setBreakDuration] = useState([savedSettings?.breakDuration ?? 5]);
  const [dailyLimit, setDailyLimit] = useState([savedSettings?.dailyLimit ?? 120]);
  const [notifications, setNotifications] = useState(savedSettings?.notifications ?? true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<"tasks" | "notes" | "passwords" | "events">("tasks");
  const [activeTab, setActiveTab] = useState("general");
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showEditMemberDialog, setShowEditMemberDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [showInviteTeenModal, setShowInviteTeenModal] = useState(false);
  const [showParentInviteModal, setShowParentInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedTeenForReset, setSelectedTeenForReset] = useState<{id: number, name: string, username?: string} | null>(null);
  
  // Profile settings state
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");

  // Security settings state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Privacy settings state
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [usageAnalytics, setUsageAnalytics] = useState(true);

  // Notification preferences state
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationMethod, setNotificationMethod] = useState<"in_app" | "sms" | "both">("both");
  const [taskReminders, setTaskReminders] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [dailyDigestTime, setDailyDigestTime] = useState("09:00");
  const [selectedTimezone, setSelectedTimezone] = useState(getUserTimezone());
  const [taskReminderOnAssign, setTaskReminderOnAssign] = useState(true);
  const [taskReminderBeforeDue, setTaskReminderBeforeDue] = useState("2h");
  const [taskOverdueReminder, setTaskOverdueReminder] = useState(true);
  const [taskOverdueRepeatInterval, setTaskOverdueRepeatInterval] = useState("4h");
  const [eventReminder1, setEventReminder1] = useState("1d");
  const [eventReminder2, setEventReminder2] = useState("1h");
  const [eventReminder3, setEventReminder3] = useState("15m");

  // Feedback form state
  const [feedbackType, setFeedbackType] = useState<"feedback" | "feature_request" | "bug_report">("feedback");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // Fetch current user data
  const { data: userData } = useQuery<{ id: number; email: string; firstName: string; lastName: string }>({
    queryKey: ["/api/auth/user"],
  });

  // Update profile state when user data loads
  useEffect(() => {
    if (userData) {
      setProfileFirstName(userData.firstName || "");
      setProfileLastName(userData.lastName || "");
    }
  }, [userData]);

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const response = await apiRequest("PUT", "/api/auth/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/family-members"] });
      toast({
        title: "Profile Updated",
        description: "Your profile settings have been saved successfully.",
      });
      setShowProfileDialog(false);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch existing family members
  const { data: familyMembers = [], isLoading: isFamilyMembersLoading, error: familyMembersError } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
    retry: 1,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const response = await authFetch('/api/family-members');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }
  });


  // Fetch family info (for family name)
  const { data: familyInfo } = useQuery<{ id: number; name: string }>({
    queryKey: ["/api/family"],
  });
  
  const [familyName, setFamilyName] = useState("");
  const [isEditingFamilyName, setIsEditingFamilyName] = useState(false);

  // Update local state when family info loads
  useEffect(() => {
    if (familyInfo?.name) {
      setFamilyName(familyInfo.name);
    }
  }, [familyInfo]);

  // Mutation to update family name
  const updateFamilyNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("PATCH", "/api/family", { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      toast({ title: "Family name updated!" });
      setIsEditingFamilyName(false);
    },
    onError: () => {
      toast({ title: "Failed to update family name", variant: "destructive" });
    }
  });

  // Fetch trial status
  const { data: trialStatus } = useQuery<any>({
    queryKey: ["/api/trial/status"],
  });

  // Fetch subscription data for Plans tab
  const { data: subscriptionData } = useQuery<any>({
    queryKey: ["/api/subscription"],
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

  // Form for password reset
  const resetPasswordForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
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

  // Mutation for resetting teen password
  const resetTeenPasswordMutation = useMutation({
    mutationFn: async ({ teenId, newPassword }: { teenId: number; newPassword: string }) => {
      return apiRequest("POST", `/api/family-members/${teenId}/reset-password`, { newPassword });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Password Reset Successfully",
        description: data.message || "Teen's password has been reset successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/family-members"] });
      setShowResetPasswordDialog(false);
      resetPasswordForm.reset();
      setSelectedTeenForReset(null);
    },
    onError: (error: any) => {
      toast({
        title: "Password Reset Failed",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async (data: { type: string; subject: string; message: string }) => {
      const response = await apiRequest("POST", "/api/feedback", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Feedback Submitted",
        description: data.message || "Thank you for your feedback!",
      });
      setFeedbackType("feedback");
      setFeedbackSubject("");
      setFeedbackMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("PUT", "/api/auth/password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowSecurityDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password. Please check your current password.",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (confirmText: string) => {
      const response = await apiRequest("DELETE", "/api/auth/account", { confirmText });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  // User preferences query (includes privacy and notification settings)
  const { data: userPrefs } = useQuery<{ 
    marketingEmails: boolean; 
    usageAnalytics: boolean;
    notificationMethod: "in_app" | "sms" | "both";
    taskReminders: boolean;
    eventReminders: boolean;
    dailyDigest: boolean;
    dailyDigestTime: string;
    timezone: string | null;
    taskReminderOnAssign: boolean;
    taskReminderBeforeDue: string;
    taskOverdueReminder: boolean;
    taskOverdueRepeatInterval: string;
    eventReminder1: string;
    eventReminder2: string;
    eventReminder3: string;
  }>({
    queryKey: ["/api/auth/preferences"],
  });

  // Update privacy and notification state when data loads
  useEffect(() => {
    if (userPrefs) {
      setMarketingEmails(userPrefs.marketingEmails);
      setUsageAnalytics(userPrefs.usageAnalytics);
      setNotificationMethod(userPrefs.notificationMethod || "both");
      setTaskReminders(userPrefs.taskReminders ?? true);
      setEventReminders(userPrefs.eventReminders ?? true);
      setDailyDigest(userPrefs.dailyDigest ?? true);
      setDailyDigestTime(userPrefs.dailyDigestTime || "09:00");
      if (userPrefs.timezone) {
        setSelectedTimezone(userPrefs.timezone);
        setSavedTimezone(userPrefs.timezone);
      }
      setTaskReminderOnAssign(userPrefs.taskReminderOnAssign ?? true);
      setTaskReminderBeforeDue(userPrefs.taskReminderBeforeDue || "2h");
      setTaskOverdueReminder(userPrefs.taskOverdueReminder ?? true);
      setTaskOverdueRepeatInterval(userPrefs.taskOverdueRepeatInterval || "4h");
      setEventReminder1(userPrefs.eventReminder1 || "1d");
      setEventReminder2(userPrefs.eventReminder2 || "1h");
      setEventReminder3(userPrefs.eventReminder3 || "15m");
    }
  }, [userPrefs]);

  // Privacy preferences mutation
  const updatePrivacyMutation = useMutation({
    mutationFn: async (prefs: { marketingEmails: boolean; usageAnalytics: boolean }) => {
      const response = await apiRequest("PUT", "/api/auth/preferences", prefs);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/preferences"] });
      toast({
        title: "Privacy Settings Updated",
        description: "Your privacy preferences have been saved.",
      });
      setShowPrivacyDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to save preferences.",
        variant: "destructive",
      });
    },
  });

  // Notification preferences mutation
  const updateNotificationMutation = useMutation({
    mutationFn: async (prefs: { 
      notificationMethod: string;
      taskReminders: boolean;
      eventReminders: boolean;
      dailyDigest: boolean;
      dailyDigestTime: string;
      taskReminderOnAssign: boolean;
      taskReminderBeforeDue: string;
      taskOverdueReminder: boolean;
      taskOverdueRepeatInterval: string;
      eventReminder1: string;
      eventReminder2: string;
      eventReminder3: string;
    }) => {
      const response = await apiRequest("PUT", "/api/auth/preferences", prefs);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/preferences"] });
      toast({
        title: "Notification Settings Updated",
        description: "Your notification preferences have been saved.",
      });
      setShowNotificationDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to save notification preferences.",
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
    setSavedTimezone(selectedTimezone === getDeviceTimezone() ? null : selectedTimezone);
    updatePrivacyMutation.mutate({
      marketingEmails,
      usageAnalytics,
      timezone: selectedTimezone,
    } as any);
    toast({
      title: "Settings Saved",
      description: "Your preferences have been saved.",
    });
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


  const handleResetTeenPassword = (teenId: number, teenName: string, username?: string) => {
    setSelectedTeenForReset({ id: teenId, name: teenName, username });
    setShowResetPasswordDialog(true);
  };

  const onResetPasswordSubmit = (data: ResetPasswordForm) => {
    if (selectedTeenForReset) {
      resetTeenPasswordMutation.mutate({ 
        teenId: selectedTeenForReset.id, 
        newPassword: data.newPassword 
      });
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
    setShowSecurityDialog(true);
  };

  const handleDownloadData = async () => {
    try {
      // Helper to safely fetch data, returning empty array on error
      const safeFetch = async (url: string) => {
        try {
          const res = await fetch(url, { credentials: 'include' });
          if (!res.ok) return [];
          return res.json();
        } catch {
          return [];
        }
      };

      // Fetch all family data from the API (gracefully handle missing endpoints)
      const [
        familyMembersData,
        tasksData, 
        eventsData,
        voiceNotesData,
        notificationsData,
        groceryItemsData,
        mealPlansData,
        notesData
      ] = await Promise.all([
        safeFetch('/api/family-members'),
        safeFetch('/api/tasks/pending'),
        safeFetch('/api/events'),
        safeFetch('/api/voice-notes/recent'),
        safeFetch('/api/notifications/pending'),
        safeFetch('/api/grocery-items'),
        safeFetch('/api/meal-plans'),
        safeFetch('/api/notes')
      ]);

      // Generate comprehensive family data export
      const exportData = {
        familyMembers: familyMembersData,
        tasks: tasksData,
        events: eventsData,
        voiceNotes: voiceNotesData,
        notifications: notificationsData,
        groceryItems: groceryItemsData,
        mealPlans: mealPlansData,
        notes: notesData,
        exportDate: new Date().toISOString(),
        version: "1.0",
        appName: "The Mom App"
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `family-data-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Data Export Complete",
        description: "Your complete family data has been downloaded successfully.",
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
    const confirmed = confirm("⚠️ PERMANENT ACTION ⚠️\n\nThis will permanently delete:\n• All family member data\n• All tasks and events\n• All voice notes and deadlines\n• All notifications and settings\n\nThis action CANNOT be undone.\n\nType 'DELETE MY ACCOUNT' in the next prompt to confirm.");
    
    if (confirmed) {
      const confirmText = prompt("Type 'DELETE MY ACCOUNT' to permanently delete your account:");
      if (confirmText === "DELETE MY ACCOUNT") {
        deleteAccountMutation.mutate(confirmText);
      } else {
        toast({
          title: "Account Deletion Cancelled",
          description: "Account deletion was cancelled. Your data is safe.",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onStartVoiceNote={() => {}} />
      
      <main className="max-w-4xl mx-auto px-4 py-6 mb-28 md:mb-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Customize your family coordination experience</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="family">Family</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">

{/* Google Calendar Sync - Disabled until Google OAuth verification is complete
            <CalendarSync />
*/}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Time Zone
                </CardTitle>
                <CardDescription>
                  Set your time zone for calendar events and task due dates. Defaults to your device's current time zone.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current time zone</Label>
                  <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Your device detected: {getDeviceTimezone()}
                  </p>
                  {selectedTimezone !== getDeviceTimezone() && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTimezone(getDeviceTimezone())}
                    >
                      Reset to device time zone
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

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
                  <Label htmlFor="notifications">In-app notifications</Label>
                  <Switch
                    id="notifications"
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>
                <PushNotificationSetting />
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
                </div>
              </CardContent>
            </Card>

            <div className="pb-8">
              <Button onClick={handleSaveSettings} className="w-full">
                Save Settings
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="family" className="space-y-6">
            {/* Family Name Setting */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Family Name
                </CardTitle>
                <CardDescription>
                  This name appears on your home screen greeting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {isEditingFamilyName ? (
                    <>
                      <Input
                        value={familyName}
                        onChange={(e) => setFamilyName(e.target.value)}
                        placeholder="Enter family name"
                        className="flex-1"
                      />
                      <Button 
                        size="sm"
                        onClick={() => updateFamilyNameMutation.mutate(familyName)}
                        disabled={updateFamilyNameMutation.isPending || !familyName.trim()}
                      >
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setFamilyName(familyInfo?.name || "");
                          setIsEditingFamilyName(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 p-2 bg-muted rounded-md">
                        <span className="font-medium">{familyInfo?.name || "Your Family"}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setIsEditingFamilyName(true)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

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
                              {member.role === 'teen' && (member as any).username && (
                                <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                                  @{(member as any).username}
                                </div>
                              )}
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
                            {member.role === 'teen' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetTeenPassword(member.id, member.name, (member as any).username)}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                title="Reset Password"
                              >
                                <KeyRound className="h-3 w-3" />
                              </Button>
                            )}
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

                {/* Add Family Member Options */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Add New Family Members</h4>
                  
                  {/* Individual Plan Upgrade Banner */}
                  {isIndividualPlan && (
                    <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                      <div className="flex items-start gap-3">
                        <Crown className="h-5 w-5 text-pink-500 mt-0.5" />
                        <div className="flex-1">
                          <h5 className="font-medium text-pink-800 dark:text-pink-200">Upgrade to Family Plan</h5>
                          <p className="text-sm text-pink-700 dark:text-pink-300 mb-3">
                            Add family members, share calendars, and assign tasks by upgrading to the Family plan for just $9.99/month.
                          </p>
                          <Link href="/plans">
                            <Button size="sm" className="bg-pink-500 hover:bg-pink-600">
                              <Crown className="h-3 w-3 mr-2" />
                              Upgrade Now
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Option 1: Add Child/Teen Profile */}
                  <div className={`border rounded-lg p-4 space-y-3 ${isIndividualPlan ? 'opacity-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Plus className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium">Add Child or Teen Profile</h5>
                        <p className="text-sm text-muted-foreground mb-3">
                          Create a coordination profile for children or teens. Perfect for assigning chores, tracking activities, and family planning. No account needed.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleAddFamilyMember}
                          disabled={isIndividualPlan}
                        >
                          <Plus className="h-3 w-3 mr-2" />
                          {isIndividualPlan ? "Family Plan Required" : "Add Profile"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Invite New Parent */}
                  <div className={`border rounded-lg p-4 space-y-3 ${isIndividualPlan ? 'opacity-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <UserPlus className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium">Invite New Parent</h5>
                        <p className="text-sm text-muted-foreground mb-3">
                          Send an invitation to a parent who doesn't have an account yet. They'll get an email invitation to create their own account and join your family.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowParentInviteModal(true)}
                          disabled={isIndividualPlan}
                        >
                          <Mail className="h-3 w-3 mr-2" />
                          {isIndividualPlan ? "Family Plan Required" : "Send Invitation"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Teen Invite (keeping separate for clarity) */}
                  <div className={`border rounded-lg p-4 space-y-3 ${isIndividualPlan ? 'opacity-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <Users className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium">Invite Teen with App Access</h5>
                        <p className="text-sm text-muted-foreground mb-3">
                          Give older teens their own login to view tasks, earn points, and access family information. Includes gamification and parental oversight.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowInviteTeenModal(true)}
                          disabled={isIndividualPlan}
                        >
                          <Users className="h-3 w-3 mr-2" />
                          {isIndividualPlan ? "Family Plan Required" : "Create Teen Account"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full justify-start" onClick={handleEditMemberRoles}>
                  Edit Member Roles
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleManagePermissions}>
                  Manage Permissions
                </Button>
              </CardContent>
            </Card>

            {/* Kids Point Management Section - Works for all child/teen family members */}
            <KidPointManager />

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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Import Tasks clicked, setting modal open");
                    setImportType("tasks");
                    setShowImportModal(true);
                  }}
                >
                  Import/Export Tasks
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Import Notes clicked, setting modal open");
                    setImportType("notes");
                    setShowImportModal(true);
                  }}
                >
                  Import/Export Notes
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Import Passwords clicked, setting modal open");
                    setImportType("passwords");
                    setShowImportModal(true);
                  }}
                >
                  Import/Export Passwords
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans & Pricing Tab */}
          <TabsContent value="plans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Your Subscription
                </CardTitle>
                <CardDescription>
                  Manage your subscription and billing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscriptionData && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium capitalize">{subscriptionData.subscriptionPlan || "Free Trial"}</p>
                        <p className="text-sm text-muted-foreground">
                          {subscriptionData.isOnTrial 
                            ? `${subscriptionData.trialDaysLeft || 0} days remaining in trial`
                            : subscriptionData.subscriptionStatus === "active" 
                              ? `${subscriptionData.billingInterval || "Monthly"} billing`
                              : "Inactive"
                          }
                        </p>
                      </div>
                      {subscriptionData.isOnTrial && (
                        <Badge variant="secondary" className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                          Trial Active
                        </Badge>
                      )}
                      {subscriptionData.subscriptionStatus === "active" && !subscriptionData.isOnTrial && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Active
                        </Badge>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Link href="/upgrade">
                        <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer h-full">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center">
                                <Crown className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="font-semibold">Individual Plan</p>
                                <p className="text-sm text-muted-foreground">$5.99/mo or $59.99/yr</p>
                              </div>
                            </div>
                            <ul className="text-sm text-muted-foreground space-y-1 mt-3">
                              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> AI Voice Assistant</li>
                              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Smart Calendar</li>
                              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Task & Meal Planning</li>
                            </ul>
                          </CardContent>
                        </Card>
                      </Link>

                      <Link href="/upgrade">
                        <Card className="border-2 border-primary/30 hover:border-primary transition-colors cursor-pointer relative h-full">
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">Most Popular</Badge>
                          </div>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                                <Users className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="font-semibold">Family Plan</p>
                                <p className="text-sm text-muted-foreground">$9.99/mo or $99.99/yr</p>
                              </div>
                            </div>
                            <ul className="text-sm text-muted-foreground space-y-1 mt-3">
                              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Everything in Individual</li>
                              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Up to 6 Family Members</li>
                              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Teen Accounts & Points</li>
                            </ul>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>

                    <Button asChild className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white">
                      <Link href="/upgrade">
                        {subscriptionData.isOnTrial ? "Upgrade Now" : "Change Plan"}
                      </Link>
                    </Button>
                  </div>
                )}
                {!subscriptionData && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Send Us Feedback
                </CardTitle>
                <CardDescription>
                  Have a feature idea, found a bug, or just want to share your thoughts? We'd love to hear from you!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>What type of feedback is this?</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={feedbackType === "feedback" ? "default" : "outline"}
                      onClick={() => setFeedbackType("feedback")}
                      className="flex items-center gap-2"
                    >
                      <Heart className="h-4 w-4" />
                      Feedback
                    </Button>
                    <Button
                      type="button"
                      variant={feedbackType === "feature_request" ? "default" : "outline"}
                      onClick={() => setFeedbackType("feature_request")}
                      className="flex items-center gap-2"
                    >
                      <Lightbulb className="h-4 w-4" />
                      Feature
                    </Button>
                    <Button
                      type="button"
                      variant={feedbackType === "bug_report" ? "default" : "outline"}
                      onClick={() => setFeedbackType("bug_report")}
                      className="flex items-center gap-2"
                    >
                      <Bug className="h-4 w-4" />
                      Bug
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback-subject">Subject</Label>
                  <Input
                    id="feedback-subject"
                    placeholder={
                      feedbackType === "feature_request" 
                        ? "What feature would you like to see?" 
                        : feedbackType === "bug_report"
                        ? "What's not working?"
                        : "What's on your mind?"
                    }
                    value={feedbackSubject}
                    onChange={(e) => setFeedbackSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback-message">Message</Label>
                  <textarea
                    id="feedback-message"
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={
                      feedbackType === "feature_request"
                        ? "Describe the feature you'd like and how it would help you..."
                        : feedbackType === "bug_report"
                        ? "What happened? What did you expect to happen?"
                        : "Share your thoughts, suggestions, or experience..."
                    }
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                  />
                </div>

                <Button
                  onClick={() => feedbackMutation.mutate({
                    type: feedbackType,
                    subject: feedbackSubject,
                    message: feedbackMessage,
                  })}
                  disabled={!feedbackSubject.trim() || !feedbackMessage.trim() || feedbackMutation.isPending}
                  className="w-full"
                >
                  {feedbackMutation.isPending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            {/* Trial Status and Billing Section */}
            {trialStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Trial Status
                  </CardTitle>
                  <CardDescription>
                    Your 14-day free trial status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium">
                        {trialStatus.isActive ? (
                          <span className="text-green-600">Trial Active</span>
                        ) : (
                          <span className="text-red-600">Trial Expired</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {trialStatus.isActive ? (
                          `${trialStatus.daysRemaining} days remaining`
                        ) : (
                          "Your trial has expired"
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">Free Trial</div>
                      <div className="text-sm text-muted-foreground">
                        {trialStatus.isActive ? "Until " : "Expired on "}
                        {new Date(trialStatus.trialEndDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  {!trialStatus.isActive && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="font-medium text-orange-800 dark:text-orange-200">
                        Trial Expired
                      </div>
                      <div className="text-sm text-orange-700 dark:text-orange-300">
                        Please upgrade to continue using The Mom App
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        toast({
                          title: "Individual Plan",
                          description: "$5.99/month - Perfect for single parents",
                        });
                      }}
                    >
                      Individual Plan - $5.99/month
                    </Button>
                    <Button 
                      variant="default" 
                      className="w-full"
                      onClick={() => {
                        toast({
                          title: "Family Plan",
                          description: "$9.99/month - Up to 4 family members",
                        });
                      }}
                    >
                      Family Plan - $9.99/month
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

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
                <Button variant="outline" className="w-full justify-start" onClick={() => setShowNotificationDialog(true)}>
                  Notification Preferences
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

        {/* Add Family Member Dialog */}
        <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto top-[5%] sm:top-[50%] translate-y-0 sm:-translate-y-1/2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Create Family Profile
              </DialogTitle>
              <DialogDescription>
                Create a coordination profile for a family member. Perfect for children, teens, or family members who don't need their own login account. For parents who need account access, use the invite options instead.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitAddMember)} className="space-y-4 pb-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter family member's name" 
                          {...field}
                          onFocus={(e) => {
                            setTimeout(() => {
                              e.target.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'center' 
                              });
                            }, 100);
                          }}
                        />
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
                      <FormLabel>Phone Number (Optional - For Notifications)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter phone number for SMS notifications" 
                          {...field}
                          onFocus={(e) => {
                            setTimeout(() => {
                              e.target.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'center' 
                              });
                            }, 100);
                          }}
                        />
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
                      <FormLabel>Email (Optional - For Notifications)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter email address for notifications" 
                          type="email" 
                          {...field}
                          onFocus={(e) => {
                            setTimeout(() => {
                              e.target.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'center' 
                              });
                            }, 100);
                          }}
                        />
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
                            onFocus={(e) => {
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium">First Name</Label>
                    <Input 
                      value={profileFirstName}
                      onChange={(e) => setProfileFirstName(e.target.value)}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Name</Label>
                    <Input 
                      value={profileLastName}
                      onChange={(e) => setProfileLastName(e.target.value)}
                      className="mt-1" 
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">App Theme</Label>
                  <Select value={theme} onValueChange={(value: "light" | "dark" | "system") => setTheme(value)}>
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
              <Button 
                onClick={() => {
                  updateProfileMutation.mutate({
                    firstName: profileFirstName,
                    lastName: profileLastName,
                  });
                }}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
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
                Control your privacy and communication preferences.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Usage Analytics</Label>
                    <p className="text-xs text-muted-foreground">Help improve the app by sharing anonymous usage data</p>
                  </div>
                  <Switch 
                    checked={usageAnalytics} 
                    onCheckedChange={setUsageAnalytics}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Marketing Communications</Label>
                    <p className="text-xs text-muted-foreground">Receive emails about new features and updates</p>
                  </div>
                  <Switch 
                    checked={marketingEmails} 
                    onCheckedChange={setMarketingEmails}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Reset to saved values
                  if (userPrefs) {
                    setMarketingEmails(userPrefs.marketingEmails);
                    setUsageAnalytics(userPrefs.usageAnalytics);
                  }
                  setShowPrivacyDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  updatePrivacyMutation.mutate({ marketingEmails, usageAnalytics });
                }}
                disabled={updatePrivacyMutation.isPending}
              >
                {updatePrivacyMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Security Settings Dialog */}
        <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Security Settings
              </DialogTitle>
              <DialogDescription>
                Manage your account security and authentication preferences.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Current Password</Label>
                  <Input 
                    type="password" 
                    placeholder="Enter current password" 
                    className="mt-1"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">New Password</Label>
                  <Input 
                    type="password" 
                    placeholder="Enter new password (min 6 characters)" 
                    className="mt-1"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Confirm New Password</Label>
                  <Input 
                    type="password" 
                    placeholder="Confirm new password" 
                    className="mt-1"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                  {confirmNewPassword && newPassword !== confirmNewPassword && (
                    <p className="text-sm text-red-500 mt-1">Passwords don't match</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                    <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Login Notifications</Label>
                    <p className="text-xs text-muted-foreground">Get notified when someone logs into your account</p>
                  </div>
                  <Switch defaultChecked={true} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Auto-Lock App</Label>
                    <p className="text-xs text-muted-foreground">Automatically lock app after 15 minutes of inactivity</p>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
                <div>
                  <Label className="text-sm font-medium">Active Sessions</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div>
                        <p className="text-sm font-medium">This Device</p>
                        <p className="text-xs text-muted-foreground">Last active: Now</p>
                      </div>
                      <Badge variant="secondary">Current</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div>
                        <p className="text-sm font-medium">iPhone</p>
                        <p className="text-xs text-muted-foreground">Last active: 2 hours ago</p>
                      </div>
                      <Button variant="outline" size="sm">Revoke</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setShowSecurityDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (currentPassword && newPassword) {
                    if (newPassword.length < 6) {
                      toast({
                        title: "Invalid Password",
                        description: "New password must be at least 6 characters long.",
                        variant: "destructive",
                      });
                      return;
                    }
                    if (newPassword !== confirmNewPassword) {
                      toast({
                        title: "Passwords Don't Match",
                        description: "Please make sure your new passwords match.",
                        variant: "destructive",
                      });
                      return;
                    }
                    changePasswordMutation.mutate({ currentPassword, newPassword });
                  } else {
                    toast({
                      title: "Security Settings Updated",
                      description: "Your security preferences have been saved.",
                    });
                    setShowSecurityDialog(false);
                  }
                }}
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? "Saving..." : "Save Security Settings"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Notification Preferences Dialog */}
        <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
          <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notification Preferences
              </DialogTitle>
              <DialogDescription>
                Customize how and when you receive reminders.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Notification Method</Label>
                  <p className="text-xs text-muted-foreground mb-2">How would you like to receive reminders?</p>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <Bell className="h-4 w-4 text-primary" />
                    <span className="text-sm">Push Notifications (In-App)</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Task Reminders</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Task Reminders</Label>
                        <p className="text-xs text-muted-foreground">Get notified about task deadlines</p>
                      </div>
                      <Switch checked={taskReminders} onCheckedChange={setTaskReminders} />
                    </div>
                    {taskReminders && (
                      <>
                        <div className="flex items-center justify-between pl-2">
                          <div>
                            <Label className="text-sm">Notify on assignment</Label>
                            <p className="text-xs text-muted-foreground">Get notified when a task is assigned</p>
                          </div>
                          <Switch checked={taskReminderOnAssign} onCheckedChange={setTaskReminderOnAssign} />
                        </div>
                        <div className="pl-2">
                          <Label className="text-sm">Reminder before due date</Label>
                          <p className="text-xs text-muted-foreground mb-1">How far in advance to remind you</p>
                          <Select value={taskReminderBeforeDue} onValueChange={setTaskReminderBeforeDue}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30m">30 minutes before</SelectItem>
                              <SelectItem value="1h">1 hour before</SelectItem>
                              <SelectItem value="2h">2 hours before</SelectItem>
                              <SelectItem value="4h">4 hours before</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between pl-2">
                          <div>
                            <Label className="text-sm">Overdue reminders</Label>
                            <p className="text-xs text-muted-foreground">Get reminded about overdue tasks</p>
                          </div>
                          <Switch checked={taskOverdueReminder} onCheckedChange={setTaskOverdueReminder} />
                        </div>
                        {taskOverdueReminder && (
                          <div className="pl-2">
                            <Label className="text-sm">Overdue repeat frequency</Label>
                            <p className="text-xs text-muted-foreground mb-1">How often to repeat overdue reminders</p>
                            <Select value={taskOverdueRepeatInterval} onValueChange={setTaskOverdueRepeatInterval}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2h">Every 2 hours</SelectItem>
                                <SelectItem value="4h">Every 4 hours</SelectItem>
                                <SelectItem value="8h">Every 8 hours</SelectItem>
                                <SelectItem value="none">Don't repeat</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Event Reminders</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Event Reminders</Label>
                        <p className="text-xs text-muted-foreground">Get reminded before calendar events</p>
                      </div>
                      <Switch checked={eventReminders} onCheckedChange={setEventReminders} />
                    </div>
                    {eventReminders && (
                      <>
                        <div className="pl-2">
                          <Label className="text-sm">First reminder</Label>
                          <p className="text-xs text-muted-foreground mb-1">Earliest heads-up before the event</p>
                          <Select value={eventReminder1} onValueChange={setEventReminder1}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1d">1 day before</SelectItem>
                              <SelectItem value="12h">12 hours before</SelectItem>
                              <SelectItem value="none">Off</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="pl-2">
                          <Label className="text-sm">Second reminder</Label>
                          <p className="text-xs text-muted-foreground mb-1">Getting-ready reminder</p>
                          <Select value={eventReminder2} onValueChange={setEventReminder2}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2h">2 hours before</SelectItem>
                              <SelectItem value="1h">1 hour before</SelectItem>
                              <SelectItem value="30m">30 minutes before</SelectItem>
                              <SelectItem value="none">Off</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="pl-2">
                          <Label className="text-sm">Final reminder</Label>
                          <p className="text-xs text-muted-foreground mb-1">Last-minute heads-up</p>
                          <Select value={eventReminder3} onValueChange={setEventReminder3}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30m">30 minutes before</SelectItem>
                              <SelectItem value="15m">15 minutes before</SelectItem>
                              <SelectItem value="5m">5 minutes before</SelectItem>
                              <SelectItem value="none">Off</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Daily Digest</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Daily Digest</Label>
                        <p className="text-xs text-muted-foreground">Daily summary of open tasks</p>
                      </div>
                      <Switch checked={dailyDigest} onCheckedChange={setDailyDigest} />
                    </div>
                    {dailyDigest && (
                      <div className="pl-2">
                        <Label className="text-sm">Delivery time</Label>
                        <p className="text-xs text-muted-foreground mb-1">When to send your daily summary</p>
                        <Select value={dailyDigestTime} onValueChange={setDailyDigestTime}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="07:00">7:00 AM</SelectItem>
                            <SelectItem value="08:00">8:00 AM</SelectItem>
                            <SelectItem value="09:00">9:00 AM</SelectItem>
                            <SelectItem value="10:00">10:00 AM</SelectItem>
                            <SelectItem value="18:00">6:00 PM</SelectItem>
                            <SelectItem value="19:00">7:00 PM</SelectItem>
                            <SelectItem value="20:00">8:00 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (userPrefs) {
                    setNotificationMethod(userPrefs.notificationMethod || "both");
                    setTaskReminders(userPrefs.taskReminders ?? true);
                    setEventReminders(userPrefs.eventReminders ?? true);
                    setDailyDigest(userPrefs.dailyDigest ?? true);
                    setDailyDigestTime(userPrefs.dailyDigestTime || "09:00");
                    setTaskReminderOnAssign(userPrefs.taskReminderOnAssign ?? true);
                    setTaskReminderBeforeDue(userPrefs.taskReminderBeforeDue || "2h");
                    setTaskOverdueReminder(userPrefs.taskOverdueReminder ?? true);
                    setTaskOverdueRepeatInterval(userPrefs.taskOverdueRepeatInterval || "4h");
                    setEventReminder1(userPrefs.eventReminder1 || "1d");
                    setEventReminder2(userPrefs.eventReminder2 || "1h");
                    setEventReminder3(userPrefs.eventReminder3 || "15m");
                  }
                  setShowNotificationDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  updateNotificationMutation.mutate({ 
                    notificationMethod, 
                    taskReminders, 
                    eventReminders,
                    dailyDigest,
                    dailyDigestTime,
                    taskReminderOnAssign,
                    taskReminderBeforeDue,
                    taskOverdueReminder,
                    taskOverdueRepeatInterval,
                    eventReminder1,
                    eventReminder2,
                    eventReminder3,
                  });
                }}
                disabled={updateNotificationMutation.isPending}
              >
                {updateNotificationMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import/Export Modal */}
        <ImportExportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          type={importType}
        />

        {/* Invite Teen Modal */}
        <InviteTeenModal
          isOpen={showInviteTeenModal}
          onClose={() => setShowInviteTeenModal(false)}
        />

        {/* Parent Invite Modal */}
        <ParentInviteModal
          isOpen={showParentInviteModal}
          onClose={() => setShowParentInviteModal(false)}
        />

        {/* Password Reset Modal */}
        <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password for {selectedTeenForReset?.name}</DialogTitle>
              <DialogDescription>
                Set a new password for {selectedTeenForReset?.name}
                {selectedTeenForReset?.username && (
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    (@{selectedTeenForReset.username})
                  </span>
                )}. They'll use this password to log in.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...resetPasswordForm}>
              <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                <FormField
                  control={resetPasswordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter new password (min 6 characters)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={resetPasswordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm new password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowResetPasswordDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={resetTeenPasswordMutation.isPending}
                  >
                    {resetTeenPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      </main>

      <MobileNav />
    </div>
  );
}