import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useChatHistory } from '../../hooks/useChatHistory';
import { sendQuery, getChatHistory } from '../../services/api';
import AudioPlayerBar from '../audio/AudioPlayerBar';
import MessageList from './MessageList';
import EmptyState from './EmptyState';
import ChatInput from './ChatInput';

export default function ChatWindow({ chatId }) {
  const { activeChat, addMessage, updateMessage, updateChat } = useChatHistory();
  const messages = activeChat?.messages || [];
  const [isLoading, setIsLoading] = useState(false);
  const audioPlayerRef = useRef(null);
  const loadedChatIdRef = useRef(null);

  useEffect(() => {
    if (loadedChatIdRef.current === chatId) return;
    loadedChatIdRef.current = chatId;

    const loadHistory = async () => {
      try {
        const history = await getChatHistory(chatId);
        if (history) {
          const mappedMessages = history.map(m => ({
            id: m.msg_id || m.id,
            role: m.role,
            content: m.content,
            sources: m.sources || [],
            createdAt: m.created_at || m.createdAt
          }));
          updateChat(chatId, { messages: mappedMessages });
        }
      } catch (err) {
        console.error("Failed to load chat history", err);
      }
    };
    loadHistory();
  }, [chatId, updateChat]);

  const handleSeekAudio = useCallback((time) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.seekTo(time);
    }
  }, []);

  const handleSend = useCallback(async (content) => {
    if (!content.trim() || isLoading) return;

    const userMessageId = Date.now().toString();
    addMessage(chatId, {
      id: userMessageId,
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    });

    const aiMessageId = (Date.now() + 1).toString();
    addMessage(chatId, {
      id: aiMessageId,
      role: 'assistant',
      content: '...',
      createdAt: new Date().toISOString()
    });

    setIsLoading(true);

    try {
      const response = await sendQuery(chatId, content);
      
      updateMessage(chatId, aiMessageId, {
        content: response.answer || response.content,
        sources: response.sources || []
      });
    } catch (error) {
      console.error('Error sending query:', error);
      updateMessage(chatId, aiMessageId, {
        content: 'Sorry, I encountered an error while processing your request.',
        sources: []
      });
    } finally {
      setIsLoading(false);
    }
  }, [chatId, isLoading, addMessage, updateMessage]);

  const handleSuggestionClick = (suggestion) => {
    handleSend(suggestion);
  };

  const handleRetry = useCallback(async (aiMessageId) => {
    if (isLoading) return;
    const aiMessageIndex = messages.findIndex(m => m.id === aiMessageId);
    if (aiMessageIndex === -1) return;

    const lastUserMessage = [...messages].slice(0, aiMessageIndex).reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    setIsLoading(true);
    updateMessage(chatId, aiMessageId, { content: '...', sources: [] });

    try {
      const response = await sendQuery(chatId, lastUserMessage.content);
      updateMessage(chatId, aiMessageId, {
        content: response.answer || response.content,
        sources: response.sources || []
      });
    } catch (error) {
      console.error('Error retrying query:', error);
      updateMessage(chatId, aiMessageId, {
        content: 'Sorry, I encountered an error while processing your request.',
        sources: []
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, chatId, isLoading, updateMessage]);

  const handleEdit = useCallback(async (userMessageId, newContent) => {
    if (isLoading) return;
    updateMessage(chatId, userMessageId, { content: newContent });

    const userMessageIndex = messages.findIndex(m => m.id === userMessageId);
    const nextAiMessage = messages.slice(userMessageIndex + 1).find(m => m.role === 'assistant');

    setIsLoading(true);
    if (nextAiMessage) {
      updateMessage(chatId, nextAiMessage.id, { content: '...', sources: [] });
    }

    try {
      const response = await sendQuery(chatId, newContent);
      
      if (nextAiMessage) {
        updateMessage(chatId, nextAiMessage.id, {
          content: response.answer || response.content,
          sources: response.sources || []
        });
      } else {
        addMessage(chatId, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.answer || response.content,
          sources: response.sources || [],
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error editing query:', error);
      if (nextAiMessage) {
        updateMessage(chatId, nextAiMessage.id, {
          content: 'Sorry, I encountered an error while processing your request.',
          sources: []
        });
      } else {
        addMessage(chatId, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request.',
          createdAt: new Date().toISOString()
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, chatId, isLoading, updateMessage, addMessage]);

  const hasMessages = messages && messages.length > 0;

  return (
    <div className="flex flex-col h-full bg-base relative overflow-hidden">
      {/* Audio Player Bar acts as the top sticky element inside the chat content area */}
      <div className="flex-shrink-0 z-10 border-b border-border-subtle bg-base/80 backdrop-blur-md">
        <AudioPlayerBar chatId={chatId} ref={audioPlayerRef} />
      </div>

      {hasMessages ? (
        <MessageList 
          messages={messages} 
          onSeekAudio={handleSeekAudio} 
          onRetry={handleRetry}
          onEdit={handleEdit}
        />
      ) : (
        <EmptyState onSuggestionClick={handleSuggestionClick} />
      )}

      <div className="mt-auto">
        <ChatInput 
          onSend={handleSend} 
          disabled={isLoading}
          showSuggestions={!hasMessages}
          onSuggestionClick={handleSuggestionClick}
        />
      </div>
    </div>
  );
}
