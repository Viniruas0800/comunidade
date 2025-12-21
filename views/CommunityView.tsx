import React, { useState, useEffect, useRef } from 'react';
import { User, Heart, MessageSquare, Send, ShieldCheck, Clock, Bookmark, TrendingUp, Star, Image as ImageIcon, X, ChevronLeft, ChevronRight, Paperclip, FileText, FileCode } from 'lucide-react';
import { supabase, getProfile, getPosts, createPost, togglePostLike, toggleSavePost, addComment, getComments } from '../services/supabase';
import { Post, Comment, UserProfile } from '../types';
import { Button } from '../components/Button';

type FeedFilter = 'recent' | 'popular' | 'liked' | 'saved' | 'for_you';

export const CommunityView: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [activeFilter, setActiveFilter] = useState<FeedFilter>('recent');

    // Create Post State
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadingImages, setUploadingImages] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFilter]);

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

            // Get Posts with active filter (passa username para filtro 'for_you')
            const postsData = await getPosts(userId, activeFilter, profile?.username);
            setPosts(postsData);
        } catch (error) {
            console.error("Erro ao carregar feed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const files = Array.from(e.target.files);
        const totalImages = selectedImages.length + files.length;

        // Validação: máximo de 5 imagens
        if (totalImages > 5) {
            alert('Você pode adicionar no máximo 5 imagens por post.');
            // Adiciona apenas até completar 5
            const remainingSlots = 5 - selectedImages.length;
            if (remainingSlots > 0) {
                const filesToAdd = files.slice(0, remainingSlots);
                setSelectedImages([...selectedImages, ...filesToAdd]);
                setImagePreviews([...imagePreviews, ...filesToAdd.map((file: File) => URL.createObjectURL(file))]);
            }
            return;
        }

        // Adiciona novas imagens
        setSelectedImages([...selectedImages, ...files]);
        setImagePreviews([...imagePreviews, ...files.map((file: File) => URL.createObjectURL(file))]);
    };

    const handleRemoveImage = (index: number) => {
        // Remove a URL do preview
        URL.revokeObjectURL(imagePreviews[index]);
        
        setSelectedImages(selectedImages.filter((_, i) => i !== index));
        setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const files = Array.from(e.target.files);
        setSelectedFiles([...selectedFiles, ...files]);
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'html' || ext === 'txt') {
            return <FileCode size={16} className="text-primary" />;
        }
        return <FileText size={16} className="text-primary" />;
    };

    const handleCreatePost = async () => {
        if ((!newPostContent.trim() && selectedImages.length === 0 && selectedFiles.length === 0) || !currentUser) return;
        
        setIsPosting(true);
        setUploadingImages(selectedImages.length > 0 || selectedFiles.length > 0);
        
        try {
            const newPost = await createPost(
                currentUser.id, 
                newPostContent, 
                selectedImages.length > 0 ? selectedImages : undefined,
                selectedFiles.length > 0 ? selectedFiles : undefined,
                currentUser.role // Passa a role para isentar admin da moderação
            );
            
            if (newPost) {
                // Instant Feedback
                setPosts([newPost, ...posts]);
                setNewPostContent('');
                setSelectedImages([]);
                setImagePreviews([]);
                setSelectedFiles([]);
                // Limpa previews URLs
                imagePreviews.forEach(url => URL.revokeObjectURL(url));
                
                // Feedback diferenciado por role
                if (currentUser.role === 'admin') {
                    // Admin: post aprovado imediatamente
                    // Post aparece sem tag "Em análise" - feedback silencioso
                } else {
                    // Usuário comum: post enviado para análise
                    // O post aparece com tag "Em análise" automaticamente
                    // Feedback visual já está na tag, não precisa de alerta adicional
                }
                
                // Background refresh to ensure consistency
                loadData();
            }
        } catch (e: any) {
            alert(e.message || 'Erro ao criar post');
        } finally {
            setIsPosting(false);
            setUploadingImages(false);
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
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !isPosting && handleCreatePost()}
                    disabled={isPosting}
                />

                {/* Image Upload Button */}
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                    disabled={isPosting || selectedImages.length >= 5}
                />
                <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isPosting || selectedImages.length >= 5}
                    className="p-2 text-textMuted hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={selectedImages.length >= 5 ? "Máximo de 5 imagens" : "Adicionar imagens"}
                >
                    <ImageIcon size={18} />
                </button>

                {/* File Upload Button */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.html"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isPosting}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPosting}
                    className="p-2 text-textMuted hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Anexar arquivos (PDF, DOCX, TXT, HTML)"
                >
                    <Paperclip size={18} />
                </button>

                <Button
                    onClick={handleCreatePost}
                    isLoading={isPosting}
                    disabled={(!newPostContent.trim() && selectedImages.length === 0 && selectedFiles.length === 0) || uploadingImages}
                    className="!w-auto px-3 py-1.5 rounded-full text-xs font-semibold bg-primary hover:bg-primaryHover text-white shadow-sm transition-all flex-shrink-0"
                >
                    {uploadingImages ? (
                        <>
                            <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white mr-1.5"></div>
                            Enviando...
                        </>
                    ) : (
                        <>
                            <Send size={12} className="mr-1.5" />
                            Postar
                        </>
                    )}
                </Button>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
                <div className="rounded-xl p-4 bg-[#141414] border border-[#262626]">
                    <p className="text-xs text-textMuted mb-3 font-medium">Imagens ({imagePreviews.length}/5)</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                                <img
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-md border border-[#262626]"
                                />
                                <button
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remover imagem"
                                >
                                    <X size={14} className="text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                    {selectedImages.length >= 5 && (
                        <p className="text-xs text-textMuted mt-2 text-center">
                            Máximo de 5 imagens atingido
                        </p>
                    )}
                </div>
            )}

            {/* File Previews */}
            {selectedFiles.length > 0 && (
                <div className="rounded-xl p-4 bg-[#141414] border border-[#262626]">
                    <p className="text-xs text-textMuted mb-3 font-medium">Anexos ({selectedFiles.length})</p>
                    <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-[#262626] rounded-md p-2.5 border border-[#333]">
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    {getFileIcon(file.name)}
                                    <span className="text-xs text-white truncate" title={file.name}>
                                        {file.name}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleRemoveFile(index)}
                                    className="p-1 text-textMuted hover:text-red-400 transition-colors flex-shrink-0"
                                    title="Remover arquivo"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-6 border-b border-[#262626] pb-3 mb-6">
                <button
                    onClick={() => setActiveFilter('recent')}
                    className={`text-sm font-medium transition-colors pb-2 border-b-2 ${
                        activeFilter === 'recent'
                            ? 'text-white border-primary'
                            : 'text-gray-400 hover:text-white border-transparent'
                    }`}
                >
                    Mais Recentes
                </button>
                <button
                    onClick={() => setActiveFilter('popular')}
                    className={`text-sm font-medium transition-colors pb-2 border-b-2 flex items-center gap-1.5 ${
                        activeFilter === 'popular'
                            ? 'text-white border-primary'
                            : 'text-gray-400 hover:text-white border-transparent'
                    }`}
                >
                    <TrendingUp size={14} />
                    Em Alta
                </button>
                <button
                    onClick={() => setActiveFilter('liked')}
                    className={`text-sm font-medium transition-colors pb-2 border-b-2 flex items-center gap-1.5 ${
                        activeFilter === 'liked'
                            ? 'text-white border-primary'
                            : 'text-gray-400 hover:text-white border-transparent'
                    }`}
                >
                    <Heart size={14} />
                    Curtidos
                </button>
                <button
                    onClick={() => setActiveFilter('saved')}
                    className={`text-sm font-medium transition-colors pb-2 border-b-2 flex items-center gap-1.5 ${
                        activeFilter === 'saved'
                            ? 'text-white border-primary'
                            : 'text-gray-400 hover:text-white border-transparent'
                    }`}
                >
                    <Bookmark size={14} />
                    Salvos
                </button>
                {currentUser?.username && (
                    <button
                        onClick={() => setActiveFilter('for_you')}
                        className={`text-sm font-medium transition-colors pb-2 border-b-2 flex items-center gap-1.5 ${
                            activeFilter === 'for_you'
                                ? 'text-white border-primary'
                                : 'text-gray-400 hover:text-white border-transparent'
                        }`}
                    >
                        <User size={14} />
                        Para Você
                    </button>
                )}
            </div>

            {/* Feed */}
            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-10 text-textMuted">Carregando feed...</div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-12 rounded-xl border border-dashed border-[#262626] bg-[#141414]">
                        {activeFilter === 'liked' ? (
                            <>
                                <Heart size={48} className="mx-auto text-textMuted mb-4 opacity-50" />
                                <h3 className="text-lg font-medium text-white mb-2">Nenhum post curtido</h3>
                                <p className="text-textMuted text-sm">Você ainda não curtiu nenhum post. Explore o feed e curta os posts que você gostar!</p>
                            </>
                        ) : activeFilter === 'saved' ? (
                            <>
                                <Bookmark size={48} className="mx-auto text-textMuted mb-4 opacity-50" />
                                <h3 className="text-lg font-medium text-white mb-2">Nenhum post salvo</h3>
                                <p className="text-textMuted text-sm">Você ainda não salvou nenhum post. Use o ícone de bandeira para salvar posts interessantes!</p>
                            </>
                        ) : activeFilter === 'popular' ? (
                            <>
                                <TrendingUp size={48} className="mx-auto text-textMuted mb-4 opacity-50" />
                                <h3 className="text-lg font-medium text-white mb-2">Nenhum post em alta</h3>
                                <p className="text-textMuted text-sm">Ainda não há posts populares no momento.</p>
                            </>
                        ) : activeFilter === 'for_you' ? (
                            <>
                                <User size={48} className="mx-auto text-textMuted mb-4 opacity-50" />
                                <h3 className="text-lg font-medium text-white mb-2">Nenhuma menção ainda</h3>
                                <p className="text-textMuted text-sm">Você ainda não foi mencionado em nenhuma conversa.</p>
                            </>
                        ) : (
                            <>
                                <User size={48} className="mx-auto text-textMuted mb-4 opacity-50" />
                                <h3 className="text-lg font-medium text-white mb-2">Nenhum post ainda</h3>
                                <p className="text-textMuted text-sm">Seja o primeiro a compartilhar algo com a comunidade!</p>
                            </>
                        )}
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

// Componente para renderizar texto rico (menções e links)
const RichTextRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  // Regex para URLs (http/https) - mais robusto
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  // Regex para menções (@username) - não dentro de URLs
  const mentionRegex = /@([a-zA-Z0-9._]+)/g;

  // Encontra todas as URLs e menções
  const matches: Array<{ index: number; endIndex: number; type: 'url' | 'mention'; content: string; mention?: string }> = [];

  // Busca URLs primeiro (prioridade)
  urlRegex.lastIndex = 0; // Reset regex
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlRegex.exec(content)) !== null) {
    matches.push({
      index: urlMatch.index,
      endIndex: urlMatch.index + urlMatch[0].length,
      type: 'url',
      content: urlMatch[0]
    });
  }

  // Busca menções, mas ignora se estiver dentro de uma URL
  mentionRegex.lastIndex = 0; // Reset regex
  let mentionMatch;
  while ((mentionMatch = mentionRegex.exec(content)) !== null) {
    const mentionStart = mentionMatch.index;
    const mentionEnd = mentionStart + mentionMatch[0].length;
    
    // Verifica se a menção está dentro de alguma URL
    const isInsideUrl = matches.some(m => 
      m.type === 'url' && mentionStart >= m.index && mentionEnd <= m.endIndex
    );
    
    if (!isInsideUrl) {
      matches.push({
        index: mentionStart,
        endIndex: mentionEnd,
        type: 'mention',
        content: mentionMatch[0],
        mention: mentionMatch[1] // username sem o @
      });
    }
  }

  // Ordena matches por índice
  matches.sort((a, b) => a.index - b.index);

  // Remove matches sobrepostos (prioriza URLs sobre menções)
  const filteredMatches: typeof matches = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const overlaps = filteredMatches.some(existing => 
      (current.index < existing.endIndex && current.endIndex > existing.index)
    );
    
    if (!overlaps) {
      filteredMatches.push(current);
    }
  }

  // Constrói array de partes
  const parts: Array<{ type: 'text' | 'url' | 'mention'; content: string; mention?: string }> = [];
  let lastIndex = 0;

  filteredMatches.forEach((match) => {
    // Adiciona texto antes do match
    if (match.index > lastIndex) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }

    // Adiciona o match
    if (match.type === 'url') {
      parts.push({ type: 'url', content: match.content });
    } else {
      parts.push({ type: 'mention', content: match.content, mention: match.mention });
    }

    lastIndex = match.endIndex;
  });

  // Adiciona texto restante
  if (lastIndex < content.length) {
    const textAfter = content.substring(lastIndex);
    if (textAfter) {
      parts.push({ type: 'text', content: textAfter });
    }
  }

  // Se não houver matches, retorna texto simples
  if (parts.length === 0) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  // Renderiza as partes
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.type === 'url') {
          return (
            <a
              key={index}
              href={part.content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline break-all"
            >
              {part.content}
            </a>
          );
        } else if (part.type === 'mention') {
          return (
            <span
              key={index}
              className="text-primary font-semibold cursor-pointer hover:opacity-80"
              title={`Mencionar @${part.mention}`}
            >
              {part.content}
            </span>
          );
        } else {
          return <span key={index}>{part.content}</span>;
        }
      })}
    </span>
  );
};

