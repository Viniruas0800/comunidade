import React from 'react';
import { NAVIGATION_ITEMS, APP_NAME } from '../constants';
import { LogOut, Hexagon } from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  return (
    <aside className="w-64 h-screen bg-surface border-r border-border flex flex-col fixed left-0 top-0 z-20 hidden md:flex">
      {/* Logo Area */}
      <div className="p-6 flex items-center gap-3 border-b border-border/50">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_10px_rgba(139,44,245,0.5)]">
          <Hexagon size={18} className="text-white fill-current" />
        </div>
        <span className="font-bold text-lg tracking-tight text-white">{APP_NAME}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAVIGATION_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
              ${item.id === 'home' 
                ? 'bg-surfaceHighlight text-white border border-border' 
                : 'text-textMuted hover:text-white hover:bg-surfaceHighlight/50'}
            `}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer / User */}
      <div className="p-4 border-t border-border/50">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-textMuted hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={18} />
          Sair da conta
        </button>
      </div>
    </aside>
  );
};