import { useState, useCallback, useMemo, useEffect, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft,
  Eye,
  EyeOff,
  Copy,
  Lock,
  Unlock,
  Shield,
  Tv,
  Music,
  GamepadIcon,
  Globe,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  User,
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import TeenNavigation from "@/components/teen/teen-navigation";

interface SharedPassword {
  id: number;
  service: string;
  category: "streaming" | "gaming" | "educational" | "other";
  username: string;
  password: string;
  notes?: string;
  sharedBy: string;
  sharedAt: Date;
  lastUsed?: Date;
}

const passwordFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  website: z.string().optional(),
  username: z.string().optional(),
  email: z.string().optional(), 
  password: z.string().min(1, "Password is required"),
  notes: z.string().optional()
});

const categoryIcons = {
  streaming: <Tv className="h-5 w-5 text-blue-500" />,
  gaming: <GamepadIcon className="h-5 w-5 text-green-500" />,
  educational: <Shield className="h-5 w-5 text-purple-500" />,
  social: <User className="h-5 w-5 text-pink-500" />,
  school: <Shield className="h-5 w-5 text-indigo-500" />,
  other: <Globe className="h-5 w-5 text-gray-500" />
};

const categoryColors = {
  streaming: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
  gaming: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800", 
  educational: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800",
  social: "bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800",
  school: "bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800",
  other: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
};

