import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function MessageList({ messages, onSeekAudio, onEdit, onRetry }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 md:p-6">
      {messages.map((message) => (
        <MessageBubble
          key={message.id || Math.random().toString()}
          message={message}
          onSeekAudio={onSeekAudio}
          onEdit={onEdit}
          onRetry={onRetry}
        />
      ))}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
