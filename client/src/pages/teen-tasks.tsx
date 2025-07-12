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
  Users
} from "lucide-react";
import TeenNavigation from "@/components/teen/teen-navigation";

export default function TeenTasks() {
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
      dueTime: "4:00 PM",
      priority: "low",
      points: 20,
      isCompleted: false
    }
  ];

  const upcomingEvents = [
    {
      id: 1,
      title: "Soccer Practice",
      time: "3:30 PM",
      date: "Today",
      type: "activity"
    },
    {
      id: 2,
      title: "Family Movie Night",
      time: "7:00 PM", 
      date: "Tonight",
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
      {/* Navigation Header */}
      <TeenNavigation currentPath="/teen-tasks" />

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
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>{task.dueTime}</span>
                          <Badge variant={
                            task.priority === 'high' ? 'destructive' : 
                            task.priority === 'medium' ? 'default' : 'secondary'
                          } className="text-xs">
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-purple-600">+{task.points} pts</p>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" className="w-full mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Task
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/teen-calendar")}
                  className="h-16 flex flex-col gap-1"
                >
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs">Calendar</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex flex-col gap-1"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">Add Task</span>
                </Button>
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
                {upcomingEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="p-2 bg-gray-50 rounded-lg">
                    <p className="font-medium text-sm">{event.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>{event.time} • {event.date}</span>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => setLocation("/teen-calendar")}
                >
                  View All Events
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {achievements.map((achievement, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div>
                      <p className="font-medium text-sm">{achievement.name}</p>
                      <p className="text-xs text-gray-600">{achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}