export default function TeenPasswords() {
  const [, setLocation] = useLocation();
  const [showPasswords, setShowPasswords] = useState<Record<string | number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddPasswordModal, setShowAddPasswordModal] = useState(false);
  const [showEditPasswordModal, setShowEditPasswordModal] = useState(false);
  const [editingPassword, setEditingPassword] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Invalidate only password-related caches on mount to force fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/teen/shared-passwords"] });
    console.log("Invalidated password caches on teen passwords page load");
  }, [queryClient]);

  // Get teen profile data
  const { data: authData } = useQuery({
    queryKey: ["/api/teen/auth/user"],
    retry: false,
  });
  
  const teenProfile = (authData as any)?.teenProfile;

  // Fetch teen's own personal passwords
  const { data: personalPasswords = [], isLoading: isLoadingPersonal } = useQuery({
    queryKey: ["/api/teen/passwords"],
    queryFn: async () => {
      console.log("Fetching teen personal passwords...");
      const response = await fetch('/api/teen/passwords', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Teen personal passwords fetched:", data);
      return data;
    },
    enabled: !!(authData as any)?.isAuthenticated && !!teenProfile,
    retry: false,
  });

  // Fetch shared passwords for teen
  const { data: sharedPasswords = [], isLoading: isLoadingShared } = useQuery({
    queryKey: ["/api/teen/shared-passwords"],
    queryFn: async () => {
      console.log("Fetching teen shared passwords...");
      const response = await fetch('/api/teen/shared-passwords', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Teen shared passwords fetched:", data);
      return data;
    },
    enabled: !!(authData as any)?.isAuthenticated && !!teenProfile,
    retry: false,
  });

  const togglePasswordVisibility = (id: number | string) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Create personal password mutation
  const createPasswordMutation = useMutation({
    mutationFn: async (passwordData: any) => {
      return apiRequest("POST", "/api/teen/passwords", passwordData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teen/passwords"] });
      toast({
        title: "Password Created",
        description: "Your personal password has been saved securely.",
      });
      setShowAddPasswordModal(false);
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create password. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update personal password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async ({ id, ...passwordData }: any) => {
      return apiRequest("PUT", `/api/teen/passwords/${id}`, passwordData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teen/passwords"] });
      toast({
        title: "Password Updated",
        description: "Your personal password has been updated securely.",
      });
      setShowEditPasswordModal(false);
      setEditingPassword(null);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete personal password mutation
  const deletePasswordMutation = useMutation({
    mutationFn: async (passwordId: number) => {
      return apiRequest("DELETE", `/api/teen/passwords/${passwordId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teen/passwords"] });
      toast({
        title: "Password Deleted",
        description: "Your personal password has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete password. Please try again.",
        variant: "destructive",
      });
    }
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const filteredPersonalPasswords = (personalPasswords as any[]).filter((password: any) =>
    password.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    password.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSharedPasswords = (sharedPasswords as SharedPassword[]).filter((password: SharedPassword) =>
    password.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
    password.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <TeenNavigation currentPath="/teen-passwords" teenProfile={teenProfile} />
      
      <div className="max-w-4xl mx-auto p-4 pb-24 md:pb-4">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Passwords</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your personal passwords and access family shared ones</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowAddPasswordModal(true)}
              className="flex items-center gap-2"
              data-testid="button-add-personal-password"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Secure
            </Badge>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Label htmlFor="search" className="sr-only">Search passwords</Label>
              <Input
                id="search"
                placeholder="Search passwords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* My Personal Passwords */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5" />
            <h2 className="text-lg font-semibold">
              My Personal Passwords ({filteredPersonalPasswords.length})
            </h2>
          </div>

          {isLoadingPersonal ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading your passwords...</span>
            </div>
          ) : filteredPersonalPasswords.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm ? "No passwords found" : "No personal passwords yet"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchTerm 
                    ? "Try adjusting your search terms" 
                    : "Create your first personal password to get started"
                  }
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setShowAddPasswordModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPersonalPasswords.map((password: any) => (
                <Card key={password.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {categoryIcons[password.category as keyof typeof categoryIcons] || categoryIcons.other}
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{password.title}</h3>
                          <Badge variant="outline" className={categoryColors[password.category as keyof typeof categoryColors]}>
                            {password.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingPassword(password);
                            setShowEditPasswordModal(true);
                          }}
                          className="h-8 w-8 p-0"
                          data-testid={`button-edit-password-${password.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this password?')) {
                              deletePasswordMutation.mutate(password.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          data-testid={`button-delete-password-${password.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {password.website && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Website</span>
                          <span className="text-sm text-gray-900 dark:text-gray-200">{password.website}</span>
                        </div>
                      )}
                      
                      {password.username && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Username</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900 dark:text-gray-200">{password.username}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(password.username, "Username")}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Password</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">
                            {showPasswords[password.id] ? password.password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePasswordVisibility(password.id)}
                            className="h-6 w-6 p-0"
                          >
                            {showPasswords[password.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(password.password, "Password")}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {password.notes && (
                        <div className="pt-2 border-t">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Notes</span>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{password.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Shared Passwords */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5" />
            <h2 className="text-lg font-semibold">
              Family Shared Passwords ({filteredSharedPasswords.length})
            </h2>
          </div>

          {isLoadingShared ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading shared passwords...</span>
            </div>
          ) : filteredSharedPasswords.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm ? "No passwords found" : "No shared passwords yet"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
                  {searchTerm 
                    ? "Try searching for a different service or category"
                    : "Your parents haven't shared any passwords with the family yet."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredSharedPasswords.map((password: SharedPassword) => (
                <Card key={password.id} className={`${categoryColors[password.category]} transition-all hover:shadow-md`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {categoryIcons[password.category]}
                        <div>
                          <CardTitle className="text-lg">{password.service}</CardTitle>
                          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{password.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Shared by {password.sharedBy}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Username</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={password.username} 
                          readOnly 
                          className="flex-1 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(password.username, "Username")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Password</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type={showPasswords[password.id] ? "text" : "password"}
                          value={password.password} 
                          readOnly 
                          className="flex-1 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePasswordVisibility(password.id)}
                        >
                          {showPasswords[password.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(password.password, "Password")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {password.notes && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Notes</Label>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm dark:text-gray-300">
                          {password.notes}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t dark:border-gray-700">
                      Shared: {formatDate(password.sharedAt)}
                      {password.lastUsed && (
                        <span className="ml-4">
                          Last used: {formatDate(password.lastUsed)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Add Personal Password Modal */}
      <Dialog open={showAddPasswordModal} onOpenChange={setShowAddPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Personal Password</DialogTitle>
            <DialogDescription>
              Create a secure password entry that only you can access.
            </DialogDescription>
          </DialogHeader>
          <PersonalPasswordForm 
            onSubmit={(data) => createPasswordMutation.mutate(data)} 
            isLoading={createPasswordMutation.isPending}
            onCancel={() => setShowAddPasswordModal(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Personal Password Modal */}
      <Dialog open={showEditPasswordModal} onOpenChange={setShowEditPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Personal Password</DialogTitle>
            <DialogDescription>
              Update your secure password entry.
            </DialogDescription>
          </DialogHeader>
          <PersonalPasswordForm 
            initialData={editingPassword}
            onSubmit={(data) => updatePasswordMutation.mutate({ id: editingPassword?.id, ...data })} 
            isLoading={updatePasswordMutation.isPending}
            onCancel={() => {
              setShowEditPasswordModal(false);
              setEditingPassword(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PersonalPasswordForm({ onSubmit, isLoading, onCancel, initialData }: {
  onSubmit: (data: any) => void;
  isLoading: boolean;
  onCancel: () => void;
  initialData?: any;
}) {
  const form = useForm({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      category: initialData?.category || "",
      website: initialData?.website || "",
      username: initialData?.username || "",
      email: initialData?.email || "",
      password: initialData?.password || "",
      notes: initialData?.notes || ""
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., My Instagram" {...field} data-testid="input-password-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-password-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="streaming">Streaming</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder="e.g., instagram.com" {...field} data-testid="input-password-website" />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="username" {...field} data-testid="input-password-username" />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email@example.com" {...field} data-testid="input-password-email" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password *</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter password" {...field} data-testid="input-password-value" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Optional notes..." {...field} data-testid="textarea-password-notes" />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-password">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} data-testid="button-save-password">
            {isLoading ? "Saving..." : "Save Password"}
          </Button>
        </div>
      </form>
    </Form>
  );
}