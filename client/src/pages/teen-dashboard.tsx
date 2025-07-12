import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Star, 
  Flame, 
  Trophy, 
  Plus,
  Bell,
  Settings,
  LogOut,
  Users
} from "lucide-react";

export default function TeenDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [, setLocation] = useLocation();

  // Mock data for teen dashboard
  const teenProfile = {
    firstName: "Adri",
    points: 285,
    streak: 12,
    level: "Family Helper",
    color: "purple"
  };

  const todayTasks = [
    {
      id: 1,
      title: "Take out trash",
      dueTime: "6:00 PM",
      priority: "medium",
      points: 15,
      isCompleted: false
    },
    {
      id: 2,
      title: "Feed the dog",
      dueTime: "7:30 AM",
      priority: "high",
      points: 10,
      isCompleted: true
    },
    {
      id: 3,
      title: "Clean bedroom",
      dueTime: "8:00 PM",
      priority: "medium",
      points: 25,
      isCompleted: false
    }
  ];

  const upcomingEvents = [
    {
      id: 1,
      title: "Soccer Practice",
      time: "4:00 PM",
      date: "Today",
      type: "sport"
    },
    {
      id: 2,
      title: "Family Dinner",
      time: "6:30 PM",
      date: "Today",
      type: "family"
    },
    {
      id: 3,
      title: "Math Test",
      time: "10:00 AM",
      date: "Tomorrow",
      type: "school"
    }
  ];

  const achievements = [
    { name: "Week Warrior", description: "7 days streak!", icon: "🔥" },
    { name: "Task Master", description: "100 tasks completed", icon: "⭐" },
    { name: "Early Bird", description: "5 morning tasks", icon: "🌅" }
  ];

  const completedTasks = todayTasks.filter(task => task.isCompleted);
  const pendingTasks = todayTasks.filter(task => !task.isCompleted);
  const taskProgress = (completedTasks.length / todayTasks.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {teenProfile.avatar ? (
                <img 
                  src={teenProfile.avatar} 
                  alt={`${teenProfile.firstName}'s avatar`}
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: teenProfile.color }}
                >
                  {teenProfile.firstName.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold">Hey, {teenProfile.firstName}!</h1>
                <p className="text-sm text-gray-600">{teenProfile.level}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/teen-profile")}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Points & Streak Card */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Your Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-purple-600">{teenProfile.points}</p>
                  <p className="text-sm text-gray-600">Total Points</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-lg font-semibold">{teenProfile.streak}</span>
                  </div>
                  <p className="text-sm text-gray-600">Day Streak</p>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Today's Tasks</span>
                  <span className="text-sm text-gray-600">{completedTasks.length}/{todayTasks.length}</span>
                </div>
                <Progress value={taskProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Today's Tasks */}
          <Card className="md:col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Today's Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      task.isCompleted 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        task.isCompleted 
                          ? 'bg-green-500 border-green-500' 
                          : 'border-gray-300'
                      }`}>
                        {task.isCompleted && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <div>
                        <p className={`font-medium ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-600">{task.dueTime}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                        {task.priority}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span className="text-sm font-medium">{task.points}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{event.date} at {event.time}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {achievements.map((achievement, index) => (
                  <div key={index} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
                    <div className="text-2xl mb-2">{achievement.icon}</div>
                    <p className="font-medium text-sm">{achievement.name}</p>
                    <p className="text-xs text-gray-600">{achievement.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Family Connection */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Family
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Connected to</p>
                  <p className="font-semibold">The Walton Family</p>
                  <p className="text-xs text-gray-500 mt-1">3 members</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setLocation("/teen-calendar")}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  View Family Calendar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}