// Timezone utility functions for converting between UTC and user's local timezone

/**
 * Convert UTC date string to user's timezone
 * @param utcDateString - Date string in UTC format
 * @param userTimezone - User's timezone (e.g., 'America/New_York')
 * @returns Formatted date string in user's timezone
 */
export function convertUTCToUserTimezone(utcDateString: string, userTimezone: string = 'UTC'): string {
  if (!utcDateString) return '';
  
  try {
    const date = new Date(utcDateString);
    
    // Format the date in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    return formatter.format(date);
  } catch (error) {
    console.error('Error converting UTC to user timezone:', error);
    return utcDateString; // Return original string if conversion fails
  }
}

/**
 * Convert UTC date string to user's timezone with relative time (e.g., "2 hours ago")
 * @param utcDateString - Date string in UTC format
 * @param userTimezone - User's timezone
 * @returns Relative time string or formatted date
 */
export function convertUTCToRelativeTime(utcDateString: string, userTimezone: string = 'UTC'): string {
  if (!utcDateString) return '';
  
  try {
    const date = new Date(utcDateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    // If less than 1 minute ago
    if (diffInMinutes < 1) {
      return 'Just now';
    }
    
    // If less than 1 hour ago
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }
    
    // If less than 24 hours ago
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }
    
    // If less than 7 days ago
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
    
    // Otherwise, show formatted date
    return convertUTCToUserTimezone(utcDateString, userTimezone);
  } catch (error) {
    console.error('Error converting UTC to relative time:', error);
    return utcDateString;
  }
}

/**
 * Convert user's local time to UTC (for sending to backend)
 * @param localDateString - Date string in user's local time
 * @returns UTC date string
 */
export function convertLocalToUTC(localDateString: string): string {
  if (!localDateString) return '';
  
  try {
    const date = new Date(localDateString);
    return date.toISOString();
  } catch (error) {
    console.error('Error converting local to UTC:', error);
    return localDateString;
  }
}

/**
 * Get user's browser timezone
 * @returns User's timezone identifier
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Error getting user timezone:', error);
    return 'UTC'; // Fallback to UTC
  }
}

/**
 * Format date for display in user's timezone
 * @param utcDateString - UTC date string
 * @param userTimezone - User's timezone
 * @param format - Format type: 'short', 'medium', 'long', 'full'
 * @returns Formatted date string
 */
export function formatDateInTimezone(
  utcDateString: string, 
  userTimezone: string = 'UTC', 
  format: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
  if (!utcDateString) return '';
  
  try {
    const date = new Date(utcDateString);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: userTimezone,
    };
    
    switch (format) {
      case 'short':
        formatOptions.dateStyle = 'short';
        formatOptions.timeStyle = 'short';
        break;
      case 'medium':
        formatOptions.dateStyle = 'medium';
        formatOptions.timeStyle = 'short';
        break;
      case 'long':
        formatOptions.dateStyle = 'long';
        formatOptions.timeStyle = 'medium';
        break;
      case 'full':
        formatOptions.dateStyle = 'full';
        formatOptions.timeStyle = 'long';
        break;
    }
    
    return new Intl.DateTimeFormat('en-US', formatOptions).format(date);
  } catch (error) {
    console.error('Error formatting date in timezone:', error);
    return utcDateString;
  }
}

/**
 * Check if a timezone is valid
 * @param timezone - Timezone identifier to validate
 * @returns Whether the timezone is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}