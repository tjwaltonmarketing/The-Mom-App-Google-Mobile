import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoading } from "@/components/ui/loading-provider";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function LoadingDemo() {
  const { showLoading } = useLoading();
  const [isSpinnerDemo, setIsSpinnerDemo] = useState(false);

  const handleLoadingDemo = (variant: "mom" | "family" | "calendar" | "tasks") => {
    showLoading(variant, undefined, 3000);
  };

  const handleSpinnerDemo = () => {
    setIsSpinnerDemo(true);
    setTimeout(() => setIsSpinnerDemo(false), 3000);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Family Loading Animations</span>
        </CardTitle>
        <CardDescription>
          Experience our delightful family-themed loading screens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button 
            onClick={() => handleLoadingDemo("family")}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-1"
          >
            <div className="text-2xl">👨‍👩‍👧‍👦</div>
            <span className="text-xs">Family</span>
          </Button>
          
          <Button 
            onClick={() => handleLoadingDemo("mom")}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-1"
          >
            <div className="text-2xl">🦸‍♀️</div>
            <span className="text-xs">Super Mom</span>
          </Button>
          
          <Button 
            onClick={() => handleLoadingDemo("calendar")}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-1"
          >
            <div className="text-2xl">📅</div>
            <span className="text-xs">Calendar</span>
          </Button>
          
          <Button 
            onClick={() => handleLoadingDemo("tasks")}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-1"
          >
            <div className="text-2xl">✅</div>
            <span className="text-xs">Tasks</span>
          </Button>
        </div>
        
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Loading Spinners</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <LoadingSpinner variant="heart" size="sm" />
                <span className="text-sm text-gray-600">Heart</span>
              </div>
              <div className="flex items-center space-x-2">
                <LoadingSpinner variant="family" size="sm" />
                <span className="text-sm text-gray-600">Family</span>
              </div>
              <div className="flex items-center space-x-2">
                <LoadingSpinner variant="mom" size="sm" />
                <span className="text-sm text-gray-600">Mom</span>
              </div>
            </div>
            
            {isSpinnerDemo && (
              <div className="flex items-center space-x-2">
                <LoadingSpinner variant="heart" size="md" />
                <span className="text-sm">Loading demo...</span>
              </div>
            )}
            
            <Button 
              onClick={handleSpinnerDemo}
              variant="outline"
              size="sm"
              disabled={isSpinnerDemo}
            >
              Demo Spinners
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}