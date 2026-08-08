import React from 'react';
import { Clock } from 'lucide-react';
import { formatDuration } from '../../utils/formatTime';

export default function SourceCitationChip({ source, onSeek }) {
  const label = source.speaker || source.label || 'Source';
  const time = source.timestamp !== undefined ? formatDuration(source.timestamp) : '';

  return (
    <button
      onClick={() => onSeek && onSeek(source.timestamp)}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-accent-from/10 text-accent-from text-xs font-medium hover:bg-accent-from/20 cursor-pointer transition-colors"
      title="Seek to timestamp"
    >
      <Clock className="w-3 h-3" />
      <span>
        {label}
        {time && ` · ${time}`}
      </span>
    </button>
  );
}
