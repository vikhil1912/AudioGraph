/**
 * Format an ISO date string to a relative description.
 * @param {string} isoString
 * @returns {string} e.g. "2 hours ago", "Yesterday", "Aug 1"
 */
export function formatRelativeDate(isoString) {
  if (!isoString) return '';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Group an array of items by recency based on a date field.
 * @param {Array} items - Array of objects with a date field
 * @param {string} dateField - The key to use for grouping (default: 'createdAt')
 * @returns {{ today: Array, previous7: Array, older: Array }}
 */
export function groupByRecency(items, dateField = 'createdAt') {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const groups = { today: [], previous7: [], older: [] };

  for (const item of items) {
    const itemDate = new Date(item[dateField]);
    if (itemDate >= startOfToday) {
      groups.today.push(item);
    } else if (itemDate >= sevenDaysAgo) {
      groups.previous7.push(item);
    } else {
      groups.older.push(item);
    }
  }

  return groups;
}
