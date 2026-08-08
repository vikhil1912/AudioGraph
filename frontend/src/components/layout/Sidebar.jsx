import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioWaveform, PanelLeftClose, LogOut } from 'lucide-react';
import NewChatButton from '../sidebar/NewChatButton';
import SidebarSearch from '../sidebar/SidebarSearch';
import ChatHistoryList from '../sidebar/ChatHistoryList';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-panel flex flex-col border-r border-border-subtle transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between p-4 h-14 border-b border-border-subtle">
          <div 
            className="flex items-center gap-2 text-text-primary font-bold text-lg cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
          >
            <AudioWaveform className="text-accent-from" size={24} />
            <span>AudioGraph</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden"
            aria-label="Close Sidebar"
          >
            <PanelLeftClose size={20} />
          </Button>
        </div>

        <div className="p-4 border-b border-border-subtle flex flex-col gap-4">
          <NewChatButton />
          <SidebarSearch value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="flex-1 overflow-y-auto">
          <ChatHistoryList searchQuery={searchQuery} />
        </div>

        {/* User Profile / Logout */}
        {user && (
          <div className="p-4 border-t border-border-subtle flex items-center justify-between bg-card/50">
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-text-primary truncate">
                {user.email.split('@')[0]}
              </span>
              <span className="text-xs text-text-muted truncate">
                {user.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              title="Log out"
              className="text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <LogOut size={18} />
            </Button>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
