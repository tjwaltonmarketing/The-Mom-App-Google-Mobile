import { useState } from "react";
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

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Simulate Google OAuth flow
      const response = await apiRequest("POST", "/api/calendar/connect", {
        provider: "google"
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsConnected(true);
        setCalendars(data.calendars || []);
        if (data.calendars?.length > 0) {
          setSelectedCalendar(data.calendars[0].id);
        }
        toast({
          title: "Calendar Connected",
          description: "Successfully connected to Google Calendar"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Please check your Google account permissions",
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
                  Connect Google Calendar
                </>
              )}
            </Button>
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