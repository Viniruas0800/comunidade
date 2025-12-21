export enum AuthState {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  ONBOARDING = 'ONBOARDING',
  AUTHENTICATED = 'AUTHENTICATED'
}

export enum TabOption {
  HOME = 'HOME',
  CONTENTS = 'CONTENTS',
  COMMUNITY = 'COMMUNITY',
  ADMIN = 'ADMIN'
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  username?: string;
  bio?: string;
  role?: 'user' | 'admin';
  created_at?: string; // Data de criação do perfil (Membro desde)
  last_seen?: string; // Último acesso
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  modules_count?: number; // Agora calculado dinamicamente
  duration_hours?: number;
  // Campos de Progresso Calculados
  total_lessons?: number;
  completed_lessons?: number;
  progress_percentage?: number;
  blocked_emails?: string[] | null; // Lista de e-mails bloqueados (blacklist)
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  video_id: string; // YouTube ID
  duration?: number; // Duração em minutos
  order: number;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface UserProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: UserProfile; // Join
  status?: 'pending' | 'approved' | 'rejected'; // Status de moderação
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean; // Campo computado no front ou query
  profile?: UserProfile; // Join
  comments?: Comment[]; // Loaded on demand or eager
  is_saved?: boolean;
  recent_liked_avatars?: string[];
  image_urls?: string[]; // Array de URLs das imagens do post
  file_urls?: string[]; // Array de URLs dos arquivos anexados (PDF, DOCX, TXT, HTML)
  mentions?: string[]; // Array de usernames mencionados no post (sem o @)
  status?: 'pending' | 'approved' | 'rejected'; // Status de moderação
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'mention' | 'reply' | 'system_alert' | 'course_update' | 'new_post';
  title: string;
  content: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  action_by?: string | null; // ID do usuário que gerou a notificação
  trigger_user?: {
    avatar_url?: string;
    full_name?: string;
    username?: string;
  } | null; // Dados do perfil de quem agiu (join)
}

// Mock Supabase Types for illustration since we don't have the full library installed in this environment
// In a real app, these would come from @supabase/supabase-js
export interface SupabaseResponse<T> {
  data: T | null;
  error: { message: string } | null;
}