import { Plus, ShoppingCart, Utensils, Users, Zap, Mic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function QuickActions() {
  const actions = [
    { icon: Plus, label: "Add Event", color: "text-primary" },
    { icon: ShoppingCart, label: "Grocery List", color: "text-secondary" },
    { icon: Utensils, label: "Meal Plan", color: "text-accent" },
    { icon: Users, label: "Family Chat", color: "text-primary" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Zap className="text-primary mr-2 h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              className="bg-gray-50 hover:bg-gray-100 h-auto p-4 flex flex-col items-center space-y-2"
            >
              <action.icon className={`${action.color} h-6 w-6`} />
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          ))}
          
          {/* Voice Test Button */}
          <Link href="/voice-test">
            <Button
              variant="ghost"
              className="bg-purple-50 hover:bg-purple-100 h-auto p-4 flex flex-col items-center space-y-2 w-full"
            >
              <Mic className="text-purple-600 h-6 w-6" />
              <span className="text-sm font-medium">Voice Test</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
