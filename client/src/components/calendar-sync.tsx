import { useState, useEffect } from "react";
import { Calendar, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface GoogleCalendar {
  id: string;
  name: string;
  primary: boolean;
  backgroundColor: string;
}

export function CalendarSync() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchConnectedCalendars();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('calendar_connected') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      toast({
        title: "Google Calendar Connected",
        description: "Successfully connected to Google Calendar",
      });
    } else if (urlParams.get('error')) {
      const error = urlParams.get('error');
      window.history.replaceState({}, '', window.location.pathname);
      toast({
        title: "Connection Failed",
        description: error === 'oauth_failed' ? "Authentication failed. Please try again." : `Error: ${error}`,
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
        const primary = data.calendars?.find((cal: any) => cal.primary);
        if (primary) setSelectedCalendar(primary.id);
      }
    } catch (error) {
      console.error("Error fetching calendars:", error);
    }
  };

  const handleConnect = () => {
    setIsConnecting(true);
    window.location.href = '/api/calendar/connect';
  };

  const handleDisconnect = async () => {
    try {
      await apiRequest("POST", "/api/calendar/disconnect");
      setIsConnected(false);
      setCalendars([]);
      setSelectedCalendar("");
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const response = await apiRequest("POST", "/api/calendar/import", {
        calendarId: selectedCalendar,
        daysToImport: 365
      });
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Import Complete",
          description: `Imported ${data.imported} of ${data.total} events from Google Calendar`
        });
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import events. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Import events from your Google Calendar into The Mom App
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Connect Your Google Calendar</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sign in with Google to import your existing calendar events
            </p>
            <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Connected to Google Calendar
              </span>
            </div>

            <div>
              <Label htmlFor="calendar-select">Select Calendar to Import</Label>
              <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                <SelectTrigger className="mt-1">
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

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={isImporting || !selectedCalendar} className="flex-1">
                {isImporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Import Events
                  </>
                )}
              </Button>
              <Button onClick={handleDisconnect} variant="outline">
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
