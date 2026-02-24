import { format, formatInTimeZone } from "date-fns-tz";

const TIMEZONE_STORAGE_KEY = 'user_timezone_override';

export const getDeviceTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const getSavedTimezone = (): string | null => {
  return localStorage.getItem(TIMEZONE_STORAGE_KEY);
};

export const setSavedTimezone = (tz: string | null) => {
  if (tz) {
    localStorage.setItem(TIMEZONE_STORAGE_KEY, tz);
  } else {
    localStorage.removeItem(TIMEZONE_STORAGE_KEY);
  }
};

export const getUserTimezone = (): string => {
  return getSavedTimezone() || getDeviceTimezone();
};

export const formatTimeInUserTimezone = (date: Date | string, formatStr: string = 'h:mm a'): string => {
  const userTimezone = getUserTimezone();
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  try {
    return formatInTimeZone(dateObj, userTimezone, formatStr);
  } catch {
    return format(dateObj, formatStr);
  }
};

export const formatDateTimeInUserTimezone = (date: Date | string): string => {
  return formatTimeInUserTimezone(date, 'MMM d, yyyy h:mm a');
};

export const convertToUTC = (dateStr: string, timeStr: string): Date => {
  const localDateTime = new Date(`${dateStr}T${timeStr}`);
  return localDateTime;
};

export const isToday = (date: Date | string): boolean => {
  const userTimezone = getUserTimezone();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();

  const dateInUserTz = formatInTimeZone(dateObj, userTimezone, 'yyyy-MM-dd');
  const todayInUserTz = formatInTimeZone(today, userTimezone, 'yyyy-MM-dd');

  return dateInUserTz === todayInUserTz;
};

export const formatDateInUserTimezone = (date: Date | string, formatStr: string = 'yyyy-MM-dd'): string => {
  const userTimezone = getUserTimezone();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  try {
    return formatInTimeZone(dateObj, userTimezone, formatStr);
  } catch {
    return format(dateObj, formatStr);
  }
};

export const COMMON_TIMEZONES = [
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
  { value: "America/Anchorage", label: "Alaska (AKST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PST)" },
  { value: "America/Denver", label: "Mountain Time (MST)" },
  { value: "America/Chicago", label: "Central Time (CST)" },
  { value: "America/New_York", label: "Eastern Time (EST)" },
  { value: "America/Phoenix", label: "Arizona (MST, no DST)" },
  { value: "America/Puerto_Rico", label: "Atlantic Time (AST)" },
  { value: "Pacific/Guam", label: "Guam (ChST)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Central Europe (CET)" },
  { value: "Europe/Helsinki", label: "Eastern Europe (EET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Pacific/Auckland", label: "New Zealand (NZST)" },
];
