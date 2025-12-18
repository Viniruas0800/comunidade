import { Home, BookOpen, MessageCircle, HelpCircle } from 'lucide-react';

export const APP_NAME = "Comunidade ECOM";

export const NAVIGATION_ITEMS = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'start', label: 'Comece por aqui', icon: BookOpen },
  { id: 'contents', label: 'Conteúdos', icon: MessageCircle },
  { id: 'support', label: 'Suporte', icon: HelpCircle },
];

// Placeholder for Supabase Config - In a real app these would be process.env vars
export const SUPABASE_URL = "https://jahurwfiolldizffyyjt.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphaHVyd2Zpb2xsZGl6ZmZ5eWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjgyODYsImV4cCI6MjA4MTY0NDI4Nn0.Agf25KIK3wr_WJk6BMQQ87TvqRCIhZKSdD7sDImhaJ8";
