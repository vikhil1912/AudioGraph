import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause } from 'lucide-react';
import { formatDuration } from '../../utils/formatTime';

const AudioPlayerBar = forwardRef(({ chatId }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useImperativeHandle(ref, () => ({
    seekTo: (seconds) => {
      if (audioRef.current) {
        audioRef.current.currentTime = seconds;
        setCurrentTime(seconds);
        if (!isPlaying) {
          audioRef.current.play().catch(e => console.error(e));
          setIsPlaying(true);
        }
      }
    }
  }));

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error(e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(duration);
  };

  // Fallback formatter if formatDuration is undefined or errors
  const safeFormatDuration = (time) => {
    if (typeof formatDuration === 'function') {
      try { return formatDuration(time); } catch (e) { /* ignore */ }
    }
    const m = Math.floor((time || 0) / 60);
    const s = Math.floor((time || 0) % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const token = localStorage.getItem('audiograph_access_token');
  const audioSrc = chatId && token ? `/api/meetings/${chatId}/audio?token=${token}` : '';

  return (
    <div className="h-14 bg-panel border-b border-border-subtle flex items-center gap-4 px-4 w-full">
      {audioSrc && (
        <audio 
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          className="hidden"
          preload="metadata"
        />
      )}
      
      <button 
        onClick={togglePlay}
        className="rounded-full bg-accent-from/10 p-2 text-accent-from hover:bg-accent-from/20 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-from shrink-0"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0 flex items-center h-full">
        <input 
          type="range" 
          min="0" 
          max={duration || 100} 
          value={currentTime} 
          onChange={handleSeek}
          className="w-full h-1 bg-border-subtle rounded-lg appearance-none cursor-pointer accent-accent-from"
          aria-label="Audio progress"
        />
      </div>

      <div className="text-xs text-text-muted font-mono whitespace-nowrap shrink-0">
        {safeFormatDuration(currentTime)} / {safeFormatDuration(duration)}
      </div>
    </div>
  );
});

AudioPlayerBar.displayName = 'AudioPlayerBar';
export default AudioPlayerBar;
