import React, { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useChatHistory } from '../../hooks/useChatHistory';
import { getMeeting, listMeetings, getWsUrl } from '../../services/api';

const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const { chats, updateStatus, loadChats } = useChatHistory();
  const pollingChatsRef = useRef(new Set());
  const hasLoadedRef = useRef(false);

  // Load initial chats from API
  useEffect(() => {
    if (hasLoadedRef.current) return;
    const fetchChats = async () => {
      try {
        const data = await listMeetings();
        // The API returns meetings as a list of dicts. Map them to our frontend schema if needed.
        // Backend returns: [{ _id, meeting_id, title, status, ... }]
        const formatted = data.map(m => ({
          id: m.meeting_id || m._id,
          title: m.original_name || m.title || 'New Audio Chat',
          audioFile: m.audio_url || '',
          status: m.status || 'ready',
          duration: m.duration || 0,
          createdAt: m.created_at,
          messages: [] // We don't fetch full message history here, just metadata for sidebar
        }));
        loadChats(formatted);
        hasLoadedRef.current = true;
      } catch (err) {
        console.error("Failed to load meetings:", err);
      }
    };
    fetchChats();
  }, [loadChats]);

  // Background sync for chats that were uploading during a page reload
  useEffect(() => {
    const pendingChats = chats.filter(c => c.status !== 'ready' && c.status !== 'error');
    
    pendingChats.forEach(chat => {
      if (pollingChatsRef.current.has(chat.id)) return;
      pollingChatsRef.current.add(chat.id);
      
      const connectWebSocket = async () => {
        // Guarantee token freshness using the API wrapper that handles auto-refresh
        try {
          await getMeeting(chat.id);
        } catch (e) {}

        const token = localStorage.getItem('audiograph_access_token');
        if (!token) {
          pollingChatsRef.current.delete(chat.id);
          return;
        }

        let ws;
        let reconnectTimeout;
        const wsUrl = getWsUrl(`/api/ws/meetings/${chat.id}?token=${token}`);

        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.status) {
              updateStatus(chat.id, data.status);
              if (data.status === 'ready' || data.status === 'error') {
                if (data.status === 'ready' && 'Notification' in window && Notification.permission === 'granted') {
                  try {
                    new Notification('Audio Processing Complete', {
                      body: `"${chat.title}" is ready for analysis.`,
                      requireInteraction: true
                    });
                  } catch (e) {}
                }
                ws.close(1000);
                pollingChatsRef.current.delete(chat.id);
              }
            }
          } catch (e) {
            console.error("Failed to parse WebSocket message", e);
          }
        };

        ws.onclose = (e) => {
          if (e.code !== 1000 && e.code !== 1008) {
            reconnectTimeout = setTimeout(connectWebSocket, 5000);
          } else {
            pollingChatsRef.current.delete(chat.id);
          }
        };
      };

      connectWebSocket();
    });
  }, [chats, updateStatus]);

  return (
    <div className="flex h-screen w-full bg-base overflow-hidden text-text-primary">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="flex flex-col flex-1 h-full min-w-0">
        <TopBar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          showGraph={showGraph}
          onToggleGraph={() => setShowGraph(!showGraph)}
        />
        <main className="flex-1 overflow-hidden relative">
          <Outlet context={{ showGraph, setShowGraph }} />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
