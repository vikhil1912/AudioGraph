import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Quote, Users, Mic } from 'lucide-react';
import AudioUploadZone from '../components/audio/AudioUploadZone';
import PipelineStatusBadge from '../components/audio/PipelineStatusBadge';
import { useAudioUpload } from '../hooks/useAudioUpload';
import { useChatHistory } from '../hooks/useChatHistory';

const LOADING_VIDEO = import.meta.env.VITE_LOADING_VIDEO;

const HomePage = () => {
  const navigate = useNavigate();
  const { isUploading, pipelineStage, meetingId, error, startUpload, reset } = useAudioUpload();
  const { setActiveChat } = useChatHistory();
  const videoRef = useRef(null);

  useEffect(() => {
    setActiveChat(null);
    // Reset any stale upload state from a previous session/navigation
    if (pipelineStage && pipelineStage !== 'ready') {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  useEffect(() => {
    if (pipelineStage === 'ready' && meetingId) {
      navigate(`/app/chat/${meetingId}`);
      reset();
    }
  }, [pipelineStage, meetingId, navigate, reset]);

  // Auto-play video when uploading starts
  useEffect(() => {
    if (isUploading && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isUploading]);

  const isProcessing = isUploading || (pipelineStage && pipelineStage !== 'ready' && pipelineStage !== 'error');

  // ── Error state ──
  if (pipelineStage === 'error') {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="w-full max-w-md mx-auto border-2 border-danger/30 rounded-2xl p-8 bg-card flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center">
            <span className="text-danger text-xl">✕</span>
          </div>
          <h3 className="text-lg font-semibold text-text-primary">Upload Failed</h3>
          <p className="text-sm text-text-muted">{error || 'Something went wrong. Please try again.'}</p>
          <button 
            onClick={reset}
            className="mt-2 px-6 py-2 bg-card border border-border-subtle rounded-lg text-sm text-text-primary hover:bg-border-subtle/30 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Default upload page ──
  return (
    <div className="flex-1 overflow-y-auto h-full p-6">
      <div className="flex flex-col lg:flex-row items-center w-full min-h-full justify-center lg:gap-16 py-4 max-w-6xl mx-auto">
        
        {/* Left Column: Upload Area */}
        <div className="flex flex-col items-center flex-1 w-full max-w-2xl">
          <div className="relative">
            <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-br from-accent-from to-accent-to rounded-full"></div>
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-accent-from to-accent-to animate-float-orb glow-purple-strong flex items-center justify-center">
              <Mic className="w-10 h-10 text-base" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mt-8 text-text-primary text-center">Ready to Analyze Your Audio?</h1>
          <p className="text-text-muted text-center max-w-md mt-3">
            Upload a meeting recording, lecture, or interview to start chatting with your audio
          </p>
          
          <div className="mt-8 w-full min-h-[300px] flex flex-col items-center justify-center">
            {isProcessing ? (
              <div className="flex flex-col items-center w-full">
                {LOADING_VIDEO ? (
                  /* Video inside the box */
                  <div className="relative w-full max-w-xl mx-auto rounded-2xl overflow-hidden border border-border-subtle min-h-[300px]">
                    <video
                      ref={videoRef}
                      src={LOADING_VIDEO}
                      autoPlay
                      loop
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
                      <PipelineStatusBadge currentStage={pipelineStage} />
                      <p className="text-text-muted text-sm animate-pulse">Processing your audio...</p>
                    </div>
                  </div>
                ) : (
                  /* Fallback: no video */
                  <div className="w-full max-w-xl mx-auto border-2 border-border-subtle rounded-2xl p-12 bg-card flex flex-col items-center justify-center min-h-[250px]">
                    <PipelineStatusBadge currentStage={pipelineStage} />
                  </div>
                )}
                
                <p className="text-text-muted/70 text-xs mt-6 text-center">
                  Feel free to switch chats or minimize the window. We'll send you a notification when it's ready.
                </p>
              </div>
            ) : (
              <AudioUploadZone onFileSelect={startUpload} />
            )}
          </div>
        </div>

        {/* Right Column: Feature Cards */}
        <div className="hidden md:flex flex-col gap-4 w-full max-w-xs shrink-0 mt-12 lg:mt-0">
          <div className="bg-card border border-border-subtle rounded-xl p-5 text-left flex items-start gap-4 hover:border-accent-from/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-accent-from/10 flex items-center justify-center shrink-0">
              <GitBranch className="w-5 h-5 text-accent-from" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Knowledge Graph</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">Entities and relations extracted automatically</p>
            </div>
          </div>
          
          <div className="bg-card border border-border-subtle rounded-xl p-5 text-left flex items-start gap-4 hover:border-accent-from/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-accent-from/10 flex items-center justify-center shrink-0">
              <Quote className="w-5 h-5 text-accent-from" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Source Citations</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">Every answer traced back to exact timestamps</p>
            </div>
          </div>
          
          <div className="bg-card border border-border-subtle rounded-xl p-5 text-left flex items-start gap-4 hover:border-accent-from/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-accent-from/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-accent-from" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Multi-Speaker</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">Speaker diarization identifies who said what</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;

