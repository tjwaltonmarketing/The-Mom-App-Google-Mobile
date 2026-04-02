import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { setAuthToken } from "@/lib/config";
import { Eye, EyeOff, Users, Crown, Check } from "lucide-react";
import logoPath from "@assets/The Mom app_20250607_125224_0000_1749573727197.png";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  familyName: z.string().optional(),
  phoneNumber: z.string().min(1, "Phone number is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

const plans = {
  individual: {
    name: "Individual",
    icon: Crown,
    monthly: "$5.99/mo",
    yearly: "$59.99/yr",
    description: "Perfect for one parent",
  },
  family: {
    name: "Family",
    icon: Users,
    monthly: "$9.99/mo",
    yearly: "$99.99/yr",
    description: "Share with your whole family",
  },
};

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"individual" | "family">("family");
  const [selectedInterval, setSelectedInterval] = useState<"monthly" | "yearly">("monthly");

  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const inviteCode = searchParams.get('inviteCode');
  const familyId = searchParams.get('familyId');
  const familyName = searchParams.get('familyName');
  const isJoiningFamily = !!inviteCode && !!familyId;

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      familyName: familyName || "",
      phoneNumber: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const { confirmPassword, ...registerData } = data;
      const payload = isJoiningFamily
        ? { ...registerData, inviteCode, familyId: parseInt(familyId!) }
        : { ...registerData, plan: selectedPlan, interval: selectedInterval };
      const response = await apiRequest("POST", "/api/register", payload);
      return await response.json();
    },
    onSuccess: (data: any) => {
      localStorage.removeItem('onboarding_completed');
      if (data.token) {
        setAuthToken(data.token);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      if (data.checkoutUrl && !isJoiningFamily) {
        // Redirect to Stripe Checkout for payment setup
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: isJoiningFamily ? "Welcome to the Family!" : "Account Created!",
          description: isJoiningFamily
            ? `You've joined ${familyName || 'the family'}!`
            : "Welcome to The Mom App!",
        });
        setLocation("/");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
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
            {isJoiningFamily ? `Join ${familyName}` : "Join The Mom App"}
          </CardTitle>
          <CardDescription>
            {isJoiningFamily
              ? "Create your account to join your family"
              : "14-day free trial · No charge until trial ends"}
          </CardDescription>
          {isJoiningFamily && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">
                You're joining <strong>{familyName}</strong> as a parent
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="e.g., +1 (555) 123-4567" {...field} />
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
                          placeholder="Create a password"
                          {...field}
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          {...field}
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isJoiningFamily && (
                <FormField
                  control={form.control}
                  name="familyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Family Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Smith Family" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Plan selector — only shown for new family creators */}
              {!isJoiningFamily && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Choose your plan</p>
                    <div className="flex bg-gray-100 rounded-full p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedInterval("monthly")}
                        className={`px-3 py-1 rounded-full transition-all ${selectedInterval === "monthly" ? "bg-white shadow text-pink-600 font-medium" : "text-gray-500"}`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedInterval("yearly")}
                        className={`px-3 py-1 rounded-full transition-all ${selectedInterval === "yearly" ? "bg-white shadow text-pink-600 font-medium" : "text-gray-500"}`}
                      >
                        Yearly <span className="text-green-600 font-medium">–17%</span>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(plans) as [("individual" | "family"), typeof plans.individual][]).map(([key, plan]) => {
                      const Icon = plan.icon;
                      const isSelected = selectedPlan === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedPlan(key)}
                          className={`relative p-3 rounded-xl border-2 text-left transition-all ${isSelected ? "border-pink-500 bg-pink-50" : "border-gray-200 bg-white hover:border-pink-200"}`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                          <Icon className={`h-4 w-4 mb-1.5 ${isSelected ? "text-pink-500" : "text-gray-400"}`} />
                          <p className={`text-sm font-semibold ${isSelected ? "text-pink-700" : "text-gray-700"}`}>{plan.name}</p>
                          <p className={`text-xs font-bold ${isSelected ? "text-pink-600" : "text-gray-500"}`}>
                            {selectedInterval === "monthly" ? plan.monthly : plan.yearly}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-center text-gray-400">
                    Free for 14 days · Cancel anytime · Billed after trial
                  </p>
                </div>
              )}

              <div className="flex items-start gap-3 py-2">
                <Checkbox
                  id="register-terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="register-terms" className="text-sm text-gray-700 leading-snug cursor-pointer">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" className="text-pink-500 underline hover:text-pink-600 font-medium">Terms of Service</a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" className="text-pink-500 underline hover:text-pink-600 font-medium">Privacy Policy</a>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending || !agreedToTerms}
              >
                {registerMutation.isPending
                  ? "Creating Account..."
                  : isJoiningFamily
                    ? "Join Family"
                    : "Start Free Trial"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-pink-600 hover:text-pink-500 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
