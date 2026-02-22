import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

export default function DeleteAccount() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "DELETE MY ACCOUNT") {
      toast({
        title: "Confirmation Required",
        description: "Please type DELETE MY ACCOUNT exactly to confirm.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await apiRequest("DELETE", "/api/auth/account", { confirmText });
      setDeleted(true);
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (deleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4 flex items-center justify-center">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Account Deleted</h2>
            <p className="text-gray-600">
              Your account and all associated data have been permanently removed from our systems.
              Thank you for using The Mom App.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 mb-6">
          <ArrowLeft size={16} />
          Back to App
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
              Account Deletion
            </CardTitle>
            <p className="text-center text-gray-600">The Mom App — Account & Data Deletion Request</p>
          </CardHeader>
          <CardContent className="prose prose-lg max-w-none">
            <h2>How to Delete Your Account</h2>
            <p>
              We respect your right to control your personal data. You can request permanent deletion of your
              account and all associated data at any time. Please read the information below carefully before proceeding.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-amber-800 font-semibold mt-0">This action is permanent and cannot be undone</h3>
                  <p className="text-amber-700 mb-0">
                    Once your account is deleted, all data will be permanently removed from our systems
                    within 30 days.
                  </p>
                </div>
              </div>
            </div>

            <h2>What Data Will Be Deleted</h2>
            <p>When you delete your account, the following data will be permanently removed:</p>
            <ul>
              <li><strong>Account Information:</strong> Your name, email address, username, and password</li>
              <li><strong>Family Data:</strong> Family member profiles, roles, and relationships</li>
              <li><strong>Calendar Events:</strong> All events, appointments, and scheduling data</li>
              <li><strong>Tasks:</strong> All tasks, assignments, and completion history</li>
              <li><strong>Voice Notes:</strong> All audio recordings and transcriptions</li>
              <li><strong>Password Vault:</strong> All stored login credentials</li>
              <li><strong>Meal Plans:</strong> All meal planning and grocery list data</li>
              <li><strong>Notes:</strong> All personal and shared notes</li>
              <li><strong>Subscription Data:</strong> Billing history and subscription status</li>
              <li><strong>Push Notification Tokens:</strong> Device registration data</li>
              <li><strong>Teen Accounts:</strong> All linked teen profiles and their data</li>
            </ul>

            <h2>What Happens to Shared Data</h2>
            <p>
              If you are a family admin, deleting your account will remove the entire family group and all
              associated data for all members. Family members will be notified and their access will be revoked.
            </p>

            <h2>Subscription Cancellation</h2>
            <p>
              If you have an active subscription, it will be automatically cancelled upon account deletion.
              No further charges will be made. Note that refunds for the current billing period are not
              provided upon voluntary deletion.
            </p>

            <h2>Data Retention</h2>
            <p>
              After you request deletion, your data will be permanently removed from our active systems immediately.
              Backup copies may persist for up to 30 days before being fully purged. We do not retain any personal
              data after this period.
            </p>

            <h2>Alternative: Export Your Data</h2>
            <p>
              Before deleting your account, you may want to export your data. You can do this from
              the Settings page within the app under "Export Data."
            </p>

            <hr className="my-8" />

            {isAuthenticated ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 my-6">
                <h3 className="text-red-800 font-bold mt-0">Delete Your Account</h3>
                <p className="text-red-700">
                  You are currently signed in as <strong>{user?.email}</strong>.
                  To permanently delete your account and all associated data, type
                  <strong> DELETE MY ACCOUNT</strong> below and click the button.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="confirm" className="text-red-800 font-medium">
                      Type "DELETE MY ACCOUNT" to confirm
                    </Label>
                    <Input
                      id="confirm"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE MY ACCOUNT"
                      className="mt-2 border-red-300 focus:border-red-500"
                    />
                  </div>
                  <Button
                    onClick={handleDelete}
                    disabled={confirmText !== "DELETE MY ACCOUNT" || isDeleting}
                    variant="destructive"
                    className="w-full"
                  >
                    {isDeleting ? "Deleting..." : "Permanently Delete My Account"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 my-6">
                <h3 className="text-gray-800 font-bold mt-0">Sign In to Delete Your Account</h3>
                <p className="text-gray-600">
                  To delete your account, please sign in first. You can delete your account from this page
                  or from the Settings page within the app.
                </p>
                <Link href="/login">
                  <Button className="bg-pink-600 hover:bg-pink-700">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}

            <h2>Contact Us</h2>
            <p>
              If you have questions about account deletion or need assistance, please contact us at:
            </p>
            <ul>
              <li><strong>Email:</strong> themomapp.us@gmail.com</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
