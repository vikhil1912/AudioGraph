import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Pencil, Trash2, Pin, PinOff } from 'lucide-react';
import { useChatHistory } from '../../hooks/useChatHistory';
import { deleteMeeting } from '../../services/api';

const ChatHistoryItem = ({ chat, isActive }) => {
  const navigate = useNavigate();
  const { updateChat, deleteChat } = useChatHistory();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title || 'Untitled Conversation');
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = () => {
    if (!isEditing) navigate(`/chat/${chat.id}`);
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle.trim() !== chat.title) {
      updateChat(chat.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const togglePin = (e) => {
    e.stopPropagation();
    updateChat(chat.id, { isPinned: !chat.isPinned });
    setShowMenu(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    try {
      await deleteMeeting(chat.id);
      deleteChat(chat.id);
    } catch (err) {
      console.error("Failed to delete chat from backend", err);
    }
    setShowMenu(false);
  };

  const handleRename = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setShowMenu(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div 
      className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors duration-150 ${
        isActive 
          ? 'bg-accent-from/10 border-l-2 border-accent-from text-text-primary' 
          : 'hover:bg-card text-text-muted'
      }`}
      onClick={() => {
        if (!isEditing) navigate(`/app/chat/${chat.id}`);
      }}
    >
      <div className="flex-1 min-w-0 overflow-hidden flex items-center">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-black text-text-primary border border-border-subtle rounded px-2 py-0.5 text-sm outline-none focus:border-accent-from"
          />
        ) : (
          <h4 className="text-sm truncate w-full pr-6 font-medium">
            {chat.title || 'Untitled Conversation'}
          </h4>
        )}
      </div>

      {!isEditing && (
        <div className={`absolute right-2 flex items-center ${showMenu || isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={`p-1 rounded-md text-text-muted hover:text-text-primary ${isActive ? 'bg-card' : 'bg-base group-hover:bg-card'}`}
          >
            <MoreHorizontal size={16} />
          </button>
          
          {showMenu && (
            <div 
              ref={menuRef}
              className="absolute right-0 top-full mt-1 w-36 bg-[#2f2f2f] border border-[#404040] rounded-lg shadow-lg shadow-black/50 py-1.5 z-50 flex flex-col"
            >
              <button onClick={handleRename} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-text-primary hover:bg-card transition-colors">
                <Pencil size={14} /> Rename
              </button>
              <button onClick={togglePin} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-text-primary hover:bg-card transition-colors">
                {chat.isPinned ? <PinOff size={14} /> : <Pin size={14} />} {chat.isPinned ? 'Unpin' : 'Pin'}
              </button>
              <div className="h-px bg-[#404040] my-1 w-full" />
              <button onClick={handleDelete} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[#f87171] hover:bg-card transition-colors">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatHistoryItem;
