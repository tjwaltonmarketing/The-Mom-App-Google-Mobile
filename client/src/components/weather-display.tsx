import { useQuery } from "@tanstack/react-query";
import { MapPin, Thermometer, Droplets, Wind } from "lucide-react";
import { authFetch } from "@/lib/queryClient";

interface WeatherData {
  temperature: number;
  temperatureUnit: 'celsius' | 'fahrenheit';
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  windSpeedUnit: 'mph' | 'kmh';
  chanceOfRain: number;
}

interface WeatherDisplayProps {
  location: string;
  compact?: boolean;
  className?: string;
}

export function WeatherDisplay({ location, compact = false, className = "" }: WeatherDisplayProps) {
  // Detect if user is likely in the US based on timezone
  const isUSTimezone = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone.startsWith('America/') && 
           (timezone.includes('New_York') || timezone.includes('Chicago') || 
            timezone.includes('Denver') || timezone.includes('Los_Angeles') ||
            timezone.includes('Phoenix') || timezone.includes('Anchorage') ||
            timezone.includes('Honolulu') || timezone.includes('Detroit') ||
            timezone.includes('Miami') || timezone.includes('Seattle'));
  };
  
  const temperatureUnit = isUSTimezone() ? 'fahrenheit' : 'celsius';

  const { data: weather, isLoading, error } = useQuery<WeatherData>({
    queryKey: ['/api/weather', location, temperatureUnit],
    queryFn: async () => {
      const response = await authFetch(`/api/weather/${encodeURIComponent(location)}?unit=${temperatureUnit}`);
      
      if (!response.ok) {
        // If weather data isn't available, fail silently (don't throw)
        return null;
      }
      
      return response.json();
    },
    enabled: !!location && location.trim() !== '',
    staleTime: 30 * 60 * 1000, // 30 minutes - weather doesn't change that fast
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: false, // Don't retry if weather service is down
  });

  // Don't render anything if loading, error, or no data
  if (isLoading || error || !weather) {
    return null;
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-sm text-gray-600 ${className}`} data-testid="weather-compact">
        <span>{weather.icon}</span>
        <span>{weather.temperature}°{weather.temperatureUnit === 'celsius' ? 'C' : 'F'}</span>
        {weather.chanceOfRain > 50 && (
          <span className="text-blue-600">
            <Droplets size={12} className="inline" />
            {weather.chanceOfRain}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border ${className}`} data-testid="weather-full">
      <div className="flex items-center gap-2 mb-2">
        <MapPin size={14} className="text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-300">{location}</span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{weather.icon}</span>
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {weather.temperature}°{weather.temperatureUnit === 'celsius' ? 'C' : 'F'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {weather.description}
            </div>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          {weather.chanceOfRain > 0 && (
            <div className="flex items-center gap-1">
              <Droplets size={12} />
              {weather.chanceOfRain}% rain
            </div>
          )}
          <div className="flex items-center gap-1">
            <Wind size={12} />
            {weather.windSpeed} {weather.windSpeedUnit === 'kmh' ? 'km/h' : 'mph'}
          </div>
          <div className="flex items-center gap-1">
            <Thermometer size={12} />
            {weather.humidity}% humid
          </div>
        </div>
      </div>
    </div>
  );
}