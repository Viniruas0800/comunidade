import React, { useState, useEffect } from 'react';
import { User, Heart, MessageSquare, Send, ShieldCheck, Clock, Bookmark, Image as ImageIcon } from 'lucide-react';
import { supabase, getProfile, getPosts, createPost, togglePostLike, toggleSavePost, addComment, getComments } from '../services/supabase';
import { Post, Comment, UserProfile } from '../types';
import { Button } from '../components/Button';

export const CommunityView: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    
    // Create Post State
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Get Current User
            let userId = 'mock-id';
            if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) userId = user.id;
            }
            const profile = await getProfile(userId);
            setCurrentUser(profile);

            // Get Posts
            const postsData = await getPosts(userId);
            setPosts(postsData);
        } catch (error) {
            console.error("Erro ao carregar feed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() || !currentUser) return;
        setIsPosting(true);
        try {
            const newPost = await createPost(currentUser.id, newPostContent);
            if (newPost) {
                setPosts([newPost, ...posts]);
                setNewPostContent('');
                setIsExpanded(false);
            }
        } catch (e) {
            alert('Erro ao criar post');
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fadeIn">
            {/* Create Post Card - Minimalist */}
            <div className="bg-surface border border-border rounded-xl p-4 shadow-lg transition-all duration-300">
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-surfaceHighlight flex-shrink-0 overflow-hidden border border-border">
                        {currentUser?.avatar_url ? (
                            <img src={currentUser.avatar_url} alt={currentUser.username} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-textMuted"><User size={20} /></div>
                        )}
                    </div>
                    <div className="flex-1">
                         <textarea 
                            className={`
                                w-full bg-transparent border-none text-white placeholder-textMuted/70 focus:ring-0 focus:outline-none resize-none transition-all
                                ${isExpanded ? 'min-h-[100px]' : 'min-h-[40px] pt-2'}
                            `}
                            placeholder="No que você está pensando hoje?"
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            onClick={() => setIsExpanded(true)}
                        />
                        
                        {isExpanded && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 animate-fadeIn">
                                <div className="flex gap-2">
                                    <button className="text-primary hover:text-primaryHover p-2 rounded-lg hover:bg-surfaceHighlight transition-colors">
                                        <ImageIcon size={20} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                     <button 
                                        onClick={() => setIsExpanded(false)}
                                        className="text-sm font-medium text-textMuted hover:text-white px-3 py-2 transition-colors"
                                     >
                                        Cancelar
                                     </button>
                                     <Button 
                                        onClick={handleCreatePost} 
                                        isLoading={isPosting} 
                                        disabled={!newPostContent.trim()}
                                        className="w-auto px-6 py-2 text-sm rounded-full"
                                    >
                                        Publicar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Feed */}
            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-10 text-textMuted">Carregando feed...</div>
                ) : (
                    posts.map(post => (
                        <PostCard key={post.id} post={post} currentUser={currentUser} />
                    ))
                )}
            </div>
        </div>
    );
};

