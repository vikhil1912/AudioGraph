import React from 'react';
import { Search } from 'lucide-react';

const SidebarSearch = ({ value, onChange }) => {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={16} className="text-text-muted" />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder="Search conversations..."
        className="w-full pl-9 pr-3 py-2 bg-card border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-from/50 focus:border-accent-from/50 transition-colors"
      />
    </div>
  );
};

export default SidebarSearch;
