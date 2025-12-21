import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Globe, Bell, User, Settings, LogOut, AtSign, MessageSquare, Megaphone, BookOpen, FileText, Check } from 'lucide-react';
import { UserProfile, Notification } from '../types';
import { getProfile, supabase, getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/supabase';

// Componente auxiliar para renderizar o ícone/avatar da notificação
const NotificationIcon: React.FC<{ notification: Notification }> = ({ notification }) => {
  const { type, trigger_user } = notification;

  // Notificações de Sistema: Design antigo (apenas ícone grande)
  if (type === 'system_alert' || type === 'course_update' || !trigger_user) {
    let iconComponent;
    let iconColor;

    switch (type) {
      case 'system_alert':
        iconComponent = <Megaphone size={20} />;
        iconColor = 'text-yellow-400';
        break;
      case 'course_update':
        iconComponent = <BookOpen size={20} />;
        iconColor = 'text-purple-400';
        break;
      default:
        iconComponent = <Bell size={20} />;
        iconColor = 'text-textMuted';
    }

    return (
      <div className={`flex-shrink-0 ${iconColor}`}>
        {iconComponent}
      </div>
    );
  }

  // Notificações Sociais: Novo Design (Avatar + Badge Roxa)
  if ((type === 'mention' || type === 'reply' || type === 'new_post') && trigger_user) {
    let badgeIcon;
    
    switch (type) {
      case 'mention':
        badgeIcon = <AtSign size={10} className="text-white" />;
        break;
      case 'reply':
        badgeIcon = <MessageSquare size={10} className="text-white" />;
        break;
      case 'new_post':
        badgeIcon = <FileText size={10} className="text-white" />;
        break;
      default:
        badgeIcon = <Bell size={10} className="text-white" />;
    }

    return (
      <div className="relative flex-shrink-0">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#262626] bg-surfaceHighlight flex items-center justify-center">
          {trigger_user.avatar_url ? (
            <img 
              src={trigger_user.avatar_url} 
              alt={trigger_user.username || trigger_user.full_name || 'Avatar'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={20} className="text-textMuted" />
          )}
        </div>
        {/* Badge Roxa com Ícone */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full border-2 border-surface flex items-center justify-center">
          {badgeIcon}
        </div>
      </div>
    );
  }

  // Fallback: ícone padrão
  return (
    <div className="flex-shrink-0 text-textMuted">
      <Bell size={20} />
    </div>
  );
};

interface TopBarProps {
  activeTab?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ activeTab }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/app' || location.pathname === '/app/';
  const isCourses = location.pathname.includes('/courses');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsFilter, setNotificationsFilter] = useState<'all' | 'alerts' | 'community'>('all');
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Busca perfil do usuário e notificações
  useEffect(() => {
    const fetchProfile = async () => {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profile = await getProfile(user.id);
          setUserProfile(profile);
          
          // Busca notificações
          const notifs = await getNotifications(user.id);
          setNotifications(notifs);
        }
      } else {
        // Mock para demo
        setUserProfile({ 
          id: 'mock', 
          email: 'test@example.com', 
          username: 'usuario',
          avatar_url: undefined,
          role: 'user' 
        } as UserProfile);
      }
    };
    fetchProfile();
    
    // Atualiza notificações a cada 30 segundos
    const interval = setInterval(() => {
      if (supabase && userProfile) {
        getNotifications(userProfile.id).then(setNotifications);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [userProfile?.id]);

  // Fecha os menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    if (isMenuOpen || isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isNotificationsOpen]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate('/login');
  };

  // Calcula notificações não lidas (excluindo new_post)
  const unreadCount = notifications.filter(n => !n.is_read && n.type !== 'new_post').length;

  // Filtra notificações baseado na aba selecionada
  const filteredNotifications = notifications.filter(n => {
    if (notificationsFilter === 'all') return true;
    if (notificationsFilter === 'alerts') {
      return n.type === 'system_alert' || n.type === 'course_update';
    }
    if (notificationsFilter === 'community') {
      return n.type === 'mention' || n.type === 'reply' || n.type === 'new_post';
    }
    return true;
  });

  const handleNotificationClick = async (notification: Notification) => {
    // Marca como lida
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
    }

    // Navega para o link se existir
    if (notification.link) {
      setIsNotificationsOpen(false);
      navigate(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userProfile) return;
    
    await markAllNotificationsAsRead(userProfile.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'mention':
        return <AtSign size={16} className="text-blue-400" />;
      case 'reply':
        return <MessageSquare size={16} className="text-green-400" />;
      case 'system_alert':
        return <Megaphone size={16} className="text-yellow-400" />;
      case 'course_update':
        return <BookOpen size={16} className="text-purple-400" />;
      case 'new_post':
        return <FileText size={16} className="text-gray-400" />;
      default:
        return <Bell size={16} className="text-textMuted" />;
    }
  };

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mes`;
    return `${Math.floor(months / 12)}a`;
  };

  return (
    <header className="h-20 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-10 flex items-center justify-between px-6">
      {/* Navegação Central */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-surface border border-border p-1 rounded-full flex items-center">
          <Link
            to="/app"
            className={`
              px-8 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${isHome
                ? 'bg-surfaceHighlight text-white shadow-sm' 
                : 'text-textMuted hover:text-white'}
            `}
          >
            Início
          </Link>
          <Link
            to="/app/courses"
            className={`
              px-8 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${isCourses
                ? 'bg-primary text-white shadow-[0_0_15px_rgba(139,44,245,0.3)]' 
                : 'text-textMuted hover:text-white'}
            `}
          >
            Conteúdos
          </Link>
        </div>
      </div>

      {/* Área Direita: Idioma, Notificações, Avatar */}
      <div className="flex items-center gap-4">
        {/* Ícone de Idioma/Tradução */}
        <button
          className="text-white/80 hover:text-white transition-colors cursor-pointer"
          aria-label="Selecionar idioma"
        >
          <Globe size={20} strokeWidth={2} />
        </button>

        {/* Ícone de Notificações com Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="text-white/80 hover:text-white transition-colors cursor-pointer relative"
            aria-label="Notificações"
          >
            <Bell size={20} strokeWidth={2} />
            {/* Red Dot - apenas para notificações não lidas que NÃO sejam new_post */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-background"></span>
            )}
          </button>

          {/* Dropdown de Notificações */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-96 bg-surface border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-white">Notificações</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    <Check size={12} />
                    Marcar todas como lidas
                  </button>
                )}
              </div>

              {/* Abas */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setNotificationsFilter('all')}
                  className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                    notificationsFilter === 'all'
                      ? 'text-white border-b-2 border-primary bg-surfaceHighlight/50'
                      : 'text-textMuted hover:text-white'
                  }`}
                >
                  Tudo
                </button>
                <button
                  onClick={() => setNotificationsFilter('alerts')}
                  className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                    notificationsFilter === 'alerts'
                      ? 'text-white border-b-2 border-primary bg-surfaceHighlight/50'
                      : 'text-textMuted hover:text-white'
                  }`}
                >
                  Avisos
                </button>
                <button
                  onClick={() => setNotificationsFilter('community')}
                  className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                    notificationsFilter === 'community'
                      ? 'text-white border-b-2 border-primary bg-surfaceHighlight/50'
                      : 'text-textMuted hover:text-white'
                  }`}
                >
                  Comunidade
                </button>
              </div>

              {/* Lista de Notificações */}
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {filteredNotifications.length > 0 ? (
                  <div className="divide-y divide-border">
                    {filteredNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full text-left px-4 py-3 hover:bg-surfaceHighlight transition-colors ${
                          !notification.is_read ? 'bg-surfaceHighlight/30' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <NotificationIcon notification={notification} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-medium text-white">{notification.title}</p>
                              {!notification.is_read && (
                                <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
                              )}
                            </div>
                            <p className="text-xs text-textMuted line-clamp-2 mb-1">
                              {notification.content}
                            </p>
                            <p className="text-[10px] text-textMuted">
                              {timeAgo(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <Bell size={32} className="mx-auto text-textMuted mb-3 opacity-50" />
                    <p className="text-sm text-textMuted">Nenhuma notificação</p>
                    <p className="text-xs text-textMuted mt-1">
                      {notificationsFilter === 'all' 
                        ? 'Você está em dia!' 
                        : 'Nenhuma notificação nesta categoria'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar de Perfil com Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="relative focus:outline-none"
            aria-label="Menu do usuário"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border bg-surfaceHighlight flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
              {userProfile?.avatar_url ? (
                <img 
                  src={userProfile.avatar_url} 
                  alt={userProfile.username || 'Avatar'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={20} className="text-textMuted" />
              )}
            </div>
            {/* Indicador de Status Online */}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></span>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="py-1">
                <Link
                  to="/app/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-surfaceHighlight transition-colors"
                >
                  <User size={18} className="text-textMuted" />
                  <span>Meu Perfil</span>
                </Link>
                <Link
                  to="/onboarding"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-surfaceHighlight transition-colors"
                >
                  <Settings size={18} className="text-textMuted" />
                  <span>Editar Perfil</span>
                </Link>
                <div className="border-t border-border my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={18} />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};