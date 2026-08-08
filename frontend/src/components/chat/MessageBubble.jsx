import React, { useState } from 'react';
import { AudioWaveform, ChevronDown, Copy, RotateCcw, Pencil } from 'lucide-react';
import SourceCitationChip from './SourceCitationChip';

const renderMarkdown = (text) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  const renderedLines = [];
  
  let inTable = false;
  let tableRows = [];

  const processText = (str) => {
    // Simple bold markdown
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('|')) {
      inTable = true;
      tableRows.push(line);
    } else {
      if (inTable) {
        // Render collected table
        renderedLines.push(
          <div key={`table-${i}`} className="overflow-x-auto my-2">
            <table className="min-w-full divide-y divide-border-subtle">
              <tbody className="divide-y divide-border-subtle">
                {tableRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.split('|').filter(c => c.trim()).map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-2 text-sm whitespace-nowrap">
                        {processText(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        inTable = false;
        tableRows = [];
      }

      if (line.trim().startsWith('- ')) {
        renderedLines.push(
          <div key={i} className="flex gap-2 my-1">
            <span className="text-accent-from">•</span>
            <span>{processText(line.trim().substring(2))}</span>
          </div>
        );
      } else {
        renderedLines.push(
          <div key={i} className="min-h-[1.5em]">
            {processText(line)}
          </div>
        );
      }
    }
  }

  // Handle trailing table
  if (inTable) {
    renderedLines.push(
      <div key={`table-end`} className="overflow-x-auto my-2">
        <table className="min-w-full divide-y divide-border-subtle">
          <tbody className="divide-y divide-border-subtle">
            {tableRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.split('|').filter(c => c.trim()).map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2 text-sm whitespace-nowrap">
                    {processText(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <>{renderedLines}</>;
};

export default function MessageBubble({ message, onSeekAudio, onEdit, onRetry }) {
  const isUser = message.role === 'user';
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');

  return (
    <div className={`flex w-full animate-slide-up ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`flex flex-col gap-1 max-w-[85%] md:max-w-[75%]`}>
        
        {/* AI Icon removed for minimalist look */}

        <div
          className={`text-sm flex flex-col gap-2 ${
            isUser
              ? 'px-4 py-3 bg-card text-text-primary rounded-3xl ml-auto max-w-[fit-content]'
              : 'py-3 text-text-primary mr-auto w-full'
          }`}
        >
          <div className="space-y-1 text-sm leading-relaxed">
            {isEditing ? (
              <div className="flex flex-col gap-2 min-w-[200px] w-full">
                <textarea 
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-transparent border-b border-border-subtle focus:border-text-primary outline-none resize-none p-1 text-sm text-text-primary"
                  rows={3}
                />
                <div className="flex justify-end gap-2 mt-1">
                  <button 
                    onClick={() => {
                      setEditContent(message.content);
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 text-xs rounded-full bg-transparent border border-border-subtle text-text-primary hover:bg-border-subtle/30"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      onEdit(message.id, editContent);
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 text-xs rounded-full bg-white text-black hover:bg-gray-200"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : message.content === '...' ? (
              <div className="flex items-center gap-2 py-1 text-text-muted text-sm animate-pulse">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse-dot" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse-dot" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse-dot" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : (
              renderMarkdown(message.content)
            )}
          </div>

          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border-subtle/50">
              <button
                onClick={() => setSourcesExpanded(!sourcesExpanded)}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                <span>Sources ({message.sources.length})</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sourcesExpanded ? 'rotate-180' : ''}`} />
              </button>
              
              {sourcesExpanded && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {message.sources.map((source, idx) => (
                    <SourceCitationChip
                      key={idx}
                      source={source}
                      onSeek={onSeekAudio}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Action bar for User */}
        {isUser && !isEditing && (
          <div className="flex items-center justify-end gap-2 mt-1 px-2 text-text-muted w-full">
            <button 
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded hover:bg-card hover:text-text-primary transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button 
              onClick={() => navigator.clipboard.writeText(message.content)}
              className="p-1.5 rounded hover:bg-card hover:text-text-primary transition-colors"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Action bar for AI */}
        {!isUser && message.content !== '...' && (
          <div className="flex items-center gap-2 mt-1 px-2 text-text-muted w-full">
            <button 
              onClick={() => navigator.clipboard.writeText(message.content)}
              className="p-1.5 rounded hover:bg-card hover:text-text-primary transition-colors"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onRetry(message.id)}
              className="p-1.5 rounded hover:bg-card hover:text-text-primary transition-colors"
              title="Retry"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
