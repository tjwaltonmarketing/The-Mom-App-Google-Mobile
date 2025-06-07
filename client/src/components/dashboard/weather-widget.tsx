import { CloudSun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WeatherWidget() {
  // Mock weather data as this would typically come from a weather API
  const weatherData = {
    temperature: 72,
    description: "Partly cloudy with light breeze",
    outfitSuggestion: "Light jacket for Emma's soccer practice!"
  };

  return (
    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Today's Weather</CardTitle>
        <CloudSun className="h-8 w-8" />
      </CardHeader>
      
      <CardContent>
        <div className="text-3xl font-bold mb-2">{weatherData.temperature}°F</div>
        <p className="text-blue-100 mb-4">{weatherData.description}</p>
        <div className="bg-white/20 rounded-lg p-3">
          <p className="text-sm font-medium mb-1">Outfit Suggestion:</p>
          <p className="text-sm text-blue-100">{weatherData.outfitSuggestion}</p>
        </div>
      </CardContent>
    </Card>
  );
}
