import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Mail, Lock, Key, ArrowLeft } from 'lucide-react';
import { supabase, validateInvite } from '../services/supabase';

export const RegisterView: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Validação do Token (pending_invites)
      const isValidInvite = await validateInvite(email, token);
      
      if (!isValidInvite) {
        throw new Error("Código de convite inválido ou e-mail incorreto.");
      }

      if (supabase) {
        // 2. Criar Usuário no Auth (auth.users)
        // O Trigger do banco de dados criará automaticamente a entrada em 'public.profiles'
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;
      } else {
        // Fallback para demonstração sem backend
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // 3. Sucesso - Redirecionar para onboarding
      navigate('/onboarding');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao criar conta. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center text-textMuted hover:text-white mb-6 text-sm transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" />
          Voltar para login
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Criar nova conta</h1>
          <p className="text-textMuted mt-1">Utilize seu código de convite exclusivo</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
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
            type="text" 
            placeholder="INVITE-1234" 
            label="Código de Acesso"
            icon={<Key size={18} />}
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            required
            className="font-mono uppercase"
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

          <div className="pt-2">
            <Button type="submit" isLoading={loading}>
              Validar e Cadastrar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};