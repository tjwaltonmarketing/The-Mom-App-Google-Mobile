import { useState } from "react";
import { Bell, Phone, Mail, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NotificationDemo {
  id: number;
  type: "sms" | "email";
  recipient: string;
  message: string;
  taskTitle: string;
  timestamp: string;
}

export function NotificationDemo() {
  const [notifications, setNotifications] = useState<NotificationDemo[]>([
    {
      id: 1,
      type: "sms",
      recipient: "Dad",
      message: "You've been assigned: Pick up Sam from soccer practice",
      taskTitle: "Pick up Sam from soccer practice",
      timestamp: "2 min ago"
    },
    {
      id: 2,
      type: "email",
      recipient: "Emma",
      message: "You've been assigned: Complete science project",
      taskTitle: "Complete science project",
      timestamp: "5 min ago"
    }
  ]);

  const [showDemo, setShowDemo] = useState(true);

  const simulateNewNotification = () => {
    const newNotification: NotificationDemo = {
      id: Date.now(),
      type: Math.random() > 0.5 ? "sms" : "email",
      recipient: "Sam",
      message: "You've been assigned: Clean your room",
      taskTitle: "Clean your room",
      timestamp: "Just now"
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  const dismissNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (!showDemo) return null;

  return (
    <Card className="bg-blue-50 dark:bg-blue-950 blue-light-filter:bg-amber-50 border-blue-200 dark:border-blue-800 blue-light-filter:border-amber-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="text-blue-600 dark:text-blue-400 blue-light-filter:text-amber-600" size={20} />
            <CardTitle className="text-lg text-blue-800 dark:text-blue-200 blue-light-filter:text-amber-800">
              Family Notifications Demo
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDemo(false)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 blue-light-filter:text-amber-600 blue-light-filter:hover:text-amber-800"
          >
            <X size={16} />
          </Button>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300 blue-light-filter:text-amber-700">
          When you assign tasks to family members, they automatically receive notifications via their preferred method.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            onClick={simulateNewNotification}
            size="sm"
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900 blue-light-filter:border-amber-300 blue-light-filter:text-amber-700 blue-light-filter:hover:bg-amber-100"
          >
            <Bell size={14} className="mr-2" />
            Send Test Notification
          </Button>
        </div>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 blue-light-filter:bg-amber-25 rounded-lg border border-gray-200 dark:border-gray-700 blue-light-filter:border-amber-200"
            >
              <div className="flex-shrink-0 mt-1">
                {notification.type === "sms" ? (
                  <Phone size={16} className="text-green-600 dark:text-green-400 blue-light-filter:text-green-700" />
                ) : (
                  <Mail size={16} className="text-blue-600 dark:text-blue-400 blue-light-filter:text-blue-700" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {notification.recipient}
                  </Badge>
                  <Badge 
                    variant={notification.type === "sms" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {notification.type.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-gray-500 dark:text-gray-400 blue-light-filter:text-gray-600">
                    {notification.timestamp}
                  </span>
                </div>
                
                <p className="text-sm text-gray-700 dark:text-gray-300 blue-light-filter:text-gray-800 leading-relaxed">
                  {notification.message}
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification(notification.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 blue-light-filter:text-gray-500 blue-light-filter:hover:text-gray-700"
              >
                <X size={14} />
              </Button>
            </div>
          ))}
        </div>
        
        {notifications.length === 0 && (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400 blue-light-filter:text-gray-600">
            <Bell size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent notifications</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}