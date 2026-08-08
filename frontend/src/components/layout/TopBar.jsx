import React, { useState, useEffect, useRef } from 'react';
import { Menu, Settings, Download, Pencil } from 'lucide-react';
import { useChatHistory } from '../../hooks/useChatHistory';
import GraphViewToggle from '../graph/GraphViewToggle';
import Button from '../common/Button';
import Tooltip from '../common/Tooltip';

const TopBar = ({ sidebarOpen, setSidebarOpen, showGraph, onToggleGraph }) => {
  const { activeChat, updateChat } = useChatHistory();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && activeChat) {
      setEditTitle(activeChat.title);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isEditing, activeChat]);

  const handleSave = () => {
    if (editTitle.trim() && activeChat && editTitle.trim() !== activeChat.title) {
      updateChat(activeChat.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  return (
    <header className="h-14 bg-panel/80 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-4 z-20">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden"
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </Button>
        {isEditing && activeChat ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="bg-card text-text-primary border border-border-subtle rounded-md px-2 py-1 text-base font-medium outline-none focus:border-accent-from w-48 md:w-64"
          />
        ) : (
          <div 
            className="group flex items-center gap-2 cursor-pointer hover:bg-card px-2 py-1 -ml-2 rounded-md transition-colors"
            onClick={() => {
              if (activeChat) setIsEditing(true);
            }}
            title={activeChat ? "Click to edit title" : ""}
          >
            <h1 className="text-base font-medium text-text-primary truncate max-w-[180px] md:max-w-sm">
              {activeChat ? activeChat.title : 'New Conversation'}
            </h1>
            {activeChat && (
              <Pencil className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {activeChat && (
          <GraphViewToggle showGraph={showGraph} onToggle={onToggleGraph} />
        )}
      </div>
    </header>
  );
};

export default TopBar;
