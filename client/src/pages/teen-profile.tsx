import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  Camera,
  User,
  Upload,
  X,
  Moon,
  Sun,
  Eye,
  BookOpen,
  LogOut
} from "lucide-react";

export default function TeenProfile() {
  const [, setLocation] = useLocation();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [blueLight, setBlueLight] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get teen profile data
  const { data: authData, isLoading, error } = useQuery({
    queryKey: ["/api/teen/auth/user"],
    retry: false,
  });

  // Extract teen profile from auth response
  const teenProfile = (authData as any)?.isAuthenticated ? (authData as any).teenProfile : null;

  // Debug authentication state
  useEffect(() => {
    console.log("Teen auth state:", { authData, teenProfile, isLoading, error });
  }, [authData, teenProfile, isLoading, error]);



  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const response = await apiRequest("PUT", "/api/teen/profile", profileData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teen/auth/user"] });
      toast({
        title: "Profile Updated!",
        description: "Your profile changes have been saved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/teen/logout", {});
      return response;
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out",
      });
      // Navigate back to login
      setLocation("/teen-login");
    },
    onError: (error: any) => {
      toast({
        title: "Sign Out Failed",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarPreview) return;
    
    // Check authentication before upload
    if (!authData || !(authData as any)?.isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to update your profile picture.",
        variant: "destructive",
      });
      setLocation("/teen-login");
      return;
    }
    
    setIsUploading(true);
    try {
      // In a real app, you'd upload to a file storage service
      // For now, we'll simulate saving the base64 data
      await updateProfileMutation.mutateAsync({
        avatar: avatarPreview
      });
      
      // Clear preview first
      setAvatarPreview(null);
      
      // Force refresh the teen profile data to show updated avatar
      await queryClient.invalidateQueries({ queryKey: ["/api/teen/auth/user"] });
      
      toast({
        title: "Avatar Updated!",
        description: "Your profile picture has been changed",
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile picture. Please try again.";
      toast({
        title: "Upload Failed", 
        description: errorMessage,
        variant: "destructive",
      });
      
      // If authentication error, redirect to login
      if (errorMessage.includes("Not authenticated") || errorMessage.includes("401")) {
        setLocation("/teen-login");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const removeAvatarPreview = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const revertToInitial = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        avatar: null // Remove custom avatar, revert to initial
      });
      
      toast({
        title: "Avatar Reset",
        description: "Reverted to your initial profile picture",
      });
    } catch (error) {
      console.error("Avatar revert error:", error);
    }
  };

  // Show login button if not authenticated or no teen profile
  if (!isLoading && (!authData || !(authData as any)?.isAuthenticated || !teenProfile)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              You need to be logged in to access your profile.
            </p>
            <Button variant="default" onClick={() => setLocation("/teen-login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/teen-dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Profile Settings</h1>
              <p className="text-sm text-gray-600">Customize your profile and preferences</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          
          {/* Profile Picture Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                
                {/* Current Avatar Display */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    {avatarPreview ? (
                      <img 
                        src={avatarPreview} 
                        alt="Avatar preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                      />
                    ) : teenProfile?.avatar ? (
                      <img 
                        src={teenProfile.avatar} 
                        alt="Current avatar"
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                      />
                    ) : (
                      <div 
                        className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-semibold border-4 border-gray-200"
                        style={{ backgroundColor: teenProfile?.favoriteColor || "#a855f7" }}
                      >
                        {teenProfile?.firstName?.charAt(0) || "A"}
                      </div>
                    )}
                    
                    {avatarPreview && (
                      <button
                        onClick={removeAvatarPreview}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium">{teenProfile?.firstName} {teenProfile?.lastName}</p>
                    <p className="text-xs text-gray-500">@{teenProfile?.username}</p>
                  </div>
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-4">
                  <div>
                    <Label>Change Profile Picture</Label>
                    <p className="text-sm text-gray-600 mb-3">
                      Upload a new photo to personalize your profile. JPG, PNG, or GIF up to 5MB.
                    </p>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Photo
                      </Button>
                      
                      {avatarPreview && (
                        <Button
                          onClick={handleAvatarUpload}
                          disabled={isUploading}
                        >
                          {isUploading ? "Uploading..." : "Save New Photo"}
                        </Button>
                      )}
                      
                      {teenProfile?.avatar && (
                        <Button
                          variant="outline"
                          onClick={revertToInitial}
                          disabled={isUploading || updateProfileMutation.isPending}
                        >
                          Reset to Initial
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Tip:</strong> Choose a clear photo where your face is visible. 
                      This helps family members recognize you in the app!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Info Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input value={teenProfile?.firstName || ""} disabled />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={teenProfile?.lastName || ""} disabled />
                </div>
                <div>
                  <Label>Username</Label>
                  <Input value={teenProfile?.username || ""} disabled />
                </div>
                <div>
                  <Label>Family</Label>
                  <Input value={teenProfile?.family?.name || ""} disabled />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Contact your family admin to update basic information.
              </p>
            </CardContent>
          </Card>

          {/* Theme Preferences Section */}
          <Card>
            <CardHeader>
              <CardTitle>Theme & Display</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                
                {/* Color Theme */}
                <div className="space-y-3">
                  <Label>Choose your favorite color for the interface</Label>
                  <div className="flex gap-3">
                    {[
                      { name: "Purple", value: "#a855f7" },
                      { name: "Blue", value: "#3b82f6" },
                      { name: "Green", value: "#22c55e" },
                      { name: "Pink", value: "#ec4899" },
                      { name: "Orange", value: "#f97316" },
                      { name: "Red", value: "#ef4444" }
                    ].map((color) => (
                      <button
                        key={color.name}
                        onClick={() => updateProfileMutation.mutate({ favoriteColor: color.value })}
                        className={`w-10 h-10 rounded-full border-2 hover:scale-110 transition-transform ${
                          teenProfile?.favoriteColor === color.value 
                            ? "border-gray-800 shadow-lg" 
                            : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Dark Mode */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </div>
                    <div>
                      <Label className="text-base font-medium">Dark Mode</Label>
                      <p className="text-sm text-gray-600">
                        Easy on the eyes, especially at night
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={darkMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDarkMode(!darkMode);
                      // In a real app, you'd save this preference
                      document.documentElement.classList.toggle('dark', !darkMode);
                    }}
                  >
                    {darkMode ? "On" : "Off"}
                  </Button>
                </div>

                {/* Blue Light Filter */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Eye className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <Label className="text-base font-medium">Blue Light Filter</Label>
                      <p className="text-sm text-gray-600">
                        Reduces blue light for better sleep
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={blueLight ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setBlueLight(!blueLight);
                      // Apply blue light filter CSS
                      const filter = blueLight ? 'none' : 'sepia(10%) saturate(120%) hue-rotate(15deg)';
                      document.documentElement.style.filter = filter;
                    }}
                  >
                    {blueLight ? "On" : "Off"}
                  </Button>
                </div>

                <div className="bg-amber-50 p-3 rounded-lg">
                  <p className="text-sm text-amber-700">
                    <strong>Tip:</strong> Blue light filter is great for evening use. 
                    It helps reduce eye strain and may improve sleep quality.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tutorial Section */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  New to the app or want to learn about all the cool features? 
                  Check out our kid-friendly tutorial!
                </p>
                
                <Button 
                  onClick={() => setLocation("/teen-tutorial")}
                  className="w-full"
                  variant="outline"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Interactive Tutorial
                </Button>
                
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm text-purple-700">
                    <strong>Quick Tour:</strong> Learn how to use dark mode, 
                    notifications, calendar, points system, and more in just a few minutes!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Section */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Need to sign out? You can always sign back in with your username and password.
                </p>
                
                <Button 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {logoutMutation.isPending ? "Signing Out..." : "Sign Out"}
                </Button>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Tip:</strong> Your data is always safe! Signing out just removes your session from this device.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}