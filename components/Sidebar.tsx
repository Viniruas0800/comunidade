import React from 'react';
import { NAVIGATION_ITEMS, APP_NAME } from '../constants';
import { LogOut, Hexagon, ShieldCheck } from 'lucide-react';
import { TabOption } from '../types';

interface SidebarProps {
  onLogout: () => void;
  userRole?: 'user' | 'admin';
  activeTab?: TabOption;
  onTabChange?: (tab: TabOption) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, userRole, activeTab, onTabChange }) => {
  
  const getTabFromId = (id: string): TabOption => {
      switch(id) {
          case 'contents': return TabOption.CONTENTS;
          case 'community': return TabOption.COMMUNITY;
          case 'home': default: return TabOption.HOME;
      }
  };

  // Helper inverso para estilização
  const isTabActive = (itemId: string, currentTab?: TabOption) => {
      if (itemId === 'home' && currentTab === TabOption.HOME) return true;
      if (itemId === 'contents' && currentTab === TabOption.CONTENTS) return true;
      if (itemId === 'community' && currentTab === TabOption.COMMUNITY) return true;
      return false;
  };

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
            onClick={() => onTabChange && onTabChange(getTabFromId(item.id))}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
              ${isTabActive(item.id, activeTab)
                ? 'bg-surfaceHighlight text-white border border-border' 
                : 'text-textMuted hover:text-white hover:bg-surfaceHighlight/50'}
            `}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}

        {/* Admin Link - Apenas se userRole for admin */}
        {userRole === 'admin' && (
          <div className="pt-4 mt-4 border-t border-border/30">
             <p className="px-4 text-xs font-semibold text-textMuted uppercase mb-2">Administração</p>
             <button
              onClick={() => onTabChange && onTabChange(TabOption.ADMIN)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                ${activeTab === TabOption.ADMIN 
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                  : 'text-textMuted hover:text-red-400 hover:bg-red-500/5'}
              `}
            >
              <ShieldCheck size={18} />
              Painel Admin
            </button>
          </div>
        )}
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