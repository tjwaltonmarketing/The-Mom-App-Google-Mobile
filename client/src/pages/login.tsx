import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Eye, EyeOff, Wifi, WifiOff, RefreshCw, Users } from "lucide-react";
import { testServerConnectivity, getNetworkInfo } from "@/lib/connectivity";
import logoPath from "@assets/The Mom app_20250607_125224_0000_1749573727197.png";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean;
    server: string;
    responseTime?: number;
    error?: string;
  } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Test server connectivity on mobile apps
  const testConnection = async () => {
    const networkInfo = getNetworkInfo();
    if (networkInfo.isMobile) {
      setIsTestingConnection(true);
      const result = await testServerConnectivity();
      setConnectionStatus({
        isConnected: result.success,
        server: result.server,
        responseTime: result.responseTime,
        error: result.error
      });
      setIsTestingConnection(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/login", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log("Login successful, user data:", data);
      
      // Set user data immediately and navigate
      if (data.user) {
        queryClient.setQueryData(["/api/auth/user"], data.user);
        
        // Navigate immediately
        setLocation("/");
        
        // Don't invalidate the query - let it refresh naturally on next request
        // This prevents the authentication state from flickering
      }
    },
    onError: (error: any) => {
      // Enhanced error reporting for mobile
      const networkInfo = getNetworkInfo();
      let errorMessage = error.message || "Invalid email or password";
      
      if (networkInfo.isMobile && error.message?.includes('Failed to fetch')) {
        errorMessage = `Connection failed to ${connectionStatus?.server || 'server'}. Please check your internet connection and try again.`;
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <img 
              src={logoPath} 
              alt="The Mom App Logo" 
              className="w-60 h-60 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription>
            Sign in to your family command center
          </CardDescription>
          
          {/* Mobile connection status */}
          {connectionStatus && (
            <div className="mt-2 space-y-2">
              <div className={`flex items-center justify-center gap-2 text-xs px-2 py-1 rounded ${
                connectionStatus.isConnected 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {connectionStatus.isConnected ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                <span>
                  {connectionStatus.isConnected 
                    ? `Connected (${connectionStatus.responseTime}ms)`
                    : connectionStatus.error || 'Connection failed'
                  }
                </span>
              </div>
              
              {!connectionStatus.isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testConnection}
                  disabled={isTestingConnection}
                  className="w-full text-xs"
                >
                  {isTestingConnection ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Test Connection
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Social Login Options */}
          <div className="flex gap-3 mb-6">
            <Button 
              type="button"
              variant="outline" 
              className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => window.location.href = "/api/login"}
            >
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
            
            <Button 
              type="button"
              variant="outline" 
              className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
              onClick={() => window.location.href = "/api/login"}
            >
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Apple
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* Traditional Email/Password Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Enter your email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Enter your password"
                          {...field} 
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 space-y-4">
            {/* Teen/Family Join Option */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                asChild
              >
                <Link href="/teen-login">
                  <Users className="w-4 h-4 mr-2" />
                  Teen Login
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                asChild
              >
                <Link href="/teen-onboarding-demo">
                  <Users className="w-4 h-4 mr-2" />
                  Join Family with Invite Code
                </Link>
              </Button>
            </div>

            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                <Link href="/forgot-password" className="text-pink-600 hover:text-pink-500 font-medium">
                  Forgot your password?
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/register" className="text-pink-600 hover:text-pink-500 font-medium">
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}