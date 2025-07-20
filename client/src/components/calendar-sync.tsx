import { useState, useEffect } from "react";
import { Calendar, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CalendarSetupGuide } from "./calendar-setup-guide";

interface GoogleCalendar {
  id: string;
  name: string;
  primary: boolean;
  backgroundColor: string;
}

export function CalendarSync() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [syncDirection, setSyncDirection] = useState("bidirectional");
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState("");
  const { toast } = useToast();

  // Check for OAuth callback success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('calendar_connected') === 'true') {
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
      
      // Fetch connected calendars
      fetchConnectedCalendars();
      
      toast({
        title: "Google Calendar Connected",
        description: "Successfully authenticated with Google Calendar",
      });
    } else if (urlParams.get('error')) {
      const error = urlParams.get('error');
      window.history.replaceState({}, '', window.location.pathname);
      
      toast({
        title: "Connection Failed",
        description: `OAuth error: ${error}`,
        variant: "destructive"
      });
    }
  }, []);

  const fetchConnectedCalendars = async () => {
    try {
      const response = await apiRequest("GET", "/api/calendar/calendars");
      if (response.ok) {
        const data = await response.json();
        setCalendars(data.calendars || []);
        setIsConnected(data.calendars?.length > 0);
        
        const primaryCalendar = data.calendars?.find((cal: any) => cal.primary);
        if (primaryCalendar) {
          setSelectedCalendar(primaryCalendar.id);
        }
      }
    } catch (error) {
      console.error("Error fetching calendars:", error);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await apiRequest("POST", "/api/calendar/connect", {
        provider: "google"
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.requiresAuth && data.authUrl) {
          // Redirect to Google OAuth
          toast({
            title: "Redirecting to Google",
            description: "Opening Google sign-in window...",
          });
          
          // Open Google OAuth in new window or redirect
          window.location.href = data.authUrl;
        } else if (data.calendars?.length > 0) {
          // Already authenticated, show calendars
          setCalendars(data.calendars);
          const primaryCalendar = data.calendars.find((cal: any) => cal.primary);
          if (primaryCalendar) {
            setSelectedCalendar(primaryCalendar.id);
          }
          setIsConnected(true);
          
          toast({
            title: "Calendars Found",
            description: `Found ${data.calendars.length} calendar(s). Select which one to sync with.`
          });
        }
      }
    } catch (error) {
      console.error("Calendar connection error:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Calendar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await apiRequest("POST", "/api/calendar/disconnect");
      setIsConnected(false);
      setCalendars([]);
      setSelectedCalendar("");
      toast({
        title: "Calendar Disconnected",
        description: "Google Calendar sync has been disabled"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect calendar",
        variant: "destructive"
      });
    }
  };

  const handleSync = async () => {
    try {
      const response = await apiRequest("POST", "/api/calendar/sync", {
        calendarId: selectedCalendar,
        direction: syncDirection
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Sync Complete",
          description: `Synced ${data.eventCount} events successfully`
        });
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Sync your family events with Google Calendar to keep everything in one place
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Connect Your Google Calendar</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Import existing events and sync new ones automatically
            </p>
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Sign in with Google
                </>
              )}
            </Button>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-left">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                🔐 OAuth Authentication Process
              </h4>
              <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                <li>Click "Sign in with Google" above</li>
                <li>You'll be redirected to Google's secure login page</li>
                <li>Sign in with your Google account credentials</li>
                <li>Review and grant calendar access permissions</li>
                <li>You'll be redirected back with calendars connected</li>
              </ol>
            </div>
            
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-left">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Live Setup Required:</strong> This app needs Google Calendar API credentials. 
                Currently in demo mode - set GOOGLE_CLIENT_ID environment variable for live Google authentication.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Connected to Google Calendar
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="calendar-select">Select Calendar</Label>
                <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: calendar.backgroundColor }}
                          />
                          {calendar.name} {calendar.primary && "(Primary)"}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sync-direction">Sync Direction</Label>
                <Select value={syncDirection} onValueChange={setSyncDirection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="import">Import only (Google → Mom App)</SelectItem>
                    <SelectItem value="export">Export only (Mom App → Google)</SelectItem>
                    <SelectItem value="bidirectional">Two-way sync (Recommended)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-sync">Automatic sync</Label>
                <Switch
                  id="auto-sync"
                  checked={autoSync}
                  onCheckedChange={setAutoSync}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSync} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
              <Button onClick={handleDisconnect} variant="outline">
                Disconnect
              </Button>
            </div>

            {syncDirection === "bidirectional" && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Two-way sync enabled:</strong> Events created in The Mom App will appear in Google Calendar, 
                    and Google Calendar events will appear here. Changes made in either location will sync automatically.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!isConnected && <CalendarSetupGuide />}
      </CardContent>
    </Card>
  );
}