import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit } from 'lucide-react';
import { useAudioUpload } from '../../hooks/useAudioUpload';

const NewChatButton = () => {
  const navigate = useNavigate();
  const { reset } = useAudioUpload();

  const handleClick = () => {
    reset();
    navigate('/app');
  };

  return (
    <button 
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 bg-card/80 text-text-primary rounded-lg hover:bg-card transition-all duration-200"
    >
      <Edit size={18} className="text-text-primary" />
      <span className="text-sm font-medium">New chat</span>
    </button>
  );
};

export default NewChatButton;
