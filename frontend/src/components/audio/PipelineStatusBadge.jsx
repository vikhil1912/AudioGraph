import { useState } from 'react';

const stages = [
  'Uploading audio...',
  'Transcribing speech...',
  'Extracting knowledge...',
  'Building graph...'
];

export default function PipelineStatusBadge({ currentStage }) {
  if (currentStage === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-32">
        <span className="text-red-500 font-medium text-lg">Processing Failed</span>
      </div>
    );
  }

  // We want to render a rolling list of text that scrolls infinitely.
  // We'll duplicate the list to make the loop seamless.
  const rollingList = [...stages, ...stages];

  return (
    <div className="flex flex-col items-center justify-center w-full h-32">
      <div className="relative h-8 w-full flex flex-col items-center justify-start overflow-hidden pointer-events-none fade-mask">
        <div className="flex flex-col items-center animate-roll-up">
          {rollingList.map((text, i) => (
            <div key={i} className="h-8 flex items-center justify-center text-lg font-medium text-text-primary whitespace-nowrap">
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
