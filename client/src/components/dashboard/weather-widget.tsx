import { CloudSun, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface WeatherData {
  temperature: number;
  description: string;
  outfitSuggestion: string;
  location?: string;
}

export function WeatherWidget() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeatherData();
  }, []);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get user's location
      const position = await getCurrentLocation();
      
      // Fetch weather data from a free weather service
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`
      );
      
      if (!response.ok) {
        throw new Error('Weather service unavailable');
      }

      const data = await response.json();
      const temp = Math.round(data.current.temperature_2m);
      const weatherCode = data.current.weather_code;
      
      // Convert weather code to description
      const description = getWeatherDescription(weatherCode);
      const outfitSuggestion = getOutfitSuggestion(temp, weatherCode);
      
      setWeatherData({
        temperature: temp,
        description,
        outfitSuggestion,
        location: "Current Location"
      });
      
    } catch (error) {
      console.error('Weather fetch error:', error);
      setError('Weather data unavailable');
      // Set reasonable default data
      setWeatherData({
        temperature: 72,
        description: "Weather information unavailable",
        outfitSuggestion: "Check local forecast for outfit suggestions"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        // Default to San Francisco coordinates
        resolve({
          coords: { latitude: 37.7749, longitude: -122.4194 }
        } as GeolocationPosition);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        () => {
          // Default location if geolocation fails
          resolve({
            coords: { latitude: 37.7749, longitude: -122.4194 }
          } as GeolocationPosition);
        },
        { timeout: 5000 }
      );
    });
  };

  const getWeatherDescription = (code: number): string => {
    const weatherCodes: { [key: number]: string } = {
      0: "Clear sky",
      1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Foggy", 48: "Depositing rime fog",
      51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
      61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
      71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
      80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
      95: "Thunderstorm", 96: "Thunderstorm with hail"
    };
    return weatherCodes[code] || "Variable conditions";
  };

  const getOutfitSuggestion = (temp: number, code: number): string => {
    if (code >= 61 && code <= 65) return "Bring an umbrella and waterproof jacket!";
    if (code >= 71 && code <= 75) return "Dress warmly and wear waterproof boots!";
    if (code >= 95) return "Stay indoors during thunderstorm warnings!";
    if (temp < 32) return "Bundle up! Heavy coat, gloves, and warm layers needed.";
    if (temp < 50) return "Wear a warm jacket or coat with layers.";
    if (temp < 65) return "Light jacket or sweater recommended.";
    if (temp < 80) return "Perfect weather for light clothing!";
    return "Stay cool with light, breathable fabrics and stay hydrated!";
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Today's Weather</CardTitle>
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardHeader>
        <CardContent>
          <div className="text-center text-blue-100">Loading weather data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error && !weatherData) {
    return (
      <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Weather</CardTitle>
          <AlertCircle className="h-8 w-8" />
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-100">
            <p className="mb-2">Weather unavailable</p>
            <button 
              onClick={fetchWeatherData}
              className="text-sm underline hover:text-white"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CloudSun className="h-6 w-6" />
            <div>
              <span className="text-2xl font-bold">{weatherData?.temperature}°F</span>
              <span className="text-blue-100 text-sm ml-2">{weatherData?.description}</span>
            </div>
          </div>
          <div className="text-right text-xs text-blue-100 max-w-[140px]">
            {weatherData?.outfitSuggestion}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
