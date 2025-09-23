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

interface Coordinates {
  lat: number;
  lon: number;
}

export class WeatherService {
  private static geocodeCache = new Map<string, Coordinates>();
  private static weatherCache = new Map<string, { data: WeatherData; expires: number }>();

  /**
   * Convert location text to coordinates using OpenStreetMap's Nominatim API
   */
  private static async geocodeLocation(location: string): Promise<Coordinates | null> {
    // Check cache first
    if (this.geocodeCache.has(location)) {
      return this.geocodeCache.get(location)!;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
        {
          headers: {
            'User-Agent': 'MomApp/1.0 (Family coordination app)'
          }
        }
      );
      
      if (!response.ok) {
        console.error('Geocoding API error:', response.status);
        return null;
      }

      const results = await response.json();
      
      if (results.length === 0) {
        console.log('No geocoding results for location:', location);
        return null;
      }

      const coords = {
        lat: parseFloat(results[0].lat),
        lon: parseFloat(results[0].lon)
      };

      // Cache the result
      this.geocodeCache.set(location, coords);
      return coords;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Get weather data for coordinates using Open-Meteo API (free, no API key needed)
   */
  private static async getWeatherForCoordinates(lat: number, lon: number, temperatureUnit: 'celsius' | 'fahrenheit' = 'fahrenheit'): Promise<WeatherData | null> {
    const cacheKey = `${lat},${lon},${temperatureUnit}`;
    const now = Date.now();

    // Check cache (weather data valid for 30 minutes)
    if (this.weatherCache.has(cacheKey)) {
      const cached = this.weatherCache.get(cacheKey)!;
      if (now < cached.expires) {
        return cached.data;
      }
    }

    try {
      const windSpeedUnit = temperatureUnit === 'fahrenheit' ? 'mph' : 'kmh';
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m&timezone=auto&temperature_unit=${temperatureUnit}&wind_speed_unit=${windSpeedUnit}`
      );

      if (!response.ok) {
        console.error('Weather API error:', response.status);
        return null;
      }

      const data = await response.json();
      const current = data.current;

      const weatherData: WeatherData = {
        temperature: Math.round(current.temperature_2m),
        temperatureUnit: temperatureUnit,
        description: this.getWeatherDescription(current.weather_code),
        icon: this.getWeatherIcon(current.weather_code),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        windSpeedUnit: windSpeedUnit,
        chanceOfRain: current.precipitation_probability || 0
      };

      // Cache for 30 minutes
      this.weatherCache.set(cacheKey, {
        data: weatherData,
        expires: now + (30 * 60 * 1000)
      });

      return weatherData;
    } catch (error) {
      console.error('Weather API error:', error);
      return null;
    }
  }

  /**
   * Get weather data for a location string
   */
  static async getWeatherForLocation(location: string, temperatureUnit: 'celsius' | 'fahrenheit' = 'fahrenheit'): Promise<WeatherData | null> {
    if (!location || location.trim() === '') {
      return null;
    }

    const coordinates = await this.geocodeLocation(location.trim());
    if (!coordinates) {
      return null;
    }

    return await this.getWeatherForCoordinates(coordinates.lat, coordinates.lon, temperatureUnit);
  }

  /**
   * Convert weather codes from Open-Meteo to readable descriptions
   */
  private static getWeatherDescription(code: number): string {
    const descriptions: { [key: number]: string } = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight showers',
      81: 'Moderate showers',
      82: 'Heavy showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Severe thunderstorm'
    };
    
    return descriptions[code] || 'Unknown';
  }

  /**
   * Convert weather codes to emoji icons
   */
  private static getWeatherIcon(code: number): string {
    const icons: { [key: number]: string } = {
      0: '☀️',    // Clear sky
      1: '🌤️',    // Mainly clear
      2: '⛅',    // Partly cloudy
      3: '☁️',    // Overcast
      45: '🌫️',   // Foggy
      48: '🌫️',   // Rime fog
      51: '🌦️',   // Light drizzle
      53: '🌦️',   // Moderate drizzle
      55: '🌧️',   // Dense drizzle
      61: '🌧️',   // Slight rain
      63: '🌧️',   // Moderate rain
      65: '⛈️',   // Heavy rain
      71: '🌨️',   // Slight snow
      73: '❄️',   // Moderate snow
      75: '❄️',   // Heavy snow
      80: '🌦️',   // Slight showers
      81: '🌧️',   // Moderate showers
      82: '⛈️',   // Heavy showers
      95: '⛈️',   // Thunderstorm
      96: '⛈️',   // Thunderstorm with hail
      99: '⛈️'    // Severe thunderstorm
    };
    
    return icons[code] || '🌤️';
  }
}