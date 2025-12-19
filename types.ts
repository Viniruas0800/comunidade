export enum AuthState {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  ONBOARDING = 'ONBOARDING',
  AUTHENTICATED = 'AUTHENTICATED'
}

export enum TabOption {
  HOME = 'HOME',
  CONTENTS = 'CONTENTS',
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
  modules_count?: number;
  duration_hours?: number;
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

// Mock Supabase Types for illustration since we don't have the full library installed in this environment
// In a real app, these would come from @supabase/supabase-js
export interface SupabaseResponse<T> {
  data: T | null;
  error: { message: string } | null;
}