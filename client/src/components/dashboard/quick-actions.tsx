import { Plus, ShoppingCart, Utensils, Users, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";

export function QuickActions() {
  const [, setLocation] = useLocation();
  
  const actions = [
    { icon: Plus, label: "Add Event", color: "text-primary", href: "/calendar" },
    { icon: ShoppingCart, label: "Grocery List", color: "text-pink-500", href: "/grocery-list" },
    { icon: Utensils, label: "Meal Plan", color: "text-accent", href: "/meal-plan" },
    { icon: Users, label: "Family Chat", color: "text-primary", href: "/family-chat" },
  ];
  
  const handleActionClick = (href: string) => {
    // First navigate
    setLocation(href);
    // Then force scroll to top after page content loads
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
      // Force another scroll to ensure it sticks
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 10);
    }, 200);
  };

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
              className="bg-gray-50 hover:bg-gray-100 h-auto p-4 flex flex-col items-center space-y-2 w-full"
              onClick={() => handleActionClick(action.href)}
              data-testid={`quick-action-${action.label.toLowerCase().replace(' ', '-')}`}
            >
              <action.icon className={`${action.color} h-6 w-6`} />
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
