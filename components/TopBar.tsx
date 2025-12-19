import React from 'react';
import { TabOption } from '../types';

interface TopBarProps {
  activeTab: TabOption;
  onTabChange: (tab: TabOption) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <header className="h-20 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-10 flex items-center justify-center px-6">
      <div className="bg-surface border border-border p-1 rounded-full flex items-center">
        <button
          onClick={() => onTabChange(TabOption.HOME)}
          className={`
            px-8 py-2 rounded-full text-sm font-medium transition-all duration-200
            ${activeTab === TabOption.HOME 
              ? 'bg-surfaceHighlight text-white shadow-sm' 
              : 'text-textMuted hover:text-white'}
          `}
        >
          Início
        </button>
        <button
          onClick={() => onTabChange(TabOption.CONTENTS)}
          className={`
            px-8 py-2 rounded-full text-sm font-medium transition-all duration-200
            ${activeTab === TabOption.CONTENTS 
              ? 'bg-primary text-white shadow-[0_0_15px_rgba(139,44,245,0.3)]' 
              : 'text-textMuted hover:text-white'}
          `}
        >
          Conteúdos
        </button>
      </div>
    </header>
  );
};