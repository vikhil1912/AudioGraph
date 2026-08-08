import React from 'react';
import { AudioWaveform } from 'lucide-react';

const SUGGESTIONS = [
  "Summarize the meeting",
  "What were the key decisions?",
  "Who were the speakers?",
  "List action items"
];

export default function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-semibold text-text-primary mb-8">
        What can I help with?
      </h2>
    </div>
  );
}
