import { useState, useEffect, useRef, useCallback } from "react";
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
import { SplashScreen } from "@/components/splash-screen";

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
  const [showSplash, setShowSplash] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [gsiLoaded, setGsiLoaded] = useState(false);

  // Force light mode on login page
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'blue-light-filter');
    localStorage.setItem('mom-app-theme', 'light');
  }, []);

  // Fetch Google Client ID
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/config/google-client-id")
      .then(res => res.json())
      .then(data => {
        if (data?.clientId) setGoogleClientId(data.clientId);
      })
      .catch(() => {});
  }, []);

  // Google Sign-In mutation
  const googleLoginMutation = useMutation({
    mutationFn: async (credential: string) => {
      const response = await apiRequest("POST", "/api/auth/google", { credential });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      if (data.user) {
        queryClient.setQueryData(["/api/auth/user"], data.user);
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        setShowSplash(true);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Google Sign-In Failed",
        description: error.message || "Could not sign in with Google. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGoogleCallback = useCallback((response: any) => {
    if (response.credential) {
      googleLoginMutation.mutate(response.credential);
    }
  }, [googleLoginMutation]);

  // Load Google Identity Services script and render button
  useEffect(() => {
    if (!googleClientId) return;

    if (window.google?.accounts?.id) {
      setGsiLoaded(true);
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCallback,
      });
      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: googleButtonRef.current.offsetWidth,
          text: 'signin_with',
          shape: 'rectangular',
        });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGsiLoaded(true);
      if (window.google && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCallback,
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: googleButtonRef.current.offsetWidth,
          text: 'signin_with',
          shape: 'rectangular',
        });
      }
    };
    script.onerror = () => {
      setGsiLoaded(false);
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [googleClientId, handleGoogleCallback]);

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
      
      // Set user data immediately and show splash screen
      if (data.user) {
        queryClient.setQueryData(["/api/auth/user"], data.user);
        
        // Invalidate subscription query to force refetch with new auth
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        
        // Show splash screen while app loads
        setShowSplash(true);
        setIsLoggingIn(false);
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

  // Show splash screen after successful login
  if (showSplash) {
    return (
      <SplashScreen 
        isLoading={false} 
        onComplete={() => setLocation("/")} 
      />
    );
  }

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
          {/* Google Sign-In - hidden until Google OAuth origins are configured
          {googleClientId && (
            <>
              <div ref={googleButtonRef} className={`w-full mb-4 ${gsiLoaded ? '' : 'hidden'}`} />
              {!gsiLoaded && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mb-4 h-11 gap-3 font-medium text-sm border-gray-300 hover:bg-gray-50"
                  disabled={googleLoginMutation.isPending}
                  onClick={() => {
                    if (window.google?.accounts?.id) {
                      window.google.accounts.id.prompt();
                    } else {
                      toast({
                        title: "Google Sign-In",
                        description: "Google Sign-In works on the published app and mobile devices. Please use email login here.",
                      });
                    }
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
                    <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957A8.996 8.996 0 000 9.002a8.996 8.996 0 00.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.48 0 2.438 2.017.956 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
                  </svg>
                  {googleLoginMutation.isPending ? "Signing in..." : "Sign in with Google"}
                </Button>
              )}
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or sign in with email</span>
                </div>
              </div>
            </>
          )}
          */}
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
                <Link href="/teen-join">
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
          <h2 className="text-4xl font-bold text-gray-800 mb-1">Mom Life.</h2>
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