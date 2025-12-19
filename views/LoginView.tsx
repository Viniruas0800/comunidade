import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Mail, Lock, Hexagon } from 'lucide-react';
import { supabase } from '../services/supabase';

interface LoginViewProps {
  onNavigateRegister: () => void;
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onNavigateRegister, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (supabase) {
        // Login via Supabase Auth
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      } else {
        // Fallback para demonstração sem backend
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (email.includes('erro')) throw new Error('Simulação de erro: Credenciais inválidas');
      }
      
      onLoginSuccess();
    } catch (err: any) {
      // Traduzindo mensagens de erro comuns do Supabase para PT-BR
      let msg = err.message;
      if (msg === "Invalid login credentials") msg = "E-mail ou senha incorretos.";
      
      setError(msg || 'Falha ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primaryHover rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(139,44,245,0.3)] mb-4">
            <Hexagon size={32} className="text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Bem-vindo de volta</h1>
          <p className="text-textMuted mt-1">Acesse sua conta para continuar</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input 
            type="email" 
            placeholder="seu@email.com" 
            label="E-mail"
            icon={<Mail size={18} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input 
            type="password" 
            placeholder="••••••••" 
            label="Senha"
            icon={<Lock size={18} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button type="submit" isLoading={loading} className="mt-2">
            Entrar na plataforma
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-textMuted">
            Ainda não tem acesso?{' '}
            <button 
              onClick={onNavigateRegister}
              className="text-primary hover:text-primaryHover font-medium transition-colors"
            >
              Resgatar convite
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};