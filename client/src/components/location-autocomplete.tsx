import { useState, useRef, useEffect } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LocationSuggestion {
  place_id: string;
  description: string;
  formatted_address?: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Enter location",
  className 
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  const searchPlaces = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    try {
      // Use OpenStreetMap Nominatim for real location suggestions (same as our weather service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=us&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'MomApp/1.0 (Family coordination app)'
          }
        }
      );
      
      if (response.ok) {
        const results = await response.json();
        
        if (results && results.length > 0) {
          const formattedSuggestions: LocationSuggestion[] = results.map((result: any, index: number) => ({
            place_id: result.place_id || `geocode_${index}`,
            description: result.display_name,
            formatted_address: result.display_name
          }));
          
          setSuggestions(formattedSuggestions);
          setShowSuggestions(true);
        } else {
          // If no results from geocoding, show helpful fallback
          const fallbackSuggestions: LocationSuggestion[] = [
            { place_id: 'fallback_1', description: `${query} (Business/Restaurant)`, formatted_address: `${query} (Business/Restaurant)` },
            { place_id: 'fallback_2', description: `${query} (Address)`, formatted_address: `${query} (Address)` },
            { place_id: 'fallback_3', description: `${query} (Park/Recreation)`, formatted_address: `${query} (Park/Recreation)` }
          ];
          
          setSuggestions(fallbackSuggestions);
          setShowSuggestions(true);
        }
      } else {
        // Network error fallback
        const fallbackSuggestions: LocationSuggestion[] = [
          { place_id: 'fallback_1', description: `${query} - Home`, formatted_address: `${query} - Home` },
          { place_id: 'fallback_2', description: `${query} - Work`, formatted_address: `${query} - Work` },
          { place_id: 'fallback_3', description: `${query} - School`, formatted_address: `${query} - School` }
        ];
        
        setSuggestions(fallbackSuggestions);
        setShowSuggestions(true);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error searching places:', error);
      // Error fallback - still show something useful
      const fallbackSuggestions: LocationSuggestion[] = [
        { place_id: 'fallback_1', description: `${query} (Location)`, formatted_address: `${query} (Location)` }
      ];
      
      setSuggestions(fallbackSuggestions);
      setShowSuggestions(true);
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchPlaces(newValue);
    }, 300);
  };

  const selectSuggestion = (suggestion: LocationSuggestion) => {
    onChange(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const openInGoogleMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapsUrl, '_blank');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={inputRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`pl-10 ${className}`}
          onFocus={() => value.length >= 3 && setShowSuggestions(true)}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1 h-8 w-8 p-0"
            onClick={() => openInGoogleMaps(value)}
            title="Open in Google Maps"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 flex items-start gap-3"
              onClick={() => selectSuggestion(suggestion)}
            >
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {suggestion.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
            Searching locations...
          </div>
        </div>
      )}
    </div>
  );
}