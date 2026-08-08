/**
 * Format a duration in seconds to a human-readable string.
 * @param {number} seconds
 * @returns {string} e.g. "14:32" or "1:02:15"
 */
export function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return '0:00';

  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format a timestamp in seconds to a display string with leading zero for hours.
 * @param {number} seconds
 * @returns {string} e.g. "0:14:32"
 */
export function formatTimestamp(seconds) {
  if (seconds == null || isNaN(seconds)) return '0:00:00';

  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
