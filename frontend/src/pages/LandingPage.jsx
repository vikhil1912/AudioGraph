import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Quote, Users, Zap, ChevronRight, Mic } from 'lucide-react';
import { useAppStats } from '../context/StatsContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const stats = useAppStats() || { total_users: 0, active_users: 0 };

  return (
    <div className="min-h-screen bg-base text-text-primary overflow-x-hidden">
      {/* Navbar */}
      <nav className="w-full flex items-center justify-between px-6 md:px-12 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-text-primary flex items-center justify-center">
            <Mic className="w-4 h-4 text-base" />
          </div>
          <span className="text-lg font-bold tracking-tight">AudioGraph</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="text-sm font-medium text-base bg-text-primary rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-24 pb-32 px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-4 px-5 py-2 rounded-full border border-border-subtle mb-10 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Registered: {stats.total_users}</span>
            </div>
            <div className="w-px h-3 bg-border-subtle"></div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse-dot"></span>
              <span className="text-xs font-semibold text-success uppercase tracking-wider">Live Now: {stats.active_users}</span>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8">
            Chat with your meetings.
            <br />
            <span className="text-text-muted">Visually mapped.</span>
          </h1>
          
          <p className="text-[16px] md:text-lg text-text-muted max-w-2xl mx-auto mb-12 leading-relaxed">
            Upload any audio file. We transcribe it, identify the speakers, 
            extract the core knowledge into an interactive graph, and let you 
            chat with the insights — all backed by source citations.
          </p>

          <button 
            onClick={() => navigate('/register')}
            className="group inline-flex items-center gap-3 bg-text-primary text-base px-8 py-4 rounded-full font-semibold text-base hover:opacity-90 transition-opacity"
          >
            Start Analyzing
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </main>

      {/* How It Works */}
      <section className="border-t border-border-subtle py-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Audio in. Knowledge out.</h2>
          </div>

          {/* Pipeline Steps */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-border-subtle rounded-2xl overflow-hidden mb-24">
            {[
              { step: '01', title: 'Upload', desc: 'Drop an MP3, WAV, or M4A file of any meeting, lecture, or interview.' },
              { step: '02', title: 'Transcribe', desc: 'Whisper-powered transcription with automatic speaker diarization.' },
              { step: '03', title: 'Extract', desc: 'LLM extracts entities, relations, topics, and action items into a knowledge graph.' },
              { step: '04', title: 'Chat', desc: 'Ask questions grounded in the graph with timestamped source citations.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-card p-8 flex flex-col">
                <span className="text-xs font-mono text-text-muted mb-4">{step}</span>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard 
              icon={<Users />}
              title="Speaker Diarization"
              description="Automatically detects who is speaking and separates the transcript by individual voices. Know exactly who said what."
            />
            <FeatureCard 
              icon={<Network />}
              title="Knowledge Graph"
              description="Extracts entities, concepts, and the complex relationships between them into a semantic graph stored in Neo4j."
            />
            <FeatureCard 
              icon={<Zap />}
              title="Interactive Visualization"
              description="Explore your extracted knowledge through a zoomable, pannable graph powered by React Flow with persistent layouts."
            />
            <FeatureCard 
              icon={<Quote />}
              title="Source Citations"
              description="Every answer points exactly to the audio timestamp it was derived from. One click to jump to the moment."
            />
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-t border-border-subtle py-16 px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-6">Built With</p>
          <div className="flex flex-wrap justify-center gap-4">
            {['React', 'React Flow', 'Neo4j', 'Whisper', 'Gemini', 'FastAPI', 'TailwindCSS'].map(tech => (
              <span key={tech} className="px-4 py-2 rounded-full border border-border-subtle text-sm text-text-muted hover:text-text-primary hover:border-text-muted transition-colors">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-8 px-6 text-center">
        <p className="text-sm text-text-muted">AudioGraph RAG — Turn conversations into knowledge.</p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="border border-border-subtle p-6 rounded-2xl hover:bg-card transition-colors group">
    <div className="w-10 h-10 rounded-lg border border-border-subtle flex items-center justify-center mb-5 group-hover:border-text-muted transition-colors">
      {React.cloneElement(icon, { className: "w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors" })}
    </div>
    <h3 className="text-lg font-semibold mb-2 text-text-primary">{title}</h3>
    <p className="text-sm text-text-muted leading-relaxed">{description}</p>
  </div>
);

export default LandingPage;
