import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

// Initialize Supabase Client
const isConfigured = SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== "https://your-project.supabase.co";

export const supabase = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * Verifica na tabela 'pending_invites' se o par e-mail/token existe.
 */
export const validateInvite = async (email: string, token: string): Promise<boolean> => {
  if (!supabase) {
    console.warn("Supabase não configurado. Modo de demonstração ativo.");
    // Simula validação positiva se não houver backend configurado para evitar bloqueio da UI
    return true; 
  }

  try {
    const { data, error } = await supabase
      .from('pending_invites')
      .select('id')
      .eq('email', email)
      .eq('token', token)
      .maybeSingle(); // Retorna null se não encontrar, sem lançar erro

    if (error) {
      console.error("Erro ao validar convite:", error);
      return false;
    }

    return !!data; // Retorna true se encontrou o convite
  } catch (err) {
    return false;
  }
};

/**
 * Cria a entrada na tabela 'profiles' após o cadastro do usuário.
 */
export const createProfile = async (userId: string, email: string) => {
  if (!supabase) return;

  const { error } = await supabase
    .from('profiles')
    .insert([
      { 
        id: userId, 
        email: email, 
        created_at: new Date().toISOString() 
      }
    ]);

  if (error) {
    throw new Error(`Erro ao criar perfil: ${error.message}`);
  }
};