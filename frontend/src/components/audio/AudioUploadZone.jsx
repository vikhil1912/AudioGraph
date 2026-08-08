import { useState, useRef, useCallback } from 'react';
import { UploadCloud } from 'lucide-react';

export default function AudioUploadZone({ onFileSelect }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const validExtensions = ['.mp3', '.wav', '.m4a'];
      const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (validExtensions.includes(extension) || file.type.startsWith('audio/')) {
        onFileSelect(file);
      } else {
        alert('Unsupported file format. Please upload MP3, WAV, or M4A.');
      }
    }
  }, [onFileSelect]);

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleZoneClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className={`w-full max-w-xl mx-auto border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors
        ${isDragging ? 'border-accent-from bg-accent-from/10' : 'border-border-subtle hover:border-accent-from/50 hover:bg-accent-from/5'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleZoneClick}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInputChange} 
        className="hidden" 
        accept=".mp3,.wav,.m4a,audio/*" 
      />
      
      <div className="flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-accent-from/10 flex items-center justify-center mb-4">
          <UploadCloud className="w-8 h-8 text-accent-from" />
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-1">Drop your audio file here</h3>
        <p className="text-text-muted text-sm mb-4">or click to browse</p>
        <p className="text-xs text-text-muted mt-4">Supports MP3, WAV, M4A</p>
      </div>
    </div>
  );
}
