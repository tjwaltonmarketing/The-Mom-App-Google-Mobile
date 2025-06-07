// This file contains mock data initialization utilities
// The actual data is now managed by the backend storage system

export const FAMILY_COLORS = {
  mom: "#E53E3E",
  dad: "#3182CE", 
  child1: "#38A169",
  child2: "#9F7AEA"
} as const;

export const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800", 
  low: "bg-gray-100 text-gray-800"
} as const;

export const WEATHER_MOCK = {
  temperature: 72,
  description: "Partly cloudy with light breeze",
  outfitSuggestion: "Light jacket for Emma's soccer practice!"
} as const;
