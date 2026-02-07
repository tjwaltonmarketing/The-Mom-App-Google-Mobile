import { CloudSun, Loader2, AlertCircle, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

interface WeatherData {
  temperature: number;
  description: string;
  outfitSuggestion: string;
  location?: string;
  isDefaultLocation?: boolean;
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
      const locationResult = await getCurrentLocation();
      const { latitude, longitude, isDefault } = locationResult;
      
      // Fetch weather data from a free weather service
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`
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
      
      // Get city name from coordinates using reverse geocoding
      const cityName = await getCityFromCoordinates(latitude, longitude, isDefault);
      
      setWeatherData({
        temperature: temp,
        description,
        outfitSuggestion,
        location: cityName,
        isDefaultLocation: isDefault
      });
      
    } catch (error) {
      console.error('Weather fetch error:', error);
      setError('Weather data unavailable');
      // Set reasonable default data
      setWeatherData({
        temperature: 72,
        description: "Weather information unavailable",
        outfitSuggestion: "Check local forecast for outfit suggestions",
        location: "Unknown",
        isDefaultLocation: true
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number; isDefault: boolean }> => {
    const defaultLocation = { latitude: 40.7128, longitude: -74.0060, isDefault: true };

    try {
      if (Capacitor.isNativePlatform()) {
        const permStatus = await Geolocation.checkPermissions();
        if (permStatus.location === 'denied') {
          const reqResult = await Geolocation.requestPermissions();
          if (reqResult.location === 'denied') {
            return defaultLocation;
          }
        }
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
        });
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          isDefault: false,
        };
      }

      if (!navigator.geolocation) {
        return defaultLocation;
      }

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              isDefault: false,
            });
          },
          () => {
            resolve(defaultLocation);
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      });
    } catch (err) {
      console.error("Location error:", err);
      return defaultLocation;
    }
  };

  const getCityFromCoordinates = async (lat: number, lon: number, isDefault: boolean): Promise<string> => {
    if (isDefault) {
      return "New York, NY (default)";
    }
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
        {
          headers: {
            'User-Agent': 'MomApp/1.0'
          }
        }
      );
      
      if (!response.ok) {
        return "Your Location";
      }
      
      const data = await response.json();
      const address = data.address;
      
      // Try to get city, town, or village name
      const city = address.city || address.town || address.village || address.municipality || address.county;
      const state = address.state;
      
      if (city && state) {
        // Abbreviate common US states
        const stateAbbrev = getStateAbbreviation(state);
        return `${city}, ${stateAbbrev}`;
      } else if (city) {
        return city;
      }
      
      return "Your Location";
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return "Your Location";
    }
  };

  const getStateAbbreviation = (state: string): string => {
    const stateMap: { [key: string]: string } = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
      'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
      'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
      'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
      'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
      'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
      'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
      'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
      'Alberta': 'AB', 'British Columbia': 'BC', 'Manitoba': 'MB', 'New Brunswick': 'NB',
      'Newfoundland and Labrador': 'NL', 'Nova Scotia': 'NS', 'Ontario': 'ON',
      'Prince Edward Island': 'PE', 'Quebec': 'QC', 'Saskatchewan': 'SK',
      'Northwest Territories': 'NT', 'Nunavut': 'NU', 'Yukon': 'YT'
    };
    return stateMap[state] || state;
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
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold">{weatherData?.temperature}°F</span>
                <span className="text-blue-100 text-sm ml-2">{weatherData?.description}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-blue-200">
                <MapPin className="h-3 w-3" />
                <span>{weatherData?.location}</span>
                {weatherData?.isDefaultLocation && (
                  <button 
                    onClick={fetchWeatherData}
                    className="ml-1 underline hover:text-white"
                    title="Click to retry getting your location"
                  >
                    (retry)
                  </button>
                )}
              </div>
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
