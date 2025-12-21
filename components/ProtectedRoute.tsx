import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase, getProfile } from '../services/supabase';
import { UserProfile } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireOnboarding = false,
  requireAdmin = false 
}) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        // Modo demo - permite acesso
        setUser({ id: 'demo-user' });
        setProfile({ id: 'demo-user', email: 'demo@example.com', role: 'user' } as UserProfile);
        setLoading(false);
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setUser(session.user);
        
        // Busca perfil para verificar onboarding e role
        const userProfile = await getProfile(session.user.id);
        setProfile(userProfile);
      } catch (err) {
        console.error('Erro ao verificar autenticação:', err);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <div className="w-6 h-6 bg-primary rounded-full"></div>
          </div>
          <p className="text-textMuted text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, redireciona para login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se requer onboarding e o perfil não está completo
  if (requireOnboarding && (!profile || !profile.username)) {
    return <Navigate to="/onboarding" replace />;
  }

  // Se requer admin e não é admin
  if (requireAdmin && profile?.role !== 'admin') {
    return <Navigate to="/app/courses" replace />;
  }

  return <>{children}</>;
};

