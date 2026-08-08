import { createContext, useContext, useReducer } from 'react';

const UploadContext = createContext(null);

const initialState = {
  isUploading: false,
  file: null,
  progress: 0,
  pipelineStage: null, // 'uploading' | 'transcribing' | 'extracting' | 'building_graph' | 'ready' | 'error'
  error: null,
  meetingId: null,
};

function uploadReducer(state, action) {
  switch (action.type) {
    case 'START_UPLOAD':
      return {
        ...state,
        isUploading: true,
        file: action.payload.file,
        progress: 0,
        pipelineStage: 'uploading',
        error: null,
        meetingId: null,
      };

    case 'SET_MEETING_ID':
      return { ...state, meetingId: action.payload };

    case 'SET_STAGE':
      return { ...state, pipelineStage: action.payload };

    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };

    case 'UPLOAD_COMPLETE':
      return {
        ...state,
        isUploading: false,
        pipelineStage: 'ready',
        progress: 100,
      };

    case 'UPLOAD_ERROR':
      return {
        ...state,
        isUploading: false,
        pipelineStage: 'error',
        error: action.payload,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function UploadProvider({ children }) {
  const [state, dispatch] = useReducer(uploadReducer, initialState);

  return (
    <UploadContext.Provider value={{ state, dispatch }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUploadContext() {
  const ctx = useContext(UploadContext);
  if (!ctx) {
    throw new Error('useUploadContext must be used within an UploadProvider');
  }
  return ctx;
}

export default UploadContext;
