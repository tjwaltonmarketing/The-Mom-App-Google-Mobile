import { CloudSun, Loader2, AlertCircle, MapPin, Pencil, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState, useRef } from "react";

interface WeatherData {
  temperature: number;
  description: string;
  outfitSuggestion: string;
  location?: string;
  isDefaultLocation?: boolean;
}

interface SavedLocation {
  latitude: number;
  longitude: number;
  displayName: string;
}

const LOCATION_STORAGE_KEY = 'momapp_weather_location';

function getSavedLocation(): SavedLocation | null {
  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function saveLocation(location: SavedLocation) {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
  } catch {}
}

export function WeatherWidget() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchWeatherData();
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);

      const saved = getSavedLocation();
      let latitude: number;
      let longitude: number;
      let locationName: string;
      let isDefault = false;

      if (saved) {
        latitude = saved.latitude;
        longitude = saved.longitude;
        locationName = saved.displayName;
      } else {
        const defaultLoc = { latitude: 40.7128, longitude: -74.0060 };
        latitude = defaultLoc.latitude;
        longitude = defaultLoc.longitude;
        locationName = "New York, NY";
        isDefault = true;
      }

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`
      );

      if (!response.ok) {
        throw new Error('Weather service unavailable');
      }

      const data = await response.json();
      const temp = Math.round(data.current.temperature_2m);
      const weatherCode = data.current.weather_code;

      const description = getWeatherDescription(weatherCode);
      const outfitSuggestion = getOutfitSuggestion(temp, weatherCode);

      setWeatherData({
        temperature: temp,
        description,
        outfitSuggestion,
        location: isDefault ? `${locationName} (tap to set yours)` : locationName,
        isDefaultLocation: isDefault
      });

    } catch (error) {
      console.error('Weather fetch error:', error);
      setError('Weather data unavailable');
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

  const geocodeLocation = async (query: string): Promise<SavedLocation | null> => {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
      );

      if (!response.ok) return null;

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return null;
      }

      const result = data.results[0];
      const parts = [result.name];
      if (result.admin1) parts.push(getStateAbbreviation(result.admin1));
      const displayName = parts.join(', ');

      return {
        latitude: result.latitude,
        longitude: result.longitude,
        displayName,
      };
    } catch {
      return null;
    }
  };

  const handleLocationSubmit = async () => {
    const query = locationInput.trim();
    if (!query) return;

    setSearchLoading(true);
    setSearchError(null);

    const location = await geocodeLocation(query);

    if (location) {
      saveLocation(location);
      setIsEditing(false);
      setLocationInput('');
      setSearchError(null);
      await fetchWeatherData();
    } else {
      setSearchError("Couldn't find that location. Try a city name or zip code.");
    }

    setSearchLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLocationSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setSearchError(null);
      setLocationInput('');
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
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-blue-100">Loading weather...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !weatherData) {
    return (
      <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6" />
            <div>
              <span>Weather unavailable</span>
              <button
                onClick={fetchWeatherData}
                className="ml-2 text-sm underline hover:text-white"
              >
                Try again
              </button>
            </div>
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

              {isEditing ? (
                <div className="mt-1">
                  <div className="flex items-center gap-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="City, State or Zip"
                      className="bg-white/20 text-white placeholder-blue-200 text-xs rounded px-2 py-1 w-36 outline-none focus:bg-white/30"
                      disabled={searchLoading}
                    />
                    <button
                      onClick={handleLocationSubmit}
                      disabled={searchLoading || !locationInput.trim()}
                      className="p-1 hover:bg-white/20 rounded disabled:opacity-50"
                      title="Save location"
                    >
                      {searchLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={() => { setIsEditing(false); setSearchError(null); setLocationInput(''); }}
                      className="p-1 hover:bg-white/20 rounded"
                      title="Cancel"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {searchError && (
                    <p className="text-xs text-red-200 mt-1">{searchError}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-blue-200">
                  <MapPin className="h-3 w-3" />
                  <span>{weatherData?.location}</span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="ml-1 p-0.5 hover:bg-white/20 rounded"
                    title="Change location"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
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
