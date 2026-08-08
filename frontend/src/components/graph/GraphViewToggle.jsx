import { MessageSquare, GitBranch } from 'lucide-react';

export default function GraphViewToggle({ showGraph, onToggle }) {
  return (
    <div className="bg-card rounded-full p-1 flex border border-border-subtle shadow-sm">
      <button
        onClick={() => onToggle(false)}
        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent-from/50 ${
          !showGraph 
            ? 'bg-text-primary text-base shadow-md' 
            : 'text-text-muted hover:text-text-primary bg-transparent'
        }`}
        aria-label="Switch to Chat View"
        aria-pressed={!showGraph}
      >
        <MessageSquare className="w-4 h-4" />
        <span>Chat</span>
      </button>

      <button
        onClick={() => onToggle(true)}
        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent-from/50 ${
          showGraph 
            ? 'bg-text-primary text-base shadow-md' 
            : 'text-text-muted hover:text-text-primary bg-transparent'
        }`}
        aria-label="Switch to Graph View"
        aria-pressed={showGraph}
      >
        <GitBranch className="w-4 h-4" />
        <span>Graph</span>
      </button>
    </div>
  );
}
