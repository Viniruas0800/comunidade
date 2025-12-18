import React, { useState, useEffect } from 'react';
import { AuthState } from './types';
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { OnboardingView } from './views/OnboardingView';
import { MainShell } from './views/MainShell';
import { supabase, getProfile } from './services/supabase';

function App() {
  const [currentView, setCurrentView] = useState<AuthState>(AuthState.LOGIN);
  const [checkingSession, setCheckingSession] = useState(true);

  // Helper para verificar o estado do perfil e direcionar corretamente
  const checkProfileAndRedirect = async (userId: string) => {
    try {
      const profile = await getProfile(userId);
      
      // Se o usuário não tiver username, manda para onboarding
      if (!profile || !profile.username) {
        setCurrentView(AuthState.ONBOARDING);
      } else {
        setCurrentView(AuthState.AUTHENTICATED);
      }
    } catch (e) {
      console.error("Erro ao verificar perfil:", e);
      // Em caso de erro, assume que precisa logar novamente ou ir pro onboarding
      setCurrentView(AuthState.ONBOARDING);
    }
  };

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await checkProfileAndRedirect(session.user.id);
        }
      }
      setCheckingSession(false);
    };

    checkSession();
  }, []);

  // Handler para quando o login ocorre
  const handleLoginSuccess = async () => {
    setCheckingSession(true); // Mostra loading rápido
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await checkProfileAndRedirect(user.id);
      }
    } else {
      // Demo sem supabase
      setCurrentView(AuthState.AUTHENTICATED);
    }
    setCheckingSession(false);
  };

  if (checkingSession) {
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

  const renderView = () => {
    switch (currentView) {
      case AuthState.LOGIN:
        return (
          <LoginView 
            onNavigateRegister={() => setCurrentView(AuthState.REGISTER)}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case AuthState.REGISTER:
        return (
          <RegisterView 
            onNavigateLogin={() => setCurrentView(AuthState.LOGIN)}
            onRegisterSuccess={() => setCurrentView(AuthState.ONBOARDING)}
          />
        );
      case AuthState.ONBOARDING:
        return (
          <OnboardingView 
            onComplete={() => setCurrentView(AuthState.AUTHENTICATED)}
          />
        );
      case AuthState.AUTHENTICATED:
        return (
          <MainShell 
            onLogout={async () => {
              if (supabase) await supabase.auth.signOut();
              setCurrentView(AuthState.LOGIN);
            }} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="antialiased selection:bg-primary selection:text-white">
      {renderView()}
    </div>
  );
}

export default App;