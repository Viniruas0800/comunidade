import React, { useState, useEffect } from 'react';
import { User, Heart, MessageSquare, Send, ShieldCheck, Clock, Bookmark } from 'lucide-react';
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
                // Instant Feedback
                setPosts([newPost, ...posts]);
                setNewPostContent('');
                // Background refresh to ensure consistency
                loadData();
            }
        } catch (e) {
            alert('Erro ao criar post');
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto w-full px-4 py-8 space-y-8 animate-fadeIn">
            {/* Create Post Card - Minimalist Compact Row */}
            {/* Style: subtle border #262626, lighter background */}
            <div className="rounded-xl p-4 flex items-center gap-4 shadow-sm" style={{ backgroundColor: '#141414', borderColor: '#262626', borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="w-9 h-9 rounded-full bg-surfaceHighlight flex-shrink-0 overflow-hidden border border-[#262626]">
                    {currentUser?.avatar_url ? (
                        <img src={currentUser.avatar_url} alt={currentUser.username} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-textMuted"><User size={16} /></div>
                    )}
                </div>

                <input
                    className="flex-1 bg-transparent border-none text-white placeholder-textMuted/60 focus:ring-0 focus:outline-none text-[15px]"
                    placeholder="Comece uma discussão..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreatePost()}
                />

                <Button
                    onClick={handleCreatePost}
                    isLoading={isPosting}
                    disabled={!newPostContent.trim()}
                    className="w-auto px-5 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primaryHover text-white shadow-sm transition-all"
                >
                    <Send size={14} className="mr-2" />
                    Postar
                </Button>
            </div>

            {/* Feed */}
            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-10 text-textMuted">Carregando feed...</div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-12 rounded-xl border border-dashed border-[#262626] bg-[#141414]">
                        <User size={48} className="mx-auto text-textMuted mb-4 opacity-50" />
                        <h3 className="text-lg font-medium text-white mb-2">Nenhum post ainda</h3>
                        <p className="text-textMuted text-sm">Seja o primeiro a compartilhar algo com a comunidade!</p>
                    </div>
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
    const [isSaved, setIsSaved] = useState(initialPost.is_saved || false);

    // Comments Logic
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m atrás`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h atrás`;
        return `${Math.floor(hours / 24)}d atrás`;
    };

    const handleLike = async () => {
        if (!currentUser) return;
        const previousLiked = isLiked;
        const previousCount = likesCount;

        setIsLiked(!isLiked);
        setLikesCount(isLiked ? Math.max(0, likesCount - 1) : likesCount + 1);

        try {
            await togglePostLike(currentUser.id, post.id);
        } catch (e) {
            setIsLiked(previousLiked);
            setLikesCount(previousCount);
        }
    };

    const handleSave = async () => {
        if (!currentUser) return;
        const previousSaved = isSaved;
        setIsSaved(!isSaved);

        try {
            await toggleSavePost(currentUser.id, post.id);
        } catch (e) {
            setIsSaved(previousSaved);
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
                setPost({ ...post, comments_count: post.comments_count + 1 });
            }
        } finally {
            setSendingComment(false);
        }
    };

    const isAdmin = post.profile?.role === 'admin';
    const authorAvatar = post.profile?.avatar_url;
    const authorName = post.profile?.username || post.profile?.full_name || 'Usuário';

    return (
        <div className="rounded-xl overflow-hidden shadow-sm transition-colors bg-[#141414] border border-[#262626]">
            {/* Header */}
            <div className="p-5 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border ${isAdmin ? 'border-primary' : 'border-[#333]'}`}>
                        {authorAvatar ? (
                            <img src={authorAvatar} className="w-full h-full object-cover" alt={authorName} />
                        ) : (
                            <div className="w-full h-full bg-surfaceHighlight flex items-center justify-center"><User size={16} className="text-textMuted" /></div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-[15px]">{authorName}</span>
                            {isAdmin && (
                                <span className="flex items-center gap-1 bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary/30 uppercase tracking-wider">
                                    <ShieldCheck size={9} /> Admin
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-textMuted">
                            <Clock size={10} /> {timeAgo(post.created_at)}
                        </div>
                    </div>
                </div>

                {/* Top Right: Bookmark Icon */}
                <button
                    onClick={handleSave}
                    className="p-1.5 rounded-md hover:bg-[#262626] transition-colors"
                >
                    <Bookmark
                        size={18}
                        className={`transition-colors ${isSaved ? 'text-primary fill-primary' : 'text-textMuted hover:text-white'}`}
                    />
                </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-4">
                <p className="text-gray-200 leading-relaxed text-[15px] whitespace-pre-wrap font-light">{post.content}</p>
            </div>

            {/* Actions & Footer */}
            <div className="px-5 py-3 border-t border-[#262626] bg-[#111] flex items-center justify-between">

                {/* Left: Comments */}
                <button
                    onClick={toggleComments}
                    className="flex items-center gap-2 text-xs font-medium text-textMuted hover:text-white transition-colors"
                >
                    <MessageSquare size={16} />
                    <span>{post.comments_count > 0 ? `${post.comments_count} comentários` : 'Comentar'}</span>
                </button>

                {/* Bottom Right: Like Count + Avatar Stack */}
                <div className="flex items-center gap-3">
                    {/* Like Count */}
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isLiked ? 'text-primary' : 'text-textMuted hover:text-white'}`}
                    >
                        <Heart size={16} className={isLiked ? 'fill-current' : ''} />
                        <span>{likesCount}</span>
                    </button>

                    {/* Avatar Stack (Overlapping) */}
                    {post.recent_liked_avatars && post.recent_liked_avatars.length > 0 && (
                        <div className="flex -space-x-2 pl-2 border-l border-[#333]">
                            {post.recent_liked_avatars.map((url, idx) => (
                                <div key={idx} className="w-5 h-5 rounded-full border border-[#111] overflow-hidden">
                                    <img src={url} alt="Like" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="bg-[#111] border-t border-[#262626] p-5 animate-fadeIn">
                    <div className="space-y-4 mb-4">
                        {loadingComments ? (
                            <p className="text-xs text-textMuted text-center">Carregando comentários...</p>
                        ) : comments.length > 0 ? (
                            comments.map(comment => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="w-7 h-7 rounded-full bg-surface border border-border flex-shrink-0 overflow-hidden mt-0.5">
                                        {comment.profile?.avatar_url ? (
                                            <img src={comment.profile.avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><User size={10} className="text-textMuted" /></div>
                                        )}
                                    </div>
                                    <div className="bg-[#1A1A1A] border border-[#262626] rounded-lg rounded-tl-none p-2.5 flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-bold text-white">{comment.profile?.username || comment.profile?.full_name || 'Usuário'}</span>
                                            <span className="text-[10px] text-textMuted">{timeAgo(comment.created_at)}</span>
                                        </div>
                                        <p className="text-xs text-gray-300 leading-relaxed">{comment.content}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-textMuted text-center">Nenhum comentário ainda. Seja o primeiro!</p>
                        )}
                    </div>

                    {/* Add Comment Input */}
                    <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-surface border border-border flex-shrink-0 overflow-hidden">
                            {currentUser?.avatar_url ? (
                                <img src={currentUser.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><User size={12} className="text-textMuted" /></div>
                            )}
                        </div>
                        <div className="flex-1 relative">
                            <input
                                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg pl-3 pr-10 py-2 text-xs focus:outline-none focus:border-primary text-white placeholder-textMuted"
                                placeholder="Escreva um comentário..."
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                            />
                            <button
                                onClick={handleSendComment}
                                disabled={sendingComment || !newComment.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primaryHover disabled:opacity-50"
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