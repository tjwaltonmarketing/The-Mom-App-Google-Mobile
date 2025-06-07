import { useState } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Smartphone, Heart, Clock, Bell, Palette, User } from "lucide-react";

export default function SettingsPage() {
  const [mindfulUsageEnabled, setMindfulUsageEnabled] = useState(true);
  const [reminderInterval, setReminderInterval] = useState("20");
  const [breakDuration, setBreakDuration] = useState([5]);
  const [dailyLimit, setDailyLimit] = useState([120]);
  const [notifications, setNotifications] = useState(true);

  const handleSaveSettings = () => {
    // Save settings to localStorage or send to API
    localStorage.setItem('mindfulUsageSettings', JSON.stringify({
      enabled: mindfulUsageEnabled,
      reminderInterval: parseInt(reminderInterval),
      breakDuration: breakDuration[0],
      dailyLimit: dailyLimit[0],
      notifications
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onStartVoiceNote={() => {}} />
      
      <main className="max-w-4xl mx-auto px-4 py-6 mb-20 md:mb-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Customize your family coordination experience</p>
        </div>

        <div className="space-y-6">
          {/* Mindful Usage Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Mindful Usage
              </CardTitle>
              <CardDescription>
                Gentle reminders to take breaks and maintain healthy app usage habits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="mindful-usage">Enable mindful usage reminders</Label>
                <Switch
                  id="mindful-usage"
                  checked={mindfulUsageEnabled}
                  onCheckedChange={setMindfulUsageEnabled}
                />
              </div>

              {mindfulUsageEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label>Reminder interval</Label>
                    <Select value={reminderInterval} onValueChange={setReminderInterval}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">Every 10 minutes</SelectItem>
                        <SelectItem value="15">Every 15 minutes</SelectItem>
                        <SelectItem value="20">Every 20 minutes</SelectItem>
                        <SelectItem value="30">Every 30 minutes</SelectItem>
                        <SelectItem value="45">Every 45 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Suggested break duration: {breakDuration[0]} minutes</Label>
                    <Slider
                      value={breakDuration}
                      onValueChange={setBreakDuration}
                      max={15}
                      min={2}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Daily usage goal: {dailyLimit[0]} minutes</Label>
                    <Slider
                      value={dailyLimit}
                      onValueChange={setDailyLimit}
                      max={300}
                      min={30}
                      step={15}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>
                Manage your notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Push notifications</Label>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* App Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how the app looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 border rounded-lg cursor-pointer hover:border-primary">
                  <div className="w-full h-8 bg-white border rounded mb-2"></div>
                  <span className="text-sm">Light</span>
                </div>
                <div className="text-center p-3 border rounded-lg cursor-pointer hover:border-primary">
                  <div className="w-full h-8 bg-gray-900 rounded mb-2"></div>
                  <span className="text-sm">Dark</span>
                </div>
                <div className="text-center p-3 border border-primary rounded-lg">
                  <div className="w-full h-8 bg-gradient-to-r from-orange-100 to-yellow-100 rounded mb-2"></div>
                  <span className="text-sm">Blue Light</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Account
              </CardTitle>
              <CardDescription>
                Manage your account and family settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                Family Member Management
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Data Export
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Privacy Settings
              </Button>
            </CardContent>
          </Card>

          <Button onClick={handleSaveSettings} className="w-full">
            Save Settings
          </Button>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}