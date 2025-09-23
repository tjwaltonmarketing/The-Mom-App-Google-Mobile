import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, ArrowLeft, Smartphone, Eye, EyeOff, HelpCircle } from "lucide-react";

export default function TeenLogin() {
  const [loginMethod, setLoginMethod] = useState<"invite" | "credentials">("invite");
  const [inviteCode, setInviteCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();



  const inviteLoginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/teen/login-with-invite", { 
        inviteCode: inviteCode.toUpperCase() 
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.needsSetup) {
        if (typeof window !== 'undefined') {
          window.location.href = '/teen-onboarding';
        } else {
          setLocation("/teen-onboarding");
        }
      } else {
        if (typeof window !== 'undefined') {
          window.location.href = '/teen-dashboard';
        } else {
          setLocation("/teen-dashboard");
        }
      }
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.teenProfile.firstName}`,
      });
    },
    onError: () => {
      toast({
        title: "Login Failed",
        description: "Invalid invite code or code has expired",
        variant: "destructive",
      });
    },
  });

  const credentialsLoginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/teen/login", { 
        username, 
        password 
      });
      return response.json();
    },
    onSuccess: async () => {
      console.log("Login successful, refreshing auth state...");
      
      // Force refetch teen auth data first
      await queryClient.refetchQueries({ queryKey: ["/api/teen/auth/user"] });
      
      // Wait for auth state to settle
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log("Auth state refreshed, navigating to dashboard...");
      
      // Use window.location for more reliable navigation in mobile
      if (typeof window !== 'undefined') {
        window.location.href = '/teen-dashboard';
      } else {
        setLocation("/teen-dashboard");
      }
      
      toast({
        title: "Welcome back!",
        description: "Successfully logged in",
      });
    },
    onError: () => {
      toast({
        title: "Login Failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const handleInviteLogin = () => {
    if (!inviteCode) return;
    inviteLoginMutation.mutate();
  };

  const handleCredentialsLogin = () => {
    if (!username || !password) return;
    credentialsLoginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Teen Login</h1>
          <p className="text-gray-600 mt-2">Access your family coordination hub</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Welcome Back!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Login Method Selector */}
            <div className="flex gap-2">
              <Button
                variant={loginMethod === "invite" ? "default" : "outline"}
                onClick={() => setLoginMethod("invite")}
                className="flex-1"
                size="sm"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Invite Code
              </Button>
              <Button
                variant={loginMethod === "credentials" ? "default" : "outline"}
                onClick={() => setLoginMethod("credentials")}
                className="flex-1"
                size="sm"
              >
                Username
              </Button>
            </div>

            {loginMethod === "invite" ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Use the same invite code your parents sent you
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="inviteCode">Family Invite Code</Label>
                  <Input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Enter your invite code"
                    className="text-center font-mono text-lg"
                  />
                </div>

                <Button
                  onClick={handleInviteLogin}
                  disabled={!inviteCode || inviteLoginMutation.isPending}
                  className="w-full"
                >
                  {inviteLoginMutation.isPending ? "Logging in..." : "Login with Invite Code"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Use your username and password
                  </p>
                </div>

                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleCredentialsLogin}
                  disabled={!username || !password || credentialsLoginMutation.isPending}
                  className="w-full"
                >
                  {credentialsLoginMutation.isPending ? "Logging in..." : "Login"}
                </Button>

                <div className="text-center">
                  <Button 
                    variant="link" 
                    onClick={() => setLocation("/forgot-password")}
                    className="p-0 h-auto text-sm"
                  >
                    <HelpCircle className="h-3 w-3 mr-1" />
                    Forgot Password?
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account yet?
                </p>
                <Button 
                  variant="link" 
                  onClick={() => setLocation("/teen-onboarding-demo")}
                  className="p-0 h-auto"
                >
                  Get an invite code from your parents
                </Button>
              </div>

              <div className="text-center">
                <Button 
                  variant="ghost" 
                  onClick={() => setLocation("/login")}
                  className="text-sm"
                  size="sm"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Parent Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}