import React, { useState, useEffect } from 'react';
import { AuthState } from './types';
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { MainShell } from './views/MainShell';
import { supabase } from './services/supabase';

function App() {
  const [currentView, setCurrentView] = useState<AuthState>(AuthState.LOGIN);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setCurrentView(AuthState.AUTHENTICATED);
        }
      }
      setCheckingSession(false);
    };

    checkSession();
  }, []);

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
            onLoginSuccess={() => setCurrentView(AuthState.AUTHENTICATED)}
          />
        );
      case AuthState.REGISTER:
        return (
          <RegisterView 
            onNavigateLogin={() => setCurrentView(AuthState.LOGIN)}
            onRegisterSuccess={() => setCurrentView(AuthState.AUTHENTICATED)}
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