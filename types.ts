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
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  video_id: string; // YouTube ID
  duration_mins?: number;
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
}

// Mock Supabase Types for illustration since we don't have the full library installed in this environment
// In a real app, these would come from @supabase/supabase-js
export interface SupabaseResponse<T> {
  data: T | null;
  error: { message: string } | null;
}