import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useChatHistory } from '../hooks/useChatHistory';
import { useAudioUpload } from '../hooks/useAudioUpload';
import { getGraphData, getMeeting, getWsUrl } from '../services/api';
import ChatWindow from '../components/chat/ChatWindow';
import GraphVisualization from '../components/graph/GraphVisualization';
import { Mic } from 'lucide-react';
import PipelineStatusBadge from '../components/audio/PipelineStatusBadge';

const LOADING_VIDEO = import.meta.env.VITE_LOADING_VIDEO;

const ChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { chats, setActiveChat, updateStatus } = useChatHistory();
  const { showGraph, setShowGraph } = useOutletContext();
  const { meetingId: activeMeetingId, isUploading, pipelineStage } = useAudioUpload();
  const [graphData, setGraphData] = useState(null);
  
  const currentChat = chats.find(c => c.id === chatId);

  // Is THIS chat actively being processed right now?
  const isActivelyProcessing = isUploading && activeMeetingId === chatId;

  useEffect(() => {
    if (chatId) {
      setActiveChat(chatId);
      setShowGraph(false);
    }
  }, [chatId, setActiveChat, setShowGraph]);

  // Connect to WebSocket for real-time status updates
  useEffect(() => {
    if (!currentChat) return;
    if (currentChat.status === 'ready' || currentChat.status === 'error') return;

    let ws = null;
    let isComponentMounted = true;
    let reconnectTimeout = null;

    const connectWebSocket = async () => {
      // 1. Fetch meeting via API to guarantee the token is refreshed if expired
      try {
        const meeting = await getMeeting(chatId);
        if (meeting) {
          updateStatus(chatId, meeting.status);
          // If it finished while we were disconnected, we don't need a WebSocket
          if (meeting.status === 'ready' || meeting.status === 'error') {
            return;
          }
        }
      } catch (e) {
        console.error("Failed to fetch initial meeting status before WS connect", e);
      }

      const token = localStorage.getItem('audiograph_access_token');
      if (!token) return;

      const wsUrl = getWsUrl(`/api/ws/meetings/${chatId}?token=${token}`);

      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status) {
            updateStatus(chatId, data.status);
            
            if (data.status === 'ready') {
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification('Audio Processing Complete', {
                    body: `Your audio file is ready for analysis.`,
                    requireInteraction: true
                  });
                } catch (e) {
                  console.error('Notification failed:', e);
                }
              }
              ws.close();
            } else if (data.status === 'error') {
              ws.close();
            }
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message", e);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = (e) => {
        // If closed abnormally, try reconnecting
        if (isComponentMounted && currentChat.status !== 'ready' && currentChat.status !== 'error' && e.code !== 1000 && e.code !== 1008) {
           reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      };
    };

    connectWebSocket();

    return () => {
      isComponentMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close(1000); // 1000 = normal closure
      }
    };
  }, [chatId, currentChat?.status, updateStatus]);

  useEffect(() => {
    if (chatId && showGraph && currentChat?.status === 'ready') {
      getGraphData(chatId).then(data => {
        setGraphData(data);
      }).catch(err => console.error("Error fetching graph data", err));
    }
  }, [chatId, showGraph, currentChat?.status]);

  if (!currentChat && chats.length > 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-primary h-full">
        <h2 className="text-xl font-bold mb-4">Chat not found</h2>
        <button 
          onClick={() => navigate('/app')}
          className="px-4 py-2 bg-card hover:bg-border-subtle text-text-primary rounded-xl transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        {showGraph ? (
          <GraphVisualization graphData={graphData} chatId={chatId} />
        ) : isActivelyProcessing || (currentChat && currentChat.status !== 'ready') ? (
          <div className="flex-1 overflow-y-auto h-full p-6">
            <div className="flex flex-col items-center w-full min-h-full justify-center py-4 max-w-6xl mx-auto">
              <div className="flex flex-col items-center flex-1 w-full max-w-2xl">
                <div className="relative">
                  <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-br from-accent-from to-accent-to rounded-full"></div>
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-accent-from to-accent-to animate-float-orb glow-purple-strong flex items-center justify-center">
                    <Mic className="w-10 h-10 text-base" />
                  </div>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mt-8 text-text-primary text-center">Processing Your Audio</h1>
                <p className="text-text-muted text-center max-w-md mt-3">
                  Please wait while we transcribe and analyze your recording
                </p>
                
                <div className="mt-8 w-full min-h-[300px] flex flex-col items-center justify-center">
                  {LOADING_VIDEO ? (
                    <div className="relative w-full max-w-xl mx-auto rounded-2xl overflow-hidden border border-border-subtle min-h-[300px] flex flex-col items-center justify-center">
                      <video
                        src={LOADING_VIDEO}
                        autoPlay
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50" />
                      <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
                        <PipelineStatusBadge currentStage={pipelineStage || currentChat?.status} />
                        <p className="text-text-muted text-sm animate-pulse">Processing your audio...</p>
                      </div>
                    </div>
                  ) : (
                     <div className="w-full max-w-xl mx-auto border-2 border-border-subtle rounded-2xl p-12 bg-card flex flex-col items-center justify-center min-h-[250px]">
                        <PipelineStatusBadge currentStage={pipelineStage || currentChat?.status} />
                     </div>
                  )}
                  
                  <p className="text-text-muted/70 text-xs mt-6 text-center">
                    Feel free to switch chats or minimize the window. We'll send you a notification when it's ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ChatWindow chatId={chatId} />
        )}
      </div>
    </div>
  );
};

export default ChatPage;

