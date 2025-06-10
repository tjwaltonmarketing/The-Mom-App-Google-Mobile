import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatTimeInUserTimezone } from "@/lib/timezone";
import type { Notification } from "@shared/schema";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications/pending"],
  });

  const pendingNotifications = notifications.filter(n => !n.sentAt);
  const unreadCount = pendingNotifications.length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "event_reminder":
        return "📅";
      case "task_due":
        return "✅";
      case "task_assigned":
        return "📋";
      default:
        return "🔔";
    }
  };

  const getTimeUntilEvent = (scheduledFor: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledFor);
    const diffMs = scheduled.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Now";
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `in ${diffHours}h ${diffMinutes}m`;
    } else {
      return `in ${diffMinutes}m`;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell size={20} />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Notifications</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {pendingNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No pending notifications
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {pendingNotifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className="p-3 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {getTimeUntilEvent(notification.scheduledFor)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTimeInUserTimezone(new Date(notification.scheduledFor))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}