// Subcomponente para renderizar cada post
const PostCard: React.FC<{ post: Post, currentUser: UserProfile | null }> = ({ post: initialPost, currentUser }) => {
    const [post, setPost] = useState(initialPost);
    const [isLiked, setIsLiked] = useState(initialPost.user_has_liked);
    const [likesCount, setLikesCount] = useState(initialPost.likes_count);
    
    // Comments Logic
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        return `${Math.floor(hours / 24)}d`;
    };

    const handleLike = async () => {
        if (!currentUser) return;
        const previousLiked = isLiked;
        const previousCount = likesCount;
        setIsLiked(!isLiked);
        setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
        try {
            await togglePostLike(currentUser.id, post.id);
        } catch (e) {
            setIsLiked(previousLiked);
            setLikesCount(previousCount);
        }
    };

    const handleSave = async () => {
        if (!currentUser) return;
        const previousSaved = post.user_has_saved;
        setPost({...post, user_has_saved: !post.user_has_saved});
        try {
            await toggleSavePost(currentUser.id, post.id);
        } catch (e) {
            setPost({...post, user_has_saved: previousSaved});
        }
    };

    const toggleComments = async () => {
        if (!showComments && comments.length === 0) {
            setLoadingComments(true);
            try {
                const data = await getComments(post.id);
                setComments(data);
            } finally {
                setLoadingComments(false);
            }
        }
        setShowComments(!showComments);
    };

    const handleSendComment = async () => {
        if (!newComment.trim() || !currentUser) return;
        setSendingComment(true);
        try {
            const added = await addComment(currentUser.id, post.id, newComment);
            if (added) {
                setComments([...comments, added]);
                setNewComment('');
                setPost({...post, comments_count: post.comments_count + 1});
            }
        } finally {
            setSendingComment(false);
        }
    };

    const isAdmin = post.profile?.role === 'admin';

    return (
        <div className="bg-surface border border-border rounded-xl overflow-hidden hover:border-border/80 transition-all duration-300 relative group">
            
            {/* Header */}
            <div className="p-5 pr-12 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex-shrink-0 overflow-hidden border-2 ${isAdmin ? 'border-primary p-0.5' : 'border-border'}`}>
                        <div className="w-full h-full rounded-full overflow-hidden bg-surfaceHighlight">
                            {post.profile?.avatar_url ? (
                                <img src={post.profile.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><User size={16} className="text-textMuted"/></div>
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-base">{post.profile?.username || 'Usuário Desconhecido'}</span>
                            {isAdmin && (
                                <ShieldCheck size={14} className="text-primary" />
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-textMuted font-medium mt-0.5">
                             <span>{isAdmin ? 'Administrador' : 'Membro'}</span>
                             <span className="w-1 h-1 rounded-full bg-textMuted/50"></span>
                             <span>{timeAgo(post.created_at)} atrás</span>
                        </div>
                    </div>
                </div>

                {/* Bookmark Action - Absolute Top Right */}
                <button 
                    onClick={handleSave}
                    className="absolute top-5 right-5 text-textMuted hover:text-primary transition-colors p-1"
                >
                    <Bookmark size={20} className={post.user_has_saved ? "fill-primary text-primary" : ""} />
                </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-4">
                <p className="text-textMain/90 leading-relaxed text-sm whitespace-pre-wrap">{post.content}</p>
            </div>

            {/* Actions Bar */}
            <div className="px-5 py-4 border-t border-border flex items-center justify-between">
                
                {/* Left Actions */}
                <div className="flex items-center gap-6">
                    <button 
                        onClick={handleLike}
                        className={`flex items-center gap-2 text-sm font-medium transition-colors group/like ${isLiked ? 'text-primary' : 'text-textMuted hover:text-white'}`}
                    >
                        <Heart size={20} className={`transition-transform group-active/like:scale-75 ${isLiked ? 'fill-current' : ''}`} />
                    </button>
                    <button 
                        onClick={toggleComments}
                        className="flex items-center gap-2 text-sm font-medium text-textMuted hover:text-white transition-colors"
                    >
                        <MessageSquare size={20} />
                        {post.comments_count > 0 && <span>{post.comments_count}</span>}
                    </button>
                </div>

                {/* Right Likes + Avatar Stack */}
                <div className="flex items-center gap-3">
                    {post.recent_liked_avatars && post.recent_liked_avatars.length > 0 && (
                        <div className="flex -space-x-2">
                            {post.recent_liked_avatars.map((url, i) => (
                                <div key={i} className="w-6 h-6 rounded-full border border-surface bg-surfaceHighlight overflow-hidden">
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                    {likesCount > 0 && (
                        <span className="text-xs font-semibold text-textMuted">
                            {likesCount} {likesCount === 1 ? 'curtida' : 'curtidas'}
                        </span>
                    )}
                </div>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="bg-surfaceHighlight/30 border-t border-border p-5 animate-fadeIn">
                    <div className="space-y-4 mb-5 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {loadingComments ? (
                            <p className="text-xs text-textMuted text-center">Carregando comentários...</p>
                        ) : comments.length > 0 ? (
                            comments.map(comment => (
                                <div key={comment.id} className="flex gap-3 group/comment">
                                    <div className="w-8 h-8 rounded-full bg-surface border border-border flex-shrink-0 overflow-hidden mt-0.5">
                                         {comment.profile?.avatar_url ? (
                                            <img src={comment.profile.avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><User size={12} className="text-textMuted"/></div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-surface border border-border rounded-2xl rounded-tl-none px-4 py-2 inline-block">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-xs font-bold text-white hover:underline cursor-pointer">{comment.profile?.username}</span>
                                                <span className="text-[10px] text-textMuted">{timeAgo(comment.created_at)}</span>
                                            </div>
                                            <p className="text-sm text-textMain/90">{comment.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-sm text-textMuted font-medium">Nenhum comentário ainda</p>
                                <p className="text-xs text-textMuted">Seja o primeiro a compartilhar sua opinião!</p>
                            </div>
                        )}
                    </div>

                    {/* Add Comment Input */}
                    <div className="flex gap-3 items-center">
                         <div className="w-8 h-8 rounded-full bg-surface border border-border flex-shrink-0 overflow-hidden">
                             {currentUser?.avatar_url ? (
                                <img src={currentUser.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><User size={12} className="text-textMuted"/></div>
                            )}
                        </div>
                        <div className="flex-1 relative">
                            <input 
                                className="w-full bg-surface border border-border rounded-full pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary text-white placeholder-textMuted transition-colors"
                                placeholder="Escreva um comentário..."
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                            />
                            <button 
                                onClick={handleSendComment}
                                disabled={sendingComment || !newComment.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:text-white bg-transparent hover:bg-primary rounded-full transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-primary"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};