import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Mail, Smartphone, Shield, Eye, EyeOff, CheckCircle } from "lucide-react";

const parentResetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const smsCodeSchema = z.object({
  code: z.string().length(6, "Please enter the 6-digit code"),
});

const newPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ParentResetData = z.infer<typeof parentResetSchema>;
type SmsCodeData = z.infer<typeof smsCodeSchema>;
type NewPasswordData = z.infer<typeof newPasswordSchema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentFlow, setCurrentFlow] = useState<"initial" | "sms_sent" | "new_password">("initial");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const parentForm = useForm<ParentResetData>({
    resolver: zodResolver(parentResetSchema),
    defaultValues: { email: "" },
  });

  const smsForm = useForm<SmsCodeData>({
    resolver: zodResolver(smsCodeSchema),
    defaultValues: { code: "" },
  });

  const passwordForm = useForm<NewPasswordData>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  // Request password reset
  const requestResetMutation = useMutation({
    mutationFn: async (data: ParentResetData) => {
      const response = await apiRequest("POST", "/api/auth/request-password-reset", data);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentFlow("sms_sent");
      toast({
        title: "SMS Sent",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process reset request",
        variant: "destructive",
      });
    },
  });

  // Verify SMS code
  const verifySmsCodeMutation = useMutation({
    mutationFn: async (data: SmsCodeData) => {
      // Just verify the code exists and is valid, don't reset password yet
      const response = await apiRequest("POST", "/api/auth/verify-sms-code", {
        token: data.code,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setResetToken(data.token || smsForm.getValues().code);
      setCurrentFlow("new_password");
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Code",
        description: error.message || "Please check your code and try again",
        variant: "destructive",
      });
    },
  });


  // Set new password
  const setNewPasswordMutation = useMutation({
    mutationFn: async (data: NewPasswordData) => {
      const response = await apiRequest("POST", "/api/auth/reset-password", {
        token: smsForm.getValues().code,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Reset Successful",
        description: "You can now log in with your new password.",
      });
      setLocation("/login");
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const onParentSubmit = (data: ParentResetData) => {
    requestResetMutation.mutate(data);
  };

  const onSmsSubmit = (data: SmsCodeData) => {
    verifySmsCodeMutation.mutate(data);
  };

  const onPasswordSubmit = (data: NewPasswordData) => {
    setNewPasswordMutation.mutate(data);
  };

  // Show success state after password reset
  if (currentFlow === "new_password" && setNewPasswordMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl">Password Reset Complete</CardTitle>
            <CardDescription>
              Your password has been successfully reset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">
                Continue to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SMS code verification step
  if (currentFlow === "sms_sent") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl">Enter SMS Code</CardTitle>
            <CardDescription>
              We've sent a 6-digit code to your phone. Enter it below to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={smsForm.handleSubmit(onSmsSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">6-Digit Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  className="text-center font-mono text-lg"
                  {...smsForm.register("code")}
                  disabled={verifySmsCodeMutation.isPending}
                />
                {smsForm.formState.errors.code && (
                  <p className="text-sm text-destructive">
                    {smsForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={verifySmsCodeMutation.isPending}
              >
                {verifySmsCodeMutation.isPending ? "Verifying..." : "Continue"}
              </Button>

              <div className="text-center">
                <Button 
                  variant="link" 
                  className="p-0"
                  onClick={() => setCurrentFlow("initial")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }


  // New password step
  if (currentFlow === "new_password") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Set New Password</CardTitle>
            <CardDescription>
              Choose a strong password for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    {...passwordForm.register("newPassword")}
                    disabled={setNewPasswordMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    {...passwordForm.register("confirmPassword")}
                    disabled={setNewPasswordMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={setNewPasswordMutation.isPending}
              >
                {setNewPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Initial flow - choose between parent or teen reset
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Choose how you'd like to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email address and we'll send a reset code to the phone number on your account
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Teen Password Reset:</strong> If you're a teen, ask your parent to reset your password from Family Settings → Family Members.
                </p>
              </div>
            </div>
            
            <form onSubmit={parentForm.handleSubmit(onParentSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  {...parentForm.register("email")}
                  disabled={requestResetMutation.isPending}
                />
                {parentForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {parentForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={requestResetMutation.isPending}
              >
                {requestResetMutation.isPending ? "Sending..." : "Send SMS Code"}
              </Button>
            </form>
            
            <div className="text-center mt-6">
              <Link href="/login">
                <Button variant="link" className="p-0">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}