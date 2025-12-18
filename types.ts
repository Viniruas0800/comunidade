export enum AuthState {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  AUTHENTICATED = 'AUTHENTICATED'
}

export enum TabOption {
  HOME = 'HOME',
  CONTENTS = 'CONTENTS'
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

// Mock Supabase Types for illustration since we don't have the full library installed in this environment
// In a real app, these would come from @supabase/supabase-js
export interface SupabaseResponse<T> {
  data: T | null;
  error: { message: string } | null;
}
