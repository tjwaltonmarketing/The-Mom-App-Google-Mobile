import { useState } from "react";
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
import { Eye, EyeOff, RefreshCw, Users } from "lucide-react";
import logoPath from "@assets/The_Mom_app_(5)_1766014062224.png";
import beforeAfterPath from "@assets/The_Mom_app_(4)_1766014201419.png";

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

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });


  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/login", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log("Login successful, user data:", data);
      
      // Store JWT token for cross-domain authentication
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      
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
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-pink-100 to-rose-50 p-4">
      <div className="flex w-full max-w-5xl items-center gap-8">
        {/* Login Card - Left Side */}
        <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center -mb-8">
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
          
        </CardHeader>
        <CardContent>
          {/* Social login options hidden - can be restored later when needed */}
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
      
      {/* Before/After Image - Right Side (hidden on mobile) */}
      <div className="hidden lg:flex flex-col flex-1 max-w-lg text-center">
        {/* Marketing Text */}
        <div className="mb-6">
          <p className="text-gray-600 text-sm mb-2">✨ AI-Powered Family Organizer</p>
          <h2 className="text-4xl font-bold italic text-gray-800 mb-1">Mom Life.</h2>
          <h2 className="text-4xl font-bold text-pink-500">Made Easy.</h2>
          <p className="text-gray-600 mt-4 text-sm leading-relaxed">
            Reduce your mental load with AI voice assistance. Manage your family's 
            calendar, tasks, meals, notes, passwords, dishwasher status, and more — 
            all in one place.
          </p>
        </div>
        
        {/* Before/After Image */}
        <img 
          src={beforeAfterPath} 
          alt="Before and After using The Mom App" 
          className="w-full h-auto rounded-2xl shadow-2xl"
        />
      </div>
      </div>
    </div>
  );
}