import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  User
} from "lucide-react";
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

interface PersonalPassword {
  id: number;
  title: string;
  category: "streaming" | "gaming" | "educational" | "other" | "social" | "school";
  website?: string;
  username?: string;
  email?: string;
  password: string;
  notes?: string;
  createdAt: Date;
  lastUpdated: Date;
}

const categoryIcons = {
  streaming: <Tv className="h-5 w-5 text-blue-500" />,
  gaming: <GamepadIcon className="h-5 w-5 text-green-500" />,
  educational: <Shield className="h-5 w-5 text-purple-500" />,
  social: <User className="h-5 w-5 text-pink-500" />,
  school: <Shield className="h-5 w-5 text-indigo-500" />,
  other: <Globe className="h-5 w-5 text-gray-500" />
};

const categoryColors = {
  streaming: "bg-blue-50 border-blue-200",
  gaming: "bg-green-50 border-green-200", 
  educational: "bg-purple-50 border-purple-200",
  social: "bg-pink-50 border-pink-200",
  school: "bg-indigo-50 border-indigo-200",
  other: "bg-gray-50 border-gray-200"
};

export default function TeenPasswords() {
  const [, setLocation] = useLocation();
  const [showPasswords, setShowPasswords] = useState<Record<string | number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<PersonalPassword | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "other",
    website: "",
    username: "",
    email: "",
    password: "",
    notes: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Stable input handlers to prevent cursor jumping - using useCallback
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, title: e.target.value }));
  }, []);
  
  const handleWebsiteChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, website: e.target.value }));
  }, []);
  
  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, username: e.target.value }));
  }, []);
  
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, email: e.target.value }));
  }, []);
  
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, password: e.target.value }));
  }, []);
  
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, notes: e.target.value }));
  }, []);
  
  const handleCategoryChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, category: value }));
  }, []);

  // Get teen profile data with avatar
  const { data: authData } = useQuery({
    queryKey: ["/api/teen/auth/user"],
    retry: false,
  });
  
  const teenProfile = (authData as any)?.teenProfile;

  // Fetch shared passwords for teen
  const { data: sharedPasswords = [], isLoading: isLoadingShared } = useQuery({
    queryKey: ["/api/teen/shared-passwords"],
    retry: false,
  });

  // Fetch teen's personal passwords
  const { data: personalPasswords = [], isLoading: isLoadingPersonal, refetch: refetchPasswords } = useQuery({
    queryKey: ["/api/teen/passwords"],
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch to get latest data
  });

  // Debug log to see password data and teen auth
  console.log("Personal passwords:", personalPasswords);
  console.log("Teen profile for passwords:", teenProfile);
  console.log("Auth data for passwords:", authData);

  // Mutations for password management
  const createPasswordMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/teen/passwords", data);
      return response.json();
    },
    onSuccess: () => {
      // Force refresh the password list
      refetchPasswords();
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Password Created",
        description: "Your password has been saved securely",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & typeof formData) => {
      const response = await apiRequest("PUT", `/api/teen/passwords/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teen/passwords"] });
      setEditingPassword(null);
      resetForm();
      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePasswordMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/teen/passwords/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teen/passwords"] });
      toast({
        title: "Password Deleted",
        description: "Your password has been deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      category: "other",
      website: "",
      username: "",
      email: "",
      password: "",
      notes: ""
    });
  };

  const handleCreatePassword = () => {
    if (!formData.title || !formData.password) {
      toast({
        title: "Missing required fields",
        description: "Please enter a title and password",
        variant: "destructive",
      });
      return;
    }
    createPasswordMutation.mutate(formData);
  };

  const handleUpdatePassword = () => {
    if (!editingPassword || !formData.title || !formData.password) {
      toast({
        title: "Missing required fields",
        description: "Please enter a title and password",
        variant: "destructive",
      });
      return;
    }
    updatePasswordMutation.mutate({ id: editingPassword.id, ...formData });
  };

  const handleEditPassword = (password: PersonalPassword) => {
    setEditingPassword(password);
    setFormData({
      title: password.title,
      category: password.category,
      website: password.website || "",
      username: password.username || "",
      email: password.email || "",
      password: password.password,
      notes: password.notes || ""
    });
  };

  const handleDeletePassword = (id: number) => {
    if (confirm("Are you sure you want to delete this password?")) {
      deletePasswordMutation.mutate(id);
    }
  };

  const togglePasswordVisibility = (id: number | string) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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

  const filteredSharedPasswords = (sharedPasswords as SharedPassword[]).filter((password: SharedPassword) =>
    password.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
    password.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPersonalPasswords = (personalPasswords as PersonalPassword[]).filter((password: PersonalPassword) =>
    password.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const PasswordForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="form-title">Title *</Label>
          <Input
            id="form-title"
            placeholder="Netflix, Instagram, etc."
            value={formData.title}
            onChange={handleTitleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="form-category">Category</Label>
          <Select value={formData.category} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="streaming">Streaming</SelectItem>
              <SelectItem value="gaming">Gaming</SelectItem>
              <SelectItem value="social">Social Media</SelectItem>
              <SelectItem value="school">School</SelectItem>
              <SelectItem value="educational">Educational</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="form-website">Website</Label>
        <Input
          id="form-website"
          placeholder="netflix.com"
          value={formData.website}
          onChange={handleWebsiteChange}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="form-username">Username</Label>
          <Input
            id="form-username"
            placeholder="username"
            value={formData.username}
            onChange={handleUsernameChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="form-email">Email</Label>
          <Input
            id="form-email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={handleEmailChange}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="form-password">Password *</Label>
        <Input
          id="form-password"
          type="password"
          placeholder="Your password"
          value={formData.password}
          onChange={handlePasswordChange}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="form-notes">Notes</Label>
        <Textarea
          id="form-notes"
          placeholder="Security questions, special instructions, etc."
          value={formData.notes}
          onChange={handleNotesChange}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <TeenNavigation currentPath="/teen-passwords" teenProfile={teenProfile} />
      
      <div className="max-w-4xl mx-auto p-4">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Password Manager</h1>
            <p className="text-gray-600">Manage your passwords securely</p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Secure
          </Badge>
        </div>

        {/* Tabbed Interface */}
        <Tabs defaultValue="personal" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-auto grid-cols-2">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                My Passwords ({(personalPasswords as PersonalPassword[]).length})
              </TabsTrigger>
              <TabsTrigger value="shared" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Shared ({(sharedPasswords as SharedPassword[]).length})
              </TabsTrigger>
            </TabsList>
            
            {/* Add Password Button */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingPassword(null); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Password</DialogTitle>
                </DialogHeader>
                <PasswordForm />
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreatePassword}
                    disabled={createPasswordMutation.isPending}
                  >
                    {createPasswordMutation.isPending ? "Creating..." : "Create Password"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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

          {/* Personal Passwords Tab */}
          <TabsContent value="personal" className="space-y-4">
            {isLoadingPersonal ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                <span className="ml-3 text-gray-600">Loading your passwords...</span>
              </div>
            ) : filteredPersonalPasswords.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? "No passwords found" : "No personal passwords yet"}
                  </h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-4">
                    {searchTerm 
                      ? "Try searching for a different title or category"
                      : "Create your first password to get started with secure password management."
                    }
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Password
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPersonalPasswords.map((password: PersonalPassword) => (
                  <Card key={password.id} className={`${categoryColors[password.category]} transition-all hover:shadow-md`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {categoryIcons[password.category]}
                          <div>
                            <CardTitle className="text-lg">{password.title}</CardTitle>
                            <p className="text-sm text-gray-600 capitalize">{password.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Personal</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditPassword(password)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeletePassword(password.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {password.website && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Website</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              value={password.website} 
                              readOnly 
                              className="flex-1 bg-white"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(password.website!, "Website")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {(password.username || password.email) && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            {password.email ? "Email" : "Username"}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              value={password.email || password.username || ""} 
                              readOnly 
                              className="flex-1 bg-white"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(password.email || password.username || "", password.email ? "Email" : "Username")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Password</Label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Input 
                              type={showPasswords[password.id] ? "text" : "password"}
                              value={password.password} 
                              readOnly 
                              className="pr-10 bg-white"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                              onClick={() => togglePasswordVisibility(password.id)}
                            >
                              {showPasswords[password.id] ? 
                                <EyeOff className="h-4 w-4" /> : 
                                <Eye className="h-4 w-4" />
                              }
                            </Button>
                          </div>
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
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            <p className="text-sm text-gray-700">{password.notes}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                        <span>Created {formatDate(password.createdAt)}</span>
                        <span>Updated {formatDate(password.lastUpdated)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Shared Passwords Tab */}
          <TabsContent value="shared" className="space-y-4">
            <Card className="mb-6 bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-800 mb-1">Important Security Reminder</h3>
                    <p className="text-sm text-amber-700">
                      These passwords are shared by your parents for family accounts. 
                      Please keep them private and don't share with friends. 
                      If you think a password might be compromised, let your parents know right away.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isLoadingShared ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                <span className="ml-3 text-gray-600">Loading shared passwords...</span>
              </div>
            ) : filteredSharedPasswords.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? "No shared passwords found" : "No shared passwords yet"}
                  </h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    {searchTerm 
                      ? "Try searching for a different service or category"
                      : "Your parents haven't shared any passwords with you yet. They can share family account passwords from their settings."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredSharedPasswords.map((password: SharedPassword) => (
                  <Card key={`shared-${password.id}`} className={`${categoryColors[password.category]} transition-all hover:shadow-md`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {categoryIcons[password.category]}
                          <div>
                            <CardTitle className="text-lg">{password.service}</CardTitle>
                            <p className="text-sm text-gray-600 capitalize">{password.category}</p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          Shared by {password.sharedBy}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Username/Email</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            value={password.username} 
                            readOnly 
                            className="flex-1 bg-white"
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
                          <div className="relative flex-1">
                            <Input 
                              type={showPasswords[`shared-${password.id}`] ? "text" : "password"}
                              value={password.password} 
                              readOnly 
                              className="pr-10 bg-white"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                              onClick={() => togglePasswordVisibility(`shared-${password.id}`)}
                            >
                              {showPasswords[`shared-${password.id}`] ? 
                                <EyeOff className="h-4 w-4" /> : 
                                <Eye className="h-4 w-4" />
                              }
                            </Button>
                          </div>
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
                          <Label className="text-sm font-medium">Notes from Parent</Label>
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">{password.notes}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                        <span>Shared {formatDate(password.sharedAt)}</span>
                        {password.lastUsed && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Last used {formatDate(password.lastUsed)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={editingPassword !== null} onOpenChange={(open) => !open && setEditingPassword(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Password</DialogTitle>
            </DialogHeader>
            <PasswordForm />
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingPassword(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdatePassword}
                disabled={updatePasswordMutation.isPending}
              >
                {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}