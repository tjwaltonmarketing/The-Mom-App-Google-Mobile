import { useState, useEffect } from "react";
import { Clock, Heart, Coffee, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UsageStats {
  sessionTime: number; // minutes
  dailyTime: number; // minutes
  breaks: number;
  lastBreak: Date | null;
}

export function MindfulUsage() {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState<UsageStats>({
    sessionTime: 0,
    dailyTime: 0,
    breaks: 0,
    lastBreak: null
  });
  const [sessionStart] = useState(new Date());

  useEffect(() => {
    // Track session time
    const interval = setInterval(() => {
      const now = new Date();
      const sessionMinutes = Math.floor((now.getTime() - sessionStart.getTime()) / 60000);
      
      setStats(prev => ({
        ...prev,
        sessionTime: sessionMinutes,
        dailyTime: prev.dailyTime + (sessionMinutes > prev.sessionTime ? 1 : 0)
      }));

      // Show reminder after 20 minutes of continuous use
      if (sessionMinutes > 0 && sessionMinutes % 20 === 0) {
        const lastBreakTime = stats.lastBreak ? 
          Math.floor((now.getTime() - stats.lastBreak.getTime()) / 60000) : sessionMinutes;
        
        if (lastBreakTime >= 20) {
          setIsVisible(true);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [sessionStart, stats.lastBreak]);

  const handleTakeBreak = () => {
    setStats(prev => ({
      ...prev,
      breaks: prev.breaks + 1,
      lastBreak: new Date()
    }));
    setIsVisible(false);
  };

  const handleContinue = () => {
    setIsVisible(false);
    // Show again in 10 minutes if they continue
    setTimeout(() => setIsVisible(true), 600000);
  };

  const getMotivationalMessage = () => {
    const messages = [
      "You've been organizing your family beautifully! How about a quick stretch?",
      "Time for a mindful moment! Your family will benefit from a refreshed you.",
      "You're doing great managing everything! Consider a brief break to recharge.",
      "Your mental load management is on point! A short break can boost your energy.",
      "You've been super productive! Time to take care of yourself too."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getSuggestion = () => {
    const suggestions = [
      { icon: Coffee, text: "Grab a cup of tea or coffee" },
      { icon: Heart, text: "Take 5 deep breaths" },
      { icon: Clock, text: "Do a quick 2-minute walk" },
      { icon: Smartphone, text: "Check in with a family member in person" }
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  };

  const suggestion = getSuggestion();

  return (
    <Dialog open={isVisible} onOpenChange={setIsVisible}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Heart className="h-5 w-5" />
            Mindful Moment
          </DialogTitle>
          <DialogDescription className="text-base">
            {getMotivationalMessage()}
          </DialogDescription>
        </DialogHeader>
        
        <Card className="bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <suggestion.icon className="h-6 w-6 text-primary" />
              <span className="font-medium">{suggestion.text}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Session time:</span>
                <div>{stats.sessionTime} minutes</div>
              </div>
              <div>
                <span className="font-medium">Breaks taken:</span>
                <div>{stats.breaks} today</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button 
            onClick={handleTakeBreak}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            Take a Break
          </Button>
          <Button 
            onClick={handleContinue}
            variant="outline"
            className="flex-1"
          >
            Continue (10 min)
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500">
          Gentle reminder: Taking breaks helps you be the best mom you can be ✨
        </p>
      </DialogContent>
    </Dialog>
  );
}