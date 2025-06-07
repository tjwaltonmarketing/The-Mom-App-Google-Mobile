import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ExternalLink } from "lucide-react";

export function CalendarSetupGuide() {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">How to Set Up Google Calendar Sync</CardTitle>
        <CardDescription>
          Follow these steps to connect your Google Calendar (one-time setup)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium mt-0.5">
              1
            </div>
            <div>
              <p className="font-medium">Click "Connect Google Calendar"</p>
              <p className="text-sm text-muted-foreground">You'll be redirected to Google's secure login page</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium mt-0.5">
              2
            </div>
            <div>
              <p className="font-medium">Sign in to your Google account</p>
              <p className="text-sm text-muted-foreground">Use the same account that has your family calendar</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium mt-0.5">
              3
            </div>
            <div>
              <p className="font-medium">Grant calendar permissions</p>
              <p className="text-sm text-muted-foreground">Allow The Mom App to read and write your calendar events</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium mt-0.5">
              4
            </div>
            <div>
              <p className="font-medium">Choose your sync preferences</p>
              <p className="text-sm text-muted-foreground">Select which calendar to sync and whether you want two-way sync</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-700 dark:text-blue-300">What gets synced:</span>
          </div>
          <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
            <li>• Family events and appointments</li>
            <li>• Kids' activities and school events</li>
            <li>• Medical appointments and reminders</li>
            <li>• Tasks with due dates</li>
          </ul>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">Secure</Badge>
          <span>Your calendar data is encrypted and never shared with third parties</span>
        </div>
      </CardContent>
    </Card>
  );
}