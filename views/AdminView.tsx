import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Course, Module, Lesson } from '../types';
import { 
    getCourses, upsertCourse, deleteCourse, uploadCourseThumbnail,
    getCourseContent, upsertModule, deleteModule, updateModule, upsertLesson, deleteLesson, updateLesson,
    getPendingPosts, moderatePost, getPendingComments, moderateComment
} from '../services/supabase';
import { 
    Plus, Edit, Trash2, ChevronLeft, Layers, 
    Video, Save, Image as ImageIcon, ChevronDown, ChevronUp, X, ShieldCheck, CheckCircle, XCircle
} from 'lucide-react';
import { Post, Comment } from '../types';

export const AdminView: React.FC = () => {
    // Modes: 'list' | 'course_form' | 'course_content' | 'moderation' | 'comments_moderation'
    const [viewMode, setViewMode] = useState('list');
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Edit States
    const [editingCourse, setEditingCourse] = useState<Partial<Course>>({});
    const [modules, setModules] = useState<Module[]>([]);
    
    // Form States - Content
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    
    // Module Form State (Substituindo o Prompt)
    const [isAddingModule, setIsAddingModule] = useState(false);
    const [newModuleTitle, setNewModuleTitle] = useState('');

    // Lesson Form State
    const [newLessonModuleId, setNewLessonModuleId] = useState<string | null>(null);
    const [newLesson, setNewLesson] = useState<Partial<Lesson>>({});
    
    // Edit States
    const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [editingLesson, setEditingLesson] = useState<Partial<Lesson>>({});
    
    // Collapsed state for content manager
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    
    // Access Control State (Blacklist)
    const [blockedEmailInput, setBlockedEmailInput] = useState('');
    
    // Moderation State
    const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
    const [loadingModeration, setLoadingModeration] = useState(false);
    const [pendingComments, setPendingComments] = useState<Comment[]>([]);
    const [loadingCommentsModeration, setLoadingCommentsModeration] = useState(false);

    useEffect(() => {
        loadCourses();
    }, []);

    useEffect(() => {
        if (viewMode === 'moderation') {
            loadPendingPosts();
        } else if (viewMode === 'comments_moderation') {
            loadPendingComments();
        }
    }, [viewMode]);

    const loadCourses = async () => {
        setLoading(true);
        const data = await getCourses();
        setCourses(data);
        setLoading(false);
    };

    const loadPendingPosts = async () => {
        setLoadingModeration(true);
        try {
            const data = await getPendingPosts();
            setPendingPosts(data);
        } catch (error) {
            console.error("Erro ao carregar posts pendentes:", error);
        } finally {
            setLoadingModeration(false);
        }
    };

    const loadPendingComments = async () => {
        setLoadingCommentsModeration(true);
        try {
            const data = await getPendingComments();
            setPendingComments(data);
        } catch (error) {
            console.error("Erro ao carregar comentários pendentes:", error);
        } finally {
            setLoadingCommentsModeration(false);
        }
    };

    const handleModeratePost = async (postId: string, status: 'approved' | 'rejected') => {
        // Encontra o post antes de removê-lo (para poder restaurar em caso de erro)
        const postToModerate = pendingPosts.find(p => p.id === postId);
        if (!postToModerate) {
            console.warn("Post não encontrado na lista:", postId);
            return;
        }

        // Atualização Otimista: Remove o post da lista ANTES do await
        setPendingPosts(prev => prev.filter(p => p.id !== postId));

        try {
            await moderatePost(postId, status);
            console.log(`Post ${postId} moderado com sucesso: ${status}`);
            // Se chegou aqui, a moderação foi bem-sucedida
            // O post já foi removido da lista (otimistic update)
        } catch (error: any) {
            console.error("Erro ao moderar post:", error);
            
            // Reverte a atualização otimista: adiciona o post de volta à lista
            setPendingPosts(prev => {
                // Verifica se o post já não está na lista (evita duplicatas)
                if (prev.find(p => p.id === postId)) {
                    return prev;
                }
                // Adiciona o post de volta na mesma posição (ou no início)
                return [postToModerate, ...prev];
            });
            
            // Mostra erro ao usuário
            alert(`Erro ao moderar post: ${error.message || 'Erro desconhecido. Verifique as permissões RLS ou tente novamente.'}`);
        }
    };

    const handleModerateComment = async (commentId: string, status: 'approved' | 'rejected') => {
        // Encontra o comentário antes de removê-lo (para poder restaurar em caso de erro)
        const commentToModerate = pendingComments.find(c => c.id === commentId);
        if (!commentToModerate) {
            console.warn("Comentário não encontrado na lista:", commentId);
            return;
        }

        // Atualização Otimista: Remove o comentário da lista ANTES do await
        setPendingComments(prev => prev.filter(c => c.id !== commentId));

        try {
            await moderateComment(commentId, status);
            console.log(`Comentário ${commentId} moderado com sucesso: ${status}`);
            // Se chegou aqui, a moderação foi bem-sucedida
            // O comentário já foi removido da lista (otimistic update)
        } catch (error: any) {
            console.error("Erro ao moderar comentário:", error);
            
            // Reverte a atualização otimista: adiciona o comentário de volta à lista
            setPendingComments(prev => {
                // Verifica se o comentário já não está na lista (evita duplicatas)
                if (prev.find(c => c.id === commentId)) {
                    return prev;
                }
                // Adiciona o comentário de volta na mesma posição (ou no início)
                return [commentToModerate, ...prev];
            });
            
            // Mostra erro ao usuário
            alert(`Erro ao moderar comentário: ${error.message || 'Erro desconhecido. Verifique as permissões RLS ou tente novamente.'}`);
        }
    };

    // Helper para recarregar o conteúdo (módulos/aulas) após alterações
    const refreshContent = async () => {
        if (editingCourse.id) {
            console.log("AdminView: Recarregando conteúdo do curso:", editingCourse.id);
            const data = await getCourseContent(editingCourse.id);
            setModules(data);
        }
    };

    const handleCreateCourse = () => {
        setEditingCourse({});
        setThumbnailFile(null);
        setBlockedEmailInput('');
        setViewMode('course_form');
    };

    const handleEditCourseMeta = (course: Course) => {
        setEditingCourse(course);
        setThumbnailFile(null);
        setBlockedEmailInput('');
        setViewMode('course_form');
    };

    const handleAddBlockedEmail = () => {
        const email = blockedEmailInput.trim().toLowerCase();
        if (!email) return;
        
        // Validação básica de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Por favor, insira um e-mail válido.');
            return;
        }

        const currentBlocked = editingCourse.blocked_emails || [];
        if (currentBlocked.includes(email)) {
            alert('Este e-mail já está na lista de bloqueados.');
            setBlockedEmailInput('');
            return;
        }

        setEditingCourse({
            ...editingCourse,
            blocked_emails: [...currentBlocked, email]
        });
        setBlockedEmailInput('');
    };

    const handleRemoveBlockedEmail = (emailToRemove: string) => {
        const currentBlocked = editingCourse.blocked_emails || [];
        setEditingCourse({
            ...editingCourse,
            blocked_emails: currentBlocked.filter(email => email !== emailToRemove)
        });
    };

    const handleManageContent = async (course: Course) => {
        console.log("AdminView: Abrindo gerenciador de conteúdo para:", course.title);
        setEditingCourse(course);
        setLoading(true);
        try {
            const data = await getCourseContent(course.id);
            setModules(data);
            setExpandedModules(new Set(data.map(m => m.id))); // Open all by default
            setViewMode('course_content');
            
            // Reset states
            setIsAddingModule(false);
            setNewModuleTitle('');
            setNewLessonModuleId(null);
            setNewLesson({});
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCourse = async (id: string, e: React.MouseEvent) => {
        // Importante: Para a propagação do evento para não clicar no card
        e.stopPropagation();

        if (window.confirm('Tem certeza que deseja excluir este curso? Esta ação não pode ser desfeita.')) {
            try {
                console.log("AdminView: Solicitando exclusão do curso:", id);
                await deleteCourse(id);
                console.log("AdminView: Curso excluído com sucesso.");
                
                // Atualização Otimista da UI
                setCourses(prev => prev.filter(c => c.id !== id));
                alert("Curso removido com sucesso.");
            } catch (error: any) {
                console.error("AdminView: Erro ao remover curso:", error);
                alert(`Erro ao remover curso: ${error.message}`);
            }
        }
    };

    const handleSaveCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            console.log("AdminView: Iniciando processo de salvar curso...");
            
            let finalUrl = editingCourse.thumbnail_url;
            
            // 1. Se houver arquivo, faz upload e espera a URL
            if (thumbnailFile) {
                console.log("AdminView: Fazendo upload da imagem...");
                const url = await uploadCourseThumbnail(thumbnailFile);
                if (url) {
                    console.log("AdminView: URL da imagem obtida:", url);
                    finalUrl = url;
                } else {
                    throw new Error("Falha ao obter URL da imagem após upload.");
                }
            }

            // 2. Prepara o payload
            const coursePayload = {
                ...editingCourse,
                thumbnail_url: finalUrl,
                updated_at: new Date().toISOString() 
            };
            
            if (!coursePayload.id) delete coursePayload.id;

            console.log("AdminView: Enviando payload para salvar:", coursePayload);

            // 3. Salva no banco (Upsert)
            const savedCourse = await upsertCourse(coursePayload);

            if (savedCourse) {
                alert("Curso salvo com sucesso!");
                if (!editingCourse.id) {
                    setEditingCourse(savedCourse);
                }
                await loadCourses();
                setViewMode('list');
            } else {
                alert("Curso salvo (verifique os logs).");
                await loadCourses();
                setViewMode('list');
            }

        } catch (err: any) {
            console.error("AdminView: Erro capturado ao salvar curso:", err);
            alert(`Erro ao salvar curso: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Module Logic ---

    const handleSaveNewModule = async () => {
        console.log("AdminView: Salvando novo módulo...");

        // Verificação de Integridade
        if (!editingCourse.id) {
            alert("Erro: Curso não identificado. Salve o curso antes de adicionar módulos.");
            return;
        }

        if (!newModuleTitle.trim()) {
            alert("O título do módulo é obrigatório.");
            return;
        }

        try {
            await upsertModule({
                course_id: editingCourse.id,
                title: newModuleTitle,
                order: modules.length + 1,
                updated_at: new Date().toISOString()
            } as any);
            
            setNewModuleTitle('');
            setIsAddingModule(false);
            await refreshContent();
            
        } catch(e: any) { 
            console.error("AdminView Error:", e);
            alert(`Erro ao adicionar módulo: ${e.message}`);
        }
    };

    const handleEditModule = async (moduleId: string, currentTitle: string) => {
        const newTitle = window.prompt("Novo nome do módulo:", currentTitle);
        if (newTitle && newTitle.trim() && newTitle !== currentTitle) {
            try {
                await updateModule(moduleId, newTitle.trim());
                console.log("AdminView: Módulo atualizado com sucesso.");
                // Atualização otimista
                setModules(prev => prev.map(m => 
                    m.id === moduleId ? { ...m, title: newTitle.trim() } : m
                ));
            } catch (e: any) {
                console.error("AdminView Error:", e);
                alert(`Erro ao atualizar módulo: ${e.message}`);
            }
        }
    };

    const handleDeleteModule = async (moduleId: string) => {
        console.log("AdminView: Clique em excluir módulo:", moduleId);
        if(window.confirm("Tem certeza que deseja excluir este módulo e todas as suas aulas?")) {
            try {
                await deleteModule(moduleId);
                console.log("AdminView: Módulo excluído com sucesso.");
                await refreshContent();
            } catch (e: any) {
                console.error("AdminView Error:", e);
                alert(`Erro ao deletar módulo: ${e.message}`);
            }
        }
    };

    // --- Lesson Logic ---

    const handleEditLesson = (lesson: Lesson, moduleId: string) => {
        setEditingLessonId(lesson.id);
        setEditingLesson({
            title: lesson.title,
            video_id: lesson.video_id,
            description: lesson.description || '',
            duration: lesson.duration || 0
        });
        // Abre o módulo se estiver fechado e fecha o formulário de nova aula se estiver aberto
        setExpandedModules(prev => new Set([...prev, moduleId]));
        setNewLessonModuleId(null);
        setNewLesson({});
    };

    const handleSaveLesson = async (moduleId: string) => {
        console.log("Botão clicado: Salvando aula para módulo", moduleId);

        // Validação usando video_id conforme banco de dados
        if (!newLesson.title || !newLesson.video_id) {
            alert("Título e ID do Vídeo são obrigatórios");
            return;
        }

        try {
            const lessonPayload = {
                ...newLesson,
                module_id: moduleId,
                order: 99, // Idealmente seria: (modules.find(m => m.id === moduleId)?.lessons.length || 0) + 1
                updated_at: new Date().toISOString()
            };

            console.log("AdminView: Enviando aula para save:", lessonPayload);

            await upsertLesson(lessonPayload as any);
            
            // Reset form
            setNewLessonModuleId(null);
            setNewLesson({});
            
            await refreshContent();
        } catch(e: any) { 
             console.error("AdminView Error:", e);
             alert(`Erro ao salvar aula: ${e.message}`);
        }
    };

    const handleUpdateLesson = async (lessonId: string) => {
        if (!editingLesson.title || !editingLesson.video_id) {
            alert("Título e ID do Vídeo são obrigatórios");
            return;
        }

        try {
            const updates = {
                title: editingLesson.title,
                video_id: editingLesson.video_id,
                description: editingLesson.description || '',
                duration: editingLesson.duration || 0
            };

            await updateLesson(lessonId, updates);
            console.log("AdminView: Aula atualizada com sucesso.");
            
            // Atualização otimista
            setModules(prev => prev.map(module => ({
                ...module,
                lessons: module.lessons.map(lesson =>
                    lesson.id === lessonId
                        ? { ...lesson, ...updates }
                        : lesson
                )
            })));
            
            // Reset form
            setEditingLessonId(null);
            setEditingLesson({});
            
            // Recarrega para garantir sincronização
            await refreshContent();
        } catch (e: any) {
            console.error("AdminView Error:", e);
            alert(`Erro ao atualizar aula: ${e.message}`);
        }
    };

    const handleDeleteLesson = async (lessonId: string) => {
        console.log("AdminView: Clique em excluir aula:", lessonId);
        if(window.confirm("Tem certeza que deseja excluir esta aula?")) {
            try {
                await deleteLesson(lessonId);
                console.log("AdminView: Aula excluída com sucesso.");
                await refreshContent();
            } catch (e: any) {
                console.error("AdminView Error:", e);
                alert(`Erro ao excluir aula: ${e.message}`);
            }
        }
    };

    // --- Renders ---

    if (viewMode === 'moderation') {
        return (
            <div className="p-8 max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => setViewMode('list')} className="flex items-center text-textMuted hover:text-white mb-0">
                        <ChevronLeft size={18} className="mr-1"/> Voltar
                    </button>
                    <h1 className="text-2xl font-bold text-white">Moderação de Postagens</h1>
                    <div className="w-20"></div> {/* Spacer para centralizar */}
                </div>

                {loadingModeration ? (
                    <div className="text-center py-10 text-textMuted">Carregando posts pendentes...</div>
                ) : pendingPosts.length === 0 ? (
                    <div className="text-center py-20">
                        <ShieldCheck size={48} className="mx-auto text-textMuted mb-4 opacity-50" />
                        <h3 className="text-lg font-medium text-white mb-2">Nenhum post pendente</h3>
                        <p className="text-textMuted text-sm">Todos os posts foram moderados.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingPosts.map((post) => (
                            <div key={post.id} className="bg-surface border border-border rounded-xl p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className="w-10 h-10 rounded-full bg-surfaceHighlight flex items-center justify-center overflow-hidden border border-border">
                                            {post.profile?.avatar_url ? (
                                                <img src={post.profile.avatar_url} className="w-full h-full object-cover" alt={post.profile.username} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-textMuted text-sm">
                                                    {post.profile?.username?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-white">{post.profile?.username || 'Usuário'}</span>
                                                <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/50">
                                                    Pendente
                                                </span>
                                            </div>
                                            <p className="text-xs text-textMuted">{new Date(post.created_at).toLocaleString('pt-BR')}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mb-4">
                                    <p className="text-white leading-relaxed whitespace-pre-wrap">{post.content}</p>
                                    {post.image_urls && post.image_urls.length > 0 && (
                                        <div className="mt-3 flex gap-2 flex-wrap">
                                            {post.image_urls.slice(0, 3).map((url, idx) => (
                                                <img key={idx} src={url} alt={`Imagem ${idx + 1}`} className="w-24 h-24 object-cover rounded-md border border-border" />
                                            ))}
                                            {post.image_urls.length > 3 && (
                                                <div className="w-24 h-24 bg-surfaceHighlight rounded-md border border-border flex items-center justify-center text-textMuted text-xs">
                                                    +{post.image_urls.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-border">
                                    <button
                                        onClick={() => handleModeratePost(post.id, 'approved')}
                                        className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={loadingModeration}
                                    >
                                        <CheckCircle size={16} />
                                        Aprovar
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Tem certeza que deseja rejeitar este post? Esta ação não pode ser desfeita.')) {
                                                handleModeratePost(post.id, 'rejected');
                                            }
                                        }}
                                        className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={loadingModeration}
                                    >
                                        <XCircle size={16} />
                                        Rejeitar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (viewMode === 'comments_moderation') {
        return (
            <div className="p-8 max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => setViewMode('list')} className="flex items-center text-textMuted hover:text-white mb-0">
                        <ChevronLeft size={18} className="mr-1"/> Voltar
                    </button>
                    <h1 className="text-2xl font-bold text-white">Moderação de Comentários</h1>
                    <div className="w-20"></div> {/* Spacer para centralizar */}
                </div>

                {loadingCommentsModeration ? (
                    <div className="text-center py-10 text-textMuted">Carregando comentários pendentes...</div>
                ) : pendingComments.length === 0 ? (
                    <div className="text-center py-20">
                        <ShieldCheck size={48} className="mx-auto text-textMuted mb-4 opacity-50" />
                        <h3 className="text-lg font-medium text-white mb-2">Nenhum comentário pendente</h3>
                        <p className="text-textMuted text-sm">Todos os comentários foram moderados.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingComments.map((comment) => (
                            <div key={comment.id} className="bg-surface border border-border rounded-xl p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className="w-10 h-10 rounded-full bg-surfaceHighlight flex items-center justify-center overflow-hidden border border-border">
                                            {comment.profile?.avatar_url ? (
                                                <img src={comment.profile.avatar_url} className="w-full h-full object-cover" alt={comment.profile.username} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-textMuted text-sm">
                                                    {comment.profile?.username?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-white">{comment.profile?.username || 'Usuário'}</span>
                                                <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/50">
                                                    Pendente
                                                </span>
                                            </div>
                                            <p className="text-xs text-textMuted">{new Date(comment.created_at).toLocaleString('pt-BR')}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mb-4">
                                    <p className="text-white leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                                    {/* Mostra contexto do post se disponível */}
                                    {(comment as any).post_content && (
                                        <div className="mt-3 p-3 bg-[#1A1A1A] border border-[#262626] rounded-lg">
                                            <p className="text-xs text-textMuted mb-1">Post original:</p>
                                            <p className="text-sm text-gray-400 line-clamp-2">{(comment as any).post_content}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-border">
                                    <button
                                        onClick={() => handleModerateComment(comment.id, 'approved')}
                                        className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={loadingCommentsModeration}
                                    >
                                        <CheckCircle size={16} />
                                        Aprovar
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Tem certeza que deseja rejeitar este comentário? Esta ação não pode ser desfeita.')) {
                                                handleModerateComment(comment.id, 'rejected');
                                            }
                                        }}
                                        className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={loadingCommentsModeration}
                                    >
                                        <XCircle size={16} />
                                        Rejeitar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (viewMode === 'list') {
        return (
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-white">Gestão de Cursos</h1>
                    <div className="flex gap-3">
                        <Button onClick={() => setViewMode('moderation')} className="w-auto px-6" variant="secondary">
                            <ShieldCheck size={18} className="mr-2" /> Moderação Posts ({pendingPosts.length})
                        </Button>
                        <Button onClick={() => setViewMode('comments_moderation')} className="w-auto px-6" variant="secondary">
                            <ShieldCheck size={18} className="mr-2" /> Moderação Comentários ({pendingComments.length})
                        </Button>
                        <Button onClick={handleCreateCourse} className="w-auto px-6">
                            <Plus size={18} className="mr-2" /> Novo Curso
                        </Button>
                    </div>
                </div>
                
                {loading ? (
                    <div className="text-center py-10 text-textMuted">Carregando...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(course => (
                            <div key={course.id} className="bg-surface border border-border rounded-xl p-4 flex flex-col">
                                <div className="h-32 bg-surfaceHighlight rounded-lg mb-4 overflow-hidden relative">
                                    {course.thumbnail_url ? (
                                        <img src={course.thumbnail_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-textMuted">Sem capa</div>
                                    )}
                                </div>
                                <h3 className="font-bold text-white mb-2">{course.title}</h3>
                                <div className="mt-auto flex gap-2 pt-4">
                                    <button 
                                        onClick={() => handleManageContent(course)}
                                        className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Layers size={16} /> Conteúdo
                                    </button>
                                    <button 
                                        onClick={() => handleEditCourseMeta(course)}
                                        className="p-2 bg-surfaceHighlight hover:bg-border rounded-lg text-textMuted hover:text-white transition-colors"
                                        title="Editar Informações"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button 
                                        onClick={(e) => handleDeleteCourse(course.id, e)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                        title="Excluir Curso"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (viewMode === 'course_form') {
        return (
            <div className="p-8 max-w-2xl mx-auto">
                <button onClick={() => setViewMode('list')} className="flex items-center text-textMuted hover:text-white mb-6">
                    <ChevronLeft size={18} className="mr-1"/> Cancelar
                </button>
                
                <h2 className="text-2xl font-bold text-white mb-6">
                    {editingCourse.id ? 'Editar Curso' : 'Novo Curso'}
                </h2>

                <form onSubmit={handleSaveCourse} className="space-y-6 bg-surface p-6 rounded-xl border border-border">
                    <Input 
                        label="Título do Curso" 
                        value={editingCourse.title || ''} 
                        onChange={e => setEditingCourse({...editingCourse, title: e.target.value})}
                        required
                    />
                    
                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-1.5">Descrição</label>
                        <textarea 
                            className="w-full bg-surfaceHighlight border border-border text-textMain rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            rows={4}
                            value={editingCourse.description || ''}
                            onChange={e => setEditingCourse({...editingCourse, description: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-1.5">Capa do Curso</label>
                        <div className="flex items-center gap-4">
                            <label className="cursor-pointer bg-surfaceHighlight border border-dashed border-border hover:border-primary px-4 py-8 rounded-lg flex flex-col items-center justify-center w-32 h-32 transition-colors">
                                <ImageIcon size={24} className="text-textMuted mb-2" />
                                <span className="text-xs text-textMuted">Upload</span>
                                <input type="file" className="hidden" accept="image/*" onChange={e => setThumbnailFile(e.target.files?.[0] || null)} />
                            </label>
                            {thumbnailFile ? (
                                <span className="text-sm text-green-400">Arquivo selecionado: {thumbnailFile.name}</span>
                            ) : editingCourse.thumbnail_url && (
                                <img src={editingCourse.thumbnail_url} className="w-32 h-32 object-cover rounded-lg border border-border" />
                            )}
                        </div>
                    </div>

                    {/* Controle de Acesso (Blacklist) */}
                    <div className="border-t border-border pt-6">
                        <h3 className="text-lg font-semibold text-white mb-2">Restringir Acesso (Bloquear Alunos)</h3>
                        <p className="text-sm text-textMuted mb-4">
                            O curso é público por padrão. Adicione e-mails aqui para REMOVER o acesso desses usuários específicos.
                        </p>
                        
                        <div className="flex gap-2 mb-4">
                            <input
                                type="email"
                                className="flex-1 bg-surfaceHighlight border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Digite o e-mail do aluno..."
                                value={blockedEmailInput}
                                onChange={e => setBlockedEmailInput(e.target.value)}
                                onKeyPress={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddBlockedEmail();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleAddBlockedEmail}
                                className="bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
                            >
                                Bloquear Aluno
                            </button>
                        </div>

                        {editingCourse.blocked_emails && editingCourse.blocked_emails.length > 0 && (
                            <div className="bg-surfaceHighlight/50 rounded-lg p-4 border border-border">
                                <p className="text-sm font-medium text-textMuted mb-3">Alunos Bloqueados ({editingCourse.blocked_emails.length}):</p>
                                <div className="space-y-2">
                                    {editingCourse.blocked_emails.map((email, index) => (
                                        <div key={index} className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2 border border-border/50">
                                            <span className="text-sm text-white">{email}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveBlockedEmail(email)}
                                                className="text-textMuted hover:text-red-400 transition-colors p-1"
                                                title="Remover bloqueio"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <Button type="submit" isLoading={loading}>
                        <Save size={18} className="mr-2" /> Salvar Curso
                    </Button>
                </form>
            </div>
        );
    }

    // Content View
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => setViewMode('list')} className="flex items-center text-textMuted hover:text-white">
                    <ChevronLeft size={18} className="mr-1"/> Voltar
                </button>
                <h2 className="text-xl font-bold text-white">Conteúdo: {editingCourse.title}</h2>
            </div>

            <div className="mb-8">
                {isAddingModule ? (
                    <div className="bg-surface border border-primary/50 rounded-xl p-4 animate-fadeIn">
                        <h4 className="text-sm font-bold text-primary mb-3">Novo Módulo</h4>
                        <div className="flex gap-3">
                            <input 
                                className="flex-1 bg-surfaceHighlight border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                                placeholder="Digite o nome do módulo..."
                                value={newModuleTitle}
                                onChange={e => setNewModuleTitle(e.target.value)}
                                autoFocus
                            />
                            <button 
                                onClick={handleSaveNewModule}
                                className="bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                            >
                                Salvar
                            </button>
                            <button 
                                onClick={() => { setIsAddingModule(false); setNewModuleTitle(''); }}
                                className="bg-surfaceHighlight hover:bg-border text-textMuted px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-end">
                        <Button onClick={() => setIsAddingModule(true)} className="w-auto text-sm py-2 px-4" variant="secondary">
                            <Plus size={16} className="mr-2" /> Adicionar Módulo
                        </Button>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {modules.map((module) => (
                    <div key={module.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-surfaceHighlight/50">
                            <div className="flex items-center gap-3">
                                <button onClick={() => {
                                    const next = new Set(expandedModules);
                                    if(next.has(module.id)) next.delete(module.id);
                                    else next.add(module.id);
                                    setExpandedModules(next);
                                }}>
                                    {expandedModules.has(module.id) ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                                </button>
                                <span className="font-bold text-white">{module.title}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => handleEditModule(module.id, module.title)} 
                                    className="text-textMuted hover:text-blue-400 p-2 transition-colors"
                                    title="Editar Módulo"
                                >
                                    <Edit size={16} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteModule(module.id)} 
                                    className="text-textMuted hover:text-red-400 p-2 transition-colors"
                                    title="Excluir Módulo"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {expandedModules.has(module.id) && (
                            <div className="p-4 bg-background/50">
                                <div className="space-y-2 mb-4">
                                    {module.lessons.map(lesson => (
                                        <div key={lesson.id} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border/50 hover:border-border">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-surfaceHighlight flex items-center justify-center">
                                                    <Video size={14} className="text-primary"/>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white">{lesson.title}</p>
                                                    <p className="text-xs text-textMuted">Vídeo ID: {lesson.video_id}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={() => handleEditLesson(lesson, module.id)} 
                                                    className="text-textMuted hover:text-blue-400 p-2 transition-colors"
                                                    title="Editar Aula"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteLesson(lesson.id)} 
                                                    className="text-textMuted hover:text-red-400 p-2 transition-colors"
                                                    title="Excluir Aula"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {(newLessonModuleId === module.id || (editingLessonId && module.lessons.some(l => l.id === editingLessonId))) ? (
                                    <div className="bg-surfaceHighlight/30 p-4 rounded-lg border border-primary/30 animate-fadeIn">
                                        <h4 className="text-sm font-bold text-primary mb-3">
                                            {editingLessonId ? 'Editar Aula' : 'Nova Aula'}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                            <input 
                                                placeholder="Título da Aula" 
                                                className="bg-surface border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                                                value={editingLessonId ? (editingLesson.title || '') : (newLesson.title || '')}
                                                onChange={e => editingLessonId 
                                                    ? setEditingLesson({...editingLesson, title: e.target.value})
                                                    : setNewLesson({...newLesson, title: e.target.value})
                                                }
                                            />
                                            <input 
                                                placeholder="YouTube ID (ex: M7lc1UVf-VE)" 
                                                className="bg-surface border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                                                value={editingLessonId ? (editingLesson.video_id || '') : (newLesson.video_id || '')}
                                                onChange={e => editingLessonId
                                                    ? setEditingLesson({...editingLesson, video_id: e.target.value})
                                                    : setNewLesson({...newLesson, video_id: e.target.value})
                                                }
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                            <input 
                                                type="number"
                                                min="0"
                                                placeholder="Duração (minutos)" 
                                                className="bg-surface border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                                                value={editingLessonId 
                                                    ? (editingLesson.duration || '')
                                                    : (newLesson.duration || '')
                                                }
                                                onChange={e => {
                                                    const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
                                                    if (editingLessonId) {
                                                        setEditingLesson({...editingLesson, duration: value});
                                                    } else {
                                                        setNewLesson({...newLesson, duration: value});
                                                    }
                                                }}
                                            />
                                            <textarea 
                                                 placeholder="Descrição (opcional)" 
                                                 className="bg-surface border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                                                 rows={2}
                                                 value={editingLessonId ? (editingLesson.description || '') : (newLesson.description || '')}
                                                 onChange={e => editingLessonId
                                                     ? setEditingLesson({...editingLesson, description: e.target.value})
                                                     : setNewLesson({...newLesson, description: e.target.value})
                                                 }
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => {
                                                    if (editingLessonId) {
                                                        setEditingLessonId(null);
                                                        setEditingLesson({});
                                                    } else {
                                                        setNewLessonModuleId(null);
                                                        setNewLesson({});
                                                    }
                                                }}
                                                className="px-3 py-1.5 text-xs font-medium text-textMuted hover:text-white"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                onClick={() => editingLessonId 
                                                    ? handleUpdateLesson(editingLessonId)
                                                    : handleSaveLesson(module.id)
                                                }
                                                className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded hover:bg-primaryHover"
                                            >
                                                {editingLessonId ? 'Atualizar Aula' : 'Salvar Aula'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => {
                                            setNewLessonModuleId(module.id);
                                            setNewLesson({});
                                        }}
                                        className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-textMuted hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={14} /> Adicionar Aula
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};