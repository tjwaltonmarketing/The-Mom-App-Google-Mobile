import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Phone, MessageCircle } from "lucide-react";

export default function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Forgot Your Password?</CardTitle>
          <CardDescription>
            Contact your family admin for password assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Parents */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Parents</h3>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              As the family admin, you can reset anyone's password including your own through the Family Settings.
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Go to <strong>Settings → Family Members</strong> and click "Reset Password" next to any family member.
            </p>
          </div>

          {/* Teens */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">Teens & Family Members</h3>
            </div>
            <p className="text-sm text-purple-800 dark:text-purple-200">
              Ask your parent to reset your password. They can do this instantly from the Family Settings in their app.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href="/login">
              <Button className="w-full" size="lg">
                Back to Parent Login
              </Button>
            </Link>
            
            <Link href="/teen-login">
              <Button variant="outline" className="w-full" size="lg">
                Back to Teen Login
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <Button 
              variant="link" 
              className="p-0 text-sm"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}