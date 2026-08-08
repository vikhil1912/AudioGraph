import { useMemo, useCallback } from 'react';
import { useChatContext } from '../context/ChatContext';

/**
 * Convenience hook wrapping ChatContext with typed actions.
 */
export function useChatHistory() {
  const { state, dispatch } = useChatContext();

  const chats = state.chats;
  const activeChatId = state.activeChatId;
  const isLoading = state.isLoading;

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) || null,
    [chats, activeChatId]
  );

  const createChat = useCallback(
    ({ id, title, audioFile, status, duration }) => {
      dispatch({
        type: 'CREATE_CHAT',
        payload: { id, title, audioFile, status, duration },
      });
    },
    [dispatch]
  );

  const setActiveChat = useCallback(
    (chatId) => {
      dispatch({ type: 'SET_ACTIVE', payload: chatId });
    },
    [dispatch]
  );

  const addMessage = useCallback(
    (chatId, message) => {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { chatId, message },
      });
    },
    [dispatch]
  );

  const updateMessage = useCallback(
    (chatId, messageId, updates) => {
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: { chatId, messageId, updates },
      });
    },
    [dispatch]
  );

  const updateStatus = useCallback(
    (chatId, status) => {
      dispatch({
        type: 'UPDATE_STATUS',
        payload: { chatId, status },
      });
    },
    [dispatch]
  );

  const updateChat = useCallback(
    (chatId, updates) => {
      dispatch({
        type: 'UPDATE_CHAT',
        payload: { chatId, updates },
      });
    },
    [dispatch]
  );

  const deleteChat = useCallback(
    (chatId) => {
      dispatch({ type: 'DELETE_CHAT', payload: chatId });
    },
    [dispatch]
  );

  const searchChats = useCallback(
    (query) => {
      if (!query || !query.trim()) return chats;
      const lowerQuery = query.toLowerCase();
      return chats.filter((c) =>
        c.title.toLowerCase().includes(lowerQuery)
      );
    },
    [chats]
  );

  const loadChats = useCallback(
    (chatsData) => {
      dispatch({ type: 'LOAD_CHATS', payload: chatsData });
    },
    [dispatch]
  );

  return {
    chats,
    activeChatId,
    activeChat,
    isLoading,
    createChat,
    setActiveChat,
    addMessage,
    updateMessage,
    updateStatus,
    updateChat,
    deleteChat,
    searchChats,
    loadChats,
  };
}
