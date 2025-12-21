import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Clock, Settings, MessageSquare, FileText } from 'lucide-react';
import { UserProfile, Post, Comment } from '../types';
import { getUserFullProfile, getUserInteractions, supabase } from '../services/supabase';
import { PostCard } from './CommunityView';

export const ProfileView: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({ postsCount: 0, commentsCount: 0 });
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<(Comment & { post_content?: string; post_author_id?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!supabase) {
        // Mock para demo
        setProfile({
          id: 'mock',
          email: 'test@example.com',
          username: 'usuario',
          full_name: 'Usuário Demo',
          bio: 'Esta é uma bio de exemplo',
          avatar_url: undefined,
          role: 'user',
          created_at: new Date().toISOString(),
          last_seen: new Date().toISOString()
        } as UserProfile);
        setStats({ postsCount: 0, commentsCount: 0 });
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const { profile: userProfile, stats: userStats } = await getUserFullProfile(user.id);
        setProfile(userProfile);
        setStats(userStats);
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  useEffect(() => {
    if (!profile) return;

    const loadInteractions = async () => {
      setLoadingInteractions(true);
      try {
        if (activeTab === 'posts') {
          const userPosts = await getUserInteractions(profile.id, 'posts');
          setPosts(userPosts as Post[]);
        } else {
          const userComments = await getUserInteractions(profile.id, 'comments');
          setComments(userComments as (Comment & { post_content?: string; post_author_id?: string })[]);
        }
      } catch (error) {
        console.error("Erro ao carregar interações:", error);
      } finally {
        setLoadingInteractions(false);
      }
    };

    loadInteractions();
  }, [profile, activeTab]);

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch {
      return 'N/A';
    }
  };

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d atrás`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mes atrás`;
    return `${Math.floor(months / 12)}a atrás`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-textMuted">Erro ao carregar perfil</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Cabeçalho do Perfil */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-8">
        <div className="flex items-start gap-6">
          {/* Avatar Grande */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#262626] bg-surfaceHighlight flex items-center justify-center">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.username || 'Avatar'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={48} className="text-textMuted" />
              )}
            </div>
            {/* Indicador Online */}
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-[#141414]"></span>
          </div>

          {/* Informações do Perfil */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {profile.full_name || profile.username || 'Usuário'}
                </h1>
                {profile.username && (
                  <p className="text-textMuted text-sm mb-2">@{profile.username}</p>
                )}
                {profile.bio && (
                  <p className="text-gray-300 text-sm leading-relaxed mt-3">{profile.bio}</p>
                )}
              </div>
              <button
                onClick={() => navigate('/onboarding')}
                className="flex items-center gap-2 px-4 py-2 bg-surfaceHighlight hover:bg-surfaceHighlight/80 text-white text-sm font-medium rounded-lg transition-colors border border-[#262626]"
              >
                <Settings size={16} />
                Editar Perfil
              </button>
            </div>

            {/* Metadados */}
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-textMuted text-sm">
                <Calendar size={16} />
                <span>Membro desde {formatDate(profile.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-textMuted text-sm">
                <Clock size={16} />
                <span>Visto por último {timeAgo(profile.last_seen || profile.created_at || new Date().toISOString())}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Abas de Navegação */}
      <div className="border-b border-[#262626]">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('posts')}
            className={`
              px-6 py-3 text-sm font-medium transition-colors relative
              ${activeTab === 'posts'
                ? 'text-white border-b-2 border-primary'
                : 'text-textMuted hover:text-white'}
            `}
          >
            <div className="flex items-center gap-2">
              <FileText size={16} />
              <span>Publicações</span>
              {stats.postsCount > 0 && (
                <span className="bg-surfaceHighlight text-white text-xs px-2 py-0.5 rounded-full">
                  {stats.postsCount}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`
              px-6 py-3 text-sm font-medium transition-colors relative
              ${activeTab === 'comments'
                ? 'text-white border-b-2 border-primary'
                : 'text-textMuted hover:text-white'}
            `}
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={16} />
              <span>Comentários</span>
              {stats.commentsCount > 0 && (
                <span className="bg-surfaceHighlight text-white text-xs px-2 py-0.5 rounded-full">
                  {stats.commentsCount}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Conteúdo das Abas */}
      <div>
        {loadingInteractions ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : activeTab === 'posts' ? (
          posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map(post => (
                <PostCard key={post.id} post={post} currentUser={profile} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-[#141414] border border-[#262626] rounded-xl">
              <FileText size={48} className="mx-auto text-textMuted mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-white mb-2">Nenhuma publicação ainda</h3>
              <p className="text-textMuted text-sm">Você ainda não criou nenhum post na comunidade.</p>
            </div>
          )
        ) : (
          comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map(comment => (
                <div
                  key={comment.id}
                  className="bg-[#141414] border border-[#262626] rounded-xl p-5"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-surfaceHighlight flex items-center justify-center overflow-hidden border border-[#262626]">
                      {profile.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt={profile.username || 'Avatar'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={14} className="text-textMuted" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">
                          {profile.username || profile.full_name || 'Usuário'}
                        </span>
                        {comment.status === 'pending' && (
                          <span className="bg-yellow-500/20 text-yellow-400 text-[9px] px-1.5 py-0.5 rounded-full border border-yellow-500/50">
                            Em análise
                          </span>
                        )}
                        <span className="text-xs text-textMuted">
                          {timeAgo(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                  
                  {/* Contexto do Post Original */}
                  {comment.post_content && (
                    <div className="mt-3 p-3 bg-[#1A1A1A] border border-[#262626] rounded-lg">
                      <p className="text-xs text-textMuted mb-1">Comentário em:</p>
                      <p className="text-sm text-gray-400 line-clamp-2">{comment.post_content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-[#141414] border border-[#262626] rounded-xl">
              <MessageSquare size={48} className="mx-auto text-textMuted mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-white mb-2">Nenhum comentário ainda</h3>
              <p className="text-textMuted text-sm">Você ainda não fez nenhum comentário na comunidade.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

