import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NAVIGATION_ITEMS, APP_NAME } from '../constants';
import { LogOut, Hexagon, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabase';

interface SidebarProps {
  onLogout?: () => void;
  userRole?: 'user' | 'admin';
  activeTab?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, userRole, activeTab }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    if (onLogout) {
      onLogout();
    } else {
      navigate('/login');
    }
  };

  const getRouteFromId = (id: string): string => {
    switch(id) {
      case 'contents': return '/app/courses';
      case 'community': return '/app/community';
      case 'support': return '/app/support';
      case 'home': default: return '/app';
    }
  };

  const isTabActive = (itemId: string, currentTab?: string) => {
    if (!currentTab) {
      const path = location.pathname;
      if (itemId === 'home' && (path === '/app' || path === '/app/')) return true;
      if (itemId === 'contents' && path.includes('/courses')) return true;
      if (itemId === 'community' && path.includes('/community')) return true;
      if (itemId === 'support' && path.includes('/support')) return true;
      return false;
    }
    return itemId === currentTab;
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
        {NAVIGATION_ITEMS.map((item) => {
          const route = getRouteFromId(item.id);
          const isActive = isTabActive(item.id, activeTab);
          
          return (
            <Link
              key={item.id}
              to={route}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-surfaceHighlight text-white border border-border' 
                  : 'text-textMuted hover:text-white hover:bg-surfaceHighlight/50'}
              `}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}

        {/* Admin Link - Apenas se userRole for admin */}
        {userRole === 'admin' && (
          <div className="pt-4 mt-4 border-t border-border/30">
             <p className="px-4 text-xs font-semibold text-textMuted uppercase mb-2">Administração</p>
             <Link
              to="/app/admin"
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                ${activeTab === 'admin' || location.pathname.includes('/admin')
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                  : 'text-textMuted hover:text-red-400 hover:bg-red-500/5'}
              `}
            >
              <ShieldCheck size={18} />
              Painel Admin
            </Link>
          </div>
        )}
      </nav>

      {/* Footer / User */}
      <div className="p-4 border-t border-border/50">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-textMuted hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={18} />
          Sair da conta
        </button>
      </div>
    </aside>
  );
};