import React, { useState, useRef, useCallback } from 'react';
import { Plus, Mic, Send, AudioWaveform } from 'lucide-react';

const SUGGESTIONS = [
  "Summarize",
  "Key Decisions",
  "Action Items",
  "Ask about a speaker"
];

export default function ChatInput({ onSend, disabled, showSuggestions, onSuggestionClick }) {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef(null);

  const handleInput = (e) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSend = useCallback(() => {
    if (inputValue.trim() && !disabled) {
      onSend(inputValue.trim());
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [inputValue, disabled, onSend]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="sticky bottom-0 px-4 pb-4">
      {showSuggestions && (
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mask-fade-edges">
          {SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion)}
              className="flex-shrink-0 rounded-full bg-card border border-border-subtle px-4 py-2 text-sm text-text-primary hover:bg-border-subtle/30 hover:border-accent-from/30 transition-colors cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="bg-card rounded-[32px] px-2 py-2 flex items-end shadow-sm">
        <button className="p-2 mb-1 flex-shrink-0 text-text-primary hover:bg-border-subtle/50 rounded-full transition-colors">
          <Plus className="w-5 h-5" />
        </button>

        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything"
          className="flex-1 bg-transparent resize-none text-base text-text-primary placeholder:text-text-muted outline-none px-3 py-3 max-h-[120px]"
          rows={1}
          disabled={disabled}
        />
        
        <div className="flex items-center gap-2 mb-1 flex-shrink-0">
          <button className="p-2 text-text-primary hover:bg-border-subtle/50 rounded-full transition-colors">
            <Mic className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleSend}
            disabled={disabled || !inputValue.trim()}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              disabled || !inputValue.trim() 
                ? 'bg-text-muted/20 text-text-muted cursor-not-allowed' 
                : 'bg-white text-black hover:bg-gray-200 shadow-md'
            }`}
          >
            {inputValue.trim() ? <Send className="w-4 h-4 ml-0.5" /> : <AudioWaveform className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
