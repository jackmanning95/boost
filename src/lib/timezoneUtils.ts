/**
 * Timezone utility functions for handling user-local timestamps
 */

export interface TimestampInfo {
  timestamp: string;
  timezone: string;
  userLocalTime: string;
}

/**
 * Get the user's current timezone
 */
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Could not detect timezone, using UTC');
    return 'UTC';
  }
};

/**
 * Create a timezone-aware timestamp
 */
export const createTimestamp = (): TimestampInfo => {
  const now = new Date();
  const timezone = getUserTimezone();
  
  return {
    timestamp: now.toISOString(),
    timezone,
    userLocalTime: now.toLocaleString('en-US', { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
  };
};

/**
 * Format a timestamp for display in the user's timezone
 */
export const formatTimestampForUser = (
  timestamp: string, 
  userTimezone?: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  try {
    const date = new Date(timestamp);
    const timezone = userTimezone || getUserTimezone();
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    };
    
    return date.toLocaleString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid Date';
  }
};

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (seconds > 30) return `${seconds} seconds ago`;
    
    return 'Just now';
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return 'Unknown time';
  }
};

/**
 * Check if a timestamp is today in the user's timezone
 */
export const isToday = (timestamp: string, userTimezone?: string): boolean => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const timezone = userTimezone || getUserTimezone();
    
    const dateStr = date.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD format
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: timezone });
    
    return dateStr === todayStr;
  } catch (error) {
    console.error('Error checking if date is today:', error);
    return false;
  }
};

/**
 * Format date for display with timezone awareness
 */
export const formatDateForUser = (
  timestamp: string,
  userTimezone?: string,
  includeTime: boolean = false
): string => {
  try {
    const date = new Date(timestamp);
    const timezone = userTimezone || getUserTimezone();
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: timezone
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};