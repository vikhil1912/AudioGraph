import { useCallback } from 'react';
import { useUploadContext } from '../context/UploadContext';
import { useChatHistory } from './useChatHistory';
import { uploadAudio, getMeetingStatus } from '../services/api';

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/m4a'];
const ACCEPTED_EXTENSIONS = ['.mp3', '.wav', '.m4a'];

/**
 * Hook for handling audio file uploads and pipeline transitions.
 */
export function useAudioUpload() {
  const { state: uploadState, dispatch: uploadDispatch } = useUploadContext();
  const { createChat, updateStatus } = useChatHistory();

  const validateFile = useCallback((file) => {
    if (!file) return 'No file selected';

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const isValidType = ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext);

    if (!isValidType) {
      return `Unsupported format. Please upload ${ACCEPTED_EXTENSIONS.join(', ')} files.`;
    }

    // 500MB max
    if (file.size > 500 * 1024 * 1024) {
      return 'File too large. Maximum size is 500MB.';
    }

    return null;
  }, []);

  const startUpload = useCallback(
    async (file) => {
      const validationError = validateFile(file);
      if (validationError) {
        uploadDispatch({ type: 'UPLOAD_ERROR', payload: validationError });
        return null;
      }

      // Request notification permission if not already granted/denied
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(console.error);
      }

      uploadDispatch({ type: 'START_UPLOAD', payload: { file } });

      try {
        // Call the API
        const result = await uploadAudio(file);
        const meetingId = result.meetingId || result.meeting_id;

        uploadDispatch({ type: 'SET_MEETING_ID', payload: meetingId });

        // Create the chat entry
        const title = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        createChat({
          id: meetingId,
          title,
          audioFile: file.name,
          status: 'processing',
          duration: 0,
        });

        // The WebSocket in ChatPage will now handle listening for status updates!
        uploadDispatch({ type: 'UPLOAD_COMPLETE' });
        return meetingId;
      } catch (error) {
        const errorMsg = error.message || 'Upload failed. Please try again.';
        uploadDispatch({ type: 'UPLOAD_ERROR', payload: errorMsg });
        return null;
      }
    },
    [validateFile, uploadDispatch, createChat, updateStatus]
  );

  const reset = useCallback(() => {
    uploadDispatch({ type: 'RESET' });
  }, [uploadDispatch]);

  return {
    ...uploadState,
    startUpload,
    reset,
    validateFile,
    acceptedExtensions: ACCEPTED_EXTENSIONS,
  };
}
