/**
 * Timezone utility functions for formatting dates according to user preferences
 */

/**
 * Format a date string in the user's configured timezone
 * @param dateString - ISO date string from the backend
 * @param timezone - User's timezone (e.g., 'America/New_York', 'UTC')
 * @param options - Intl.DateTimeFormatOptions for customizing the output
 * @returns Formatted date string in the user's timezone
 */
export function formatDateInTimezone(
  dateString: string,
  timezone: string = 'UTC',
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  };

  const formatOptions = options ? { ...defaultOptions, ...options } : defaultOptions;

  try {
    return new Date(dateString).toLocaleString('en-US', formatOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    // Fallback to UTC if timezone is invalid
    return new Date(dateString).toLocaleString('en-US', {
      ...formatOptions,
      timeZone: 'UTC',
    });
  }
}

/**
 * Format a date string without time (date only)
 * @param dateString - ISO date string from the backend
 * @param timezone - User's timezone
 * @returns Formatted date string without time
 */
export function formatDateOnly(
  dateString: string,
  timezone: string = 'UTC'
): string {
  return formatDateInTimezone(dateString, timezone, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: undefined,
    minute: undefined,
  });
}

/**
 * Format a date string with full date and time
 * @param dateString - ISO date string from the backend
 * @param timezone - User's timezone
 * @returns Formatted date and time string
 */
export function formatDateTime(
  dateString: string,
  timezone: string = 'UTC'
): string {
  return formatDateInTimezone(dateString, timezone, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: undefined,
  });
}

/**
 * Format a date string with relative time (e.g., "2 hours ago")
 * Falls back to absolute date if too old
 * @param dateString - ISO date string from the backend
 * @param timezone - User's timezone
 * @returns Relative or absolute date string
 */
export function formatRelativeDate(
  dateString: string,
  timezone: string = 'UTC'
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    // For dates older than a week, show absolute date
    return formatDateTime(dateString, timezone);
  }
}
