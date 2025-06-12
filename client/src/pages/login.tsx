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
import { Eye, EyeOff, Wifi, WifiOff, RefreshCw } from "lucide-react";
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
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
      
      // Store token in localStorage for mobile compatibility
      if (data.token && typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('auth_token', data.token);
      }
      
      // Set the user data immediately and invalidate to trigger re-fetch
      queryClient.setQueryData(["/api/auth/user"], data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Navigate to dashboard
      setLocation("/");
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

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/register" className="text-pink-600 hover:text-pink-500 font-medium">
                Create one
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}