// Função auxiliar para extrair nome do arquivo da URL
const getFileNameFromUrl = (url: string): string => {
    try {
        // Tenta extrair o nome do arquivo da URL
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        // Remove query params se houver
        const cleanName = fileName.split('?')[0];
        // Remove prefixo se houver (ex: file_123456_abc.pdf)
        if (cleanName.startsWith('file_')) {
            const parts = cleanName.split('_');
            if (parts.length >= 3) {
                const ext = parts[2].split('.')[1] || 'file';
                return `Anexo ${parts[1].substring(0, 6)}.${ext}`;
            }
        }
        return cleanName || 'Download Arquivo';
    } catch {
        return 'Download Arquivo';
    }
};

// Componente de Carrossel de Imagens
const PostImageCarousel: React.FC<{ images: string[] }> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showControls, setShowControls] = useState(false);

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    // Se for apenas 1 imagem, mostra sem carrossel
    if (images.length === 1) {
        return (
            <div className="w-full rounded-lg overflow-hidden border border-[#262626]">
                <img
                    src={images[0]}
                    alt="Post image"
                    className="w-full aspect-video object-cover"
                />
            </div>
        );
    }

    // Carrossel para 2+ imagens
    return (
        <div
            className="relative w-full rounded-lg overflow-hidden border border-[#262626] group"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            {/* Container das imagens */}
            <div className="relative w-full aspect-video overflow-hidden">
                <div
                    className="flex transition-transform duration-300 ease-in-out h-full"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {images.map((image, index) => (
                        <div key={index} className="min-w-full h-full flex-shrink-0">
                            <img
                                src={image}
                                alt={`Post image ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Arrows - Desktop (aparecem no hover) */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={goToPrevious}
                        className={`absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-opacity duration-200 ${
                            showControls ? 'opacity-100' : 'opacity-0'
                        } hidden md:flex items-center justify-center`}
                        aria-label="Imagem anterior"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={goToNext}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-opacity duration-200 ${
                            showControls ? 'opacity-100' : 'opacity-0'
                        } hidden md:flex items-center justify-center`}
                        aria-label="Próxima imagem"
                    >
                        <ChevronRight size={20} />
                    </button>
                </>
            )}

            {/* Mobile Navigation Buttons */}
            {images.length > 1 && (
                <div className="md:hidden flex items-center justify-between absolute inset-x-0 top-1/2 -translate-y-1/2 px-2">
                    <button
                        onClick={goToPrevious}
                        className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full"
                        aria-label="Imagem anterior"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={goToNext}
                        className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full"
                        aria-label="Próxima imagem"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* Dots Indicator */}
            {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`transition-all duration-200 ${
                                index === currentIndex
                                    ? 'w-2 h-2 bg-white rounded-full'
                                    : 'w-2 h-2 bg-white/50 rounded-full hover:bg-white/75'
                            }`}
                            aria-label={`Ir para imagem ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Subcomponente para renderizar cada post
export const PostCard: React.FC<{ post: Post, currentUser: UserProfile | null }> = ({ post: initialPost, currentUser }) => {
    const [post, setPost] = useState(initialPost);
    const [isLiked, setIsLiked] = useState(initialPost.user_has_liked);
    const [likesCount, setLikesCount] = useState(initialPost.likes_count);
    const [isSaved, setIsSaved] = useState(initialPost.is_saved || false);

    // Comments Logic - Estado melhorado
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const [commentsLoaded, setCommentsLoaded] = useState(false); // Flag para evitar re-fetch desnecessário

    // Atualiza o post quando initialPost mudar (ex: após refresh)
    useEffect(() => {
        setPost(initialPost);
        setIsLiked(initialPost.user_has_liked);
        setLikesCount(initialPost.likes_count);
        setIsSaved(initialPost.is_saved || false);
    }, [initialPost.id, initialPost.likes_count, initialPost.comments_count]);

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
        const willShow = !showComments;
        setShowComments(willShow);

        // Só carrega comentários se estiver abrindo E ainda não foram carregados
        if (willShow && !commentsLoaded) {
            setLoadingComments(true);
            try {
                const data = await getComments(post.id, currentUser?.id);
                setComments(data);
                setCommentsLoaded(true);
            } catch (error) {
                console.error("Erro ao carregar comentários:", error);
                // Em caso de erro, ainda permite fechar/abrir
            } finally {
                setLoadingComments(false);
            }
        }
    };

    const handleSendComment = async () => {
        if (!newComment.trim() || !currentUser) return;

        const commentContent = newComment.trim();
        setNewComment(''); // Limpa o input imediatamente para melhor UX

        // Optimistic UI: Cria comentário temporário com ID temporário
        const tempId = `temp-${Date.now()}`;
        // Define status inicial baseado na role (admin = approved, outros = pending)
        const initialStatus = currentUser.role === 'admin' ? 'approved' : 'pending';
        const optimisticComment: Comment = {
            id: tempId,
            post_id: post.id,
            user_id: currentUser.id,
            content: commentContent,
            created_at: new Date().toISOString(),
            status: initialStatus,
            profile: {
                id: currentUser.id,
                email: currentUser.email || '',
                username: currentUser.username,
                avatar_url: currentUser.avatar_url,
                full_name: currentUser.full_name,
                role: currentUser.role
            }
        };

        // Adiciona o comentário otimisticamente
        setComments([...comments, optimisticComment]);
        setPost({ ...post, comments_count: post.comments_count + 1 });
        setSendingComment(true);

        try {
            // Envia para o backend (passa a role do usuário)
            const added = await addComment(currentUser.id, post.id, commentContent, currentUser.role);
            
            if (added) {
                // Substitui o comentário temporário pelo real
                setComments(prevComments => 
                    prevComments.map(c => c.id === tempId ? added : c)
                );
                
                // Feedback diferenciado por role
                if (currentUser.role === 'admin') {
                    // Admin: comentário publicado imediatamente (sem tag)
                } else {
                    // Usuário comum: comentário enviado para análise (aparece com tag "Em análise")
                }
            } else {
                throw new Error("Falha ao criar comentário");
            }
        } catch (error) {
            console.error("Erro ao enviar comentário:", error);
            
            // Reverte o Optimistic UI em caso de erro
            setComments(prevComments => prevComments.filter(c => c.id !== tempId));
            setPost({ ...post, comments_count: Math.max(0, post.comments_count - 1) });
            setNewComment(commentContent); // Restaura o texto para o usuário tentar novamente
            
            // Mostra feedback de erro (pode ser melhorado com toast/notificação)
            alert('Erro ao enviar comentário. Tente novamente.');
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
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white text-[15px]">{authorName}</span>
                            {isAdmin && (
                                <span className="flex items-center gap-1 bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary/30 uppercase tracking-wider">
                                    <ShieldCheck size={9} /> Admin
                                </span>
                            )}
                            {post.status === 'pending' && currentUser?.id === post.user_id && (
                                <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/50 font-medium">
                                    Em análise
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
                {post.content && (
                    <div className="text-gray-200 leading-relaxed text-[15px] font-light mb-4">
                        <RichTextRenderer content={post.content} />
                    </div>
                )}
                
                {/* Image Carousel */}
                {post.image_urls && post.image_urls.length > 0 && (
                    <div className="mb-4">
                        <PostImageCarousel images={post.image_urls} />
                    </div>
                )}
                
                {/* File Attachments */}
                {post.file_urls && post.file_urls.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs text-textMuted font-medium mb-2">Anexos ({post.file_urls.length})</p>
                        {post.file_urls.map((fileUrl, index) => {
                            const fileName = getFileNameFromUrl(fileUrl);
                            const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                            const isCodeFile = fileExt === 'html' || fileExt === 'txt';
                            
                            return (
                                <a
                                    key={index}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 bg-[#262626] hover:bg-[#2a2a2a] border border-[#333] rounded-md p-3 transition-colors group"
                                >
                                    <div className="flex-shrink-0">
                                        {isCodeFile ? (
                                            <FileCode size={18} className="text-primary" />
                                        ) : (
                                            <FileText size={18} className="text-primary" />
                                        )}
                                    </div>
                                    <span className="text-sm text-white flex-1 truncate group-hover:text-primary transition-colors">
                                        {fileName}
                                    </span>
                                    <div className="flex-shrink-0 text-xs text-textMuted uppercase">
                                        {fileExt}
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}
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
                            <div className="flex items-center justify-center py-4">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
                                    <p className="text-xs text-textMuted">Carregando comentários...</p>
                                </div>
                            </div>
                        ) : comments.length > 0 ? (
                            comments.map(comment => {
                                const isOptimistic = comment.id.startsWith('temp-');
                                return (
                                    <div 
                                        key={comment.id} 
                                        className={`flex gap-3 transition-opacity ${isOptimistic ? 'opacity-70' : 'opacity-100'}`}
                                    >
                                        <div className="w-7 h-7 rounded-full bg-surface border border-border flex-shrink-0 overflow-hidden mt-0.5">
                                            {comment.profile?.avatar_url ? (
                                                <img 
                                                    src={comment.profile.avatar_url} 
                                                    className="w-full h-full object-cover" 
                                                    alt={comment.profile?.username || 'Avatar'}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <User size={10} className="text-textMuted" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-[#1A1A1A] border border-[#262626] rounded-lg rounded-tl-none p-2.5 flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[11px] font-bold text-white">
                                                        {comment.profile?.username || comment.profile?.full_name || 'Usuário'}
                                                    </span>
                                                    {comment.status === 'pending' && currentUser?.id === comment.user_id && (
                                                        <span className="bg-yellow-500/20 text-yellow-400 text-[9px] px-1.5 py-0.5 rounded-full border border-yellow-500/50">
                                                            Em análise
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {isOptimistic && (
                                                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" title="Enviando..."></div>
                                                    )}
                                                    <span className="text-[10px] text-textMuted">
                                                        {timeAgo(comment.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                {comment.content}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-6">
                                <MessageSquare size={24} className="mx-auto text-textMuted mb-2 opacity-50" />
                                <p className="text-xs text-textMuted">Nenhum comentário ainda. Seja o primeiro!</p>
                            </div>
                        )}
                    </div>

                    {/* Add Comment Input */}
                    {currentUser ? (
                        <div className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-surface border border-border flex-shrink-0 overflow-hidden">
                                {currentUser.avatar_url ? (
                                    <img 
                                        src={currentUser.avatar_url} 
                                        className="w-full h-full object-cover" 
                                        alt={currentUser.username || 'Avatar'}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User size={12} className="text-textMuted" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 relative">
                                <input
                                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg pl-3 pr-10 py-2 text-xs focus:outline-none focus:border-primary text-white placeholder-textMuted disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Escreva um comentário..."
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey && !sendingComment && newComment.trim()) {
                                            e.preventDefault();
                                            handleSendComment();
                                        }
                                    }}
                                    disabled={sendingComment}
                                />
                                <button
                                    onClick={handleSendComment}
                                    disabled={sendingComment || !newComment.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primaryHover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Enviar comentário"
                                >
                                    {sendingComment ? (
                                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-primary"></div>
                                    ) : (
                                        <Send size={14} />
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-2">
                            <p className="text-xs text-textMuted">Faça login para comentar</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};