import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { UserProfile } from '../types';
import { getProfile, supabase } from '../services/supabase';
import { HomeView } from './HomeView';
import { CoursesView } from './CoursesView';
import { CommunityView } from './CommunityView';
import { AdminView } from './AdminView';
import { SupportView } from './SupportView';
import { CoursePlayerView } from './CoursePlayerView';
import { ProfileView } from './ProfileView';

export const MainShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Busca perfil ao montar para checar role
  useEffect(() => {
    const fetchProfile = async () => {
      if(supabase) {
        const {data: {user}} = await supabase.auth.getUser();
        if(user) {
          const profile = await getProfile(user.id);
          setUserProfile(profile);
        }
      } else {
        // Mock de admin para demo
        setUserProfile({ id: 'mock', email: 'test', role: 'admin' } as UserProfile);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate('/login');
  };

  // Se a rota for do player de curso, renderiza diretamente (não passa pelo MainShell)
  // Isso é tratado nas rotas do App.tsx, então não precisa verificar aqui

  // Determina a aba ativa baseada na URL
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/admin')) return 'admin';
    if (path.includes('/community')) return 'community';
    if (path.includes('/courses')) return 'contents';
    if (path.includes('/support')) return 'support';
    if (path === '/app' || path === '/app/') return 'home';
    return 'home';
  };

  const activeTab = getActiveTab();

  // Renderiza conteúdo baseado na rota
  const renderContent = () => {
    const path = location.pathname;
    
    if (path === '/app' || path === '/app/') {
      return <HomeView userProfile={userProfile} />;
    }
    
    if (path === '/app/courses') {
      return <CoursesView userProfile={userProfile} />;
    }
    
    if (path === '/app/community') {
      return <CommunityView />;
    }
    
    if (path === '/app/admin') {
      return <AdminView />;
    }
    
    if (path === '/app/support') {
      return <SupportView />;
    }
    
    if (path === '/app/profile') {
      return <ProfileView />;
    }
    
    return <Outlet />;
  };

  return (
    <div className="min-h-screen bg-background text-textMain flex">
      <Sidebar 
        onLogout={handleLogout} 
        userRole={userProfile?.role}
        activeTab={activeTab}
      />
      
      <main className="flex-1 md:ml-64 relative">
        <TopBar activeTab={activeTab} />
        
        <div className="p-6 max-w-7xl mx-auto animate-fadeIn">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};