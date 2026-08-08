import React from 'react';
import { useChatHistory } from '../../hooks/useChatHistory';
import { groupByRecency } from '../../utils/formatDate';
import ChatHistoryItem from './ChatHistoryItem';

const ChatHistoryList = ({ searchQuery }) => {
  const { chats, activeChatId } = useChatHistory();

  // Filter chats based on search query
  const filteredChats = React.useMemo(() => {
    if (!searchQuery?.trim()) return chats || [];
    
    const query = searchQuery.toLowerCase();
    return (chats || []).filter(chat => 
      chat.title?.toLowerCase().includes(query)
    );
  }, [chats, searchQuery]);

  const pinnedChats = React.useMemo(() => filteredChats.filter(c => c.isPinned), [filteredChats]);
  const unpinnedChats = React.useMemo(() => filteredChats.filter(c => !c.isPinned), [filteredChats]);

  // Group unpinned chats
  const groupedChats = React.useMemo(() => {
    return groupByRecency(unpinnedChats);
  }, [unpinnedChats]);

  if (!filteredChats.length) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-text-muted">
          {searchQuery ? 'No matching conversations found.' : 'No conversations yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      {pinnedChats.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="px-4 py-2 text-xs font-bold text-text-primary">Pinned</h3>
          {pinnedChats.map(chat => (
            <ChatHistoryItem 
              key={chat.id} 
              chat={chat} 
              isActive={chat.id === activeChatId} 
            />
          ))}
        </div>
      )}

      {groupedChats.today?.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="px-4 py-2 text-xs font-bold text-text-primary">Today</h3>
          {groupedChats.today.map(chat => (
            <ChatHistoryItem 
              key={chat.id} 
              chat={chat} 
              isActive={chat.id === activeChatId} 
            />
          ))}
        </div>
      )}

      {groupedChats.previous7Days?.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="px-4 py-2 text-xs font-bold text-text-primary">Previous 7 Days</h3>
          {groupedChats.previous7Days.map(chat => (
            <ChatHistoryItem 
              key={chat.id} 
              chat={chat} 
              isActive={chat.id === activeChatId} 
            />
          ))}
        </div>
      )}

      {groupedChats.older?.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="px-4 py-2 text-xs font-bold text-text-primary">Older</h3>
          {groupedChats.older.map(chat => (
            <ChatHistoryItem 
              key={chat.id} 
              chat={chat} 
              isActive={chat.id === activeChatId} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatHistoryList;
