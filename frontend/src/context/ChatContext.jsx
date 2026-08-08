import { createContext, useContext, useReducer, useEffect } from 'react';
import { getMockChats } from '../services/mockData';

const ChatContext = createContext(null);

const STORAGE_KEY = 'audiograph_chats';

// ── Initial State ───────────────────────────────────────────────────────────

function loadInitialState() {
  return {
    chats: [],
    activeChatId: null,
  };
}

// ── Reducer ─────────────────────────────────────────────────────────────────

function chatReducer(state, action) {
  switch (action.type) {
    case 'CREATE_CHAT': {
      const newChat = {
        id: action.payload.id,
        title: action.payload.title || 'New Audio Chat',
        audioFile: action.payload.audioFile || '',
        status: action.payload.status || 'uploading',
        duration: action.payload.duration || 0,
        createdAt: new Date().toISOString(),
        messages: [],
      };
      return {
        ...state,
        chats: [newChat, ...state.chats],
        activeChatId: newChat.id,
      };
    }

    case 'SET_ACTIVE':
      return { ...state, activeChatId: action.payload };

    case 'ADD_MESSAGE': {
      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat.id === action.payload.chatId
            ? { ...chat, messages: [...chat.messages, action.payload.message] }
            : chat
        ),
      };
    }

    case 'UPDATE_MESSAGE': {
      const { chatId, messageId, updates } = action.payload;
      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map((m) =>
                  m.id === messageId ? { ...m, ...updates } : m
                ),
              }
            : chat
        ),
      };
    }

    case 'UPDATE_STATUS': {
      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat.id === action.payload.chatId
            ? { ...chat, status: action.payload.status }
            : chat
        ),
      };
    }

    case 'UPDATE_CHAT': {
      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat.id === action.payload.chatId
            ? { ...chat, ...action.payload.updates }
            : chat
        ),
      };
    }

    case 'DELETE_CHAT': {
      const remaining = state.chats.filter((c) => c.id !== action.payload);
      return {
        ...state,
        chats: remaining,
        activeChatId:
          state.activeChatId === action.payload
            ? remaining[0]?.id || null
            : state.activeChatId,
      };
    }

    case 'LOAD_CHATS':
      return { ...state, chats: action.payload };

    default:
      return state;
  }
}

// ── Provider ────────────────────────────────────────────────────────────────

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, null, loadInitialState);

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return ctx;
}

export default ChatContext;
