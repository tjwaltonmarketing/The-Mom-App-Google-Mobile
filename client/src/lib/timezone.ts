import { format, formatInTimeZone } from "date-fns-tz";

// Get the user's timezone
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// Format date in user's timezone with AM/PM format
export const formatTimeInUserTimezone = (date: Date | string, formatStr: string = 'h:mm a'): string => {
  const userTimezone = getUserTimezone();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    return formatInTimeZone(dateObj, userTimezone, formatStr);
  } catch {
    // Fallback to standard format if timezone formatting fails
    return format(dateObj, formatStr);
  }
};

// Format full date and time in user's timezone
export const formatDateTimeInUserTimezone = (date: Date | string): string => {
  return formatTimeInUserTimezone(date, 'MMM d, yyyy h:mm a');
};

// Convert user's local time to UTC for storage
export const convertToUTC = (dateStr: string, timeStr: string): Date => {
  const localDateTime = new Date(`${dateStr}T${timeStr}`);
  return localDateTime;
};

// Check if date is today in user's timezone
export const isToday = (date: Date | string): boolean => {
  const userTimezone = getUserTimezone();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  const dateInUserTz = formatInTimeZone(dateObj, userTimezone, 'yyyy-MM-dd');
  const todayInUserTz = formatInTimeZone(today, userTimezone, 'yyyy-MM-dd');
  
  return dateInUserTz === todayInUserTz;
};