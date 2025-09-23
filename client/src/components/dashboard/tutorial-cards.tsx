import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { 
  Play, 
  Clock, 
  Users, 
  Mic,
  Brain,
  Calendar,
  ChevronRight,
  ChevronDown,
  Shield
} from "lucide-react";
import { Link } from "wouter";

const quickTutorials = [
  {
    id: "voice-notes",
    title: "Voice Notes & Smart Capture",
    description: "Turn quick thoughts into organized tasks",
    duration: "4 min",
    difficulty: "beginner" as const,
    icon: Mic,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
  },
  {
    id: "simplified-task-management", 
    title: "Simplified Task Management",
    description: "Organize family tasks by person - no complex setup needed",
    duration: "3 min",
    difficulty: "beginner" as const,
    icon: Users,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
  },
  {
    id: "ai-assistant",
    title: "AI Family Assistant", 
    description: "Get smart suggestions for family planning",
    duration: "5 min",
    difficulty: "intermediate" as const,
    icon: Brain,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
  },
  {
    id: "password-vault",
    title: "Password Vault",
    description: "Securely store family passwords",
    duration: "4 min",
    difficulty: "intermediate" as const,
    icon: Shield,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
  }
];

const getDifficultyColor = (difficulty: "beginner" | "intermediate" | "advanced") => {
  switch (difficulty) {
    case "beginner": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "intermediate": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "advanced": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  }
};

export function TutorialCards() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                <CardTitle className="text-lg text-left">Quick Tutorials</CardTitle>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CardDescription>
                Learn key features in just a few minutes
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/tutorials">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3">
        {quickTutorials.map((tutorial) => (
          <div
            key={tutorial.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow"
          >
            <div className={`p-2 rounded-full ${tutorial.color}`}>
              <tutorial.icon className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm">{tutorial.title}</h4>
              <p className="text-xs text-muted-foreground truncate">
                {tutorial.description}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getDifficultyColor(tutorial.difficulty)}`}
                >
                  {tutorial.difficulty}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {tutorial.duration}
                </span>
              </div>
            </div>
            
            <Button asChild size="sm" className="flex-shrink-0">
              <Link href={`/tutorials?tutorial=${tutorial.id}`}>
                <Play className="h-3 w-3 mr-1" />
                Start
              </Link>
            </Button>
          </div>
        ))}

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Need help getting started?</span>
            <Button asChild variant="link" size="sm" className="h-auto p-0 text-primary">
              <Link href="/tutorials">
                Browse all tutorials
              </Link>
            </Button>
          </div>
        </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}