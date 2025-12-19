import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Course, Module, Lesson } from '../types';
import { 
    getCourses, upsertCourse, deleteCourse, uploadCourseThumbnail,
    getCourseContent, upsertModule, deleteModule, upsertLesson, deleteLesson 
} from '../services/supabase';
import { 
    Plus, Edit, Trash2, ChevronLeft, Layers, 
    Video, Save, Image as ImageIcon, ChevronDown, ChevronUp, X 
} from 'lucide-react';

export const AdminView: React.FC = () => {
    // Modes: 'list' | 'course_form' | 'course_content'
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
    
    // Collapsed state for content manager
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        setLoading(true);
        const data = await getCourses();
        setCourses(data);
        setLoading(false);
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
        setViewMode('course_form');
    };

    const handleEditCourseMeta = (course: Course) => {
        setEditingCourse(course);
        setThumbnailFile(null);
        setViewMode('course_form');
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

    if (viewMode === 'list') {
        return (
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-white">Gestão de Cursos</h1>
                    <Button onClick={handleCreateCourse} className="w-auto px-6">
                        <Plus size={18} className="mr-2" /> Novo Curso
                    </Button>
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
                            <button 
                                onClick={() => handleDeleteModule(module.id)} 
                                className="text-textMuted hover:text-red-400 p-2"
                                title="Excluir Módulo"
                            >
                                <Trash2 size={16} />
                            </button>
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
                                            <button 
                                                onClick={() => handleDeleteLesson(lesson.id)} 
                                                className="text-textMuted hover:text-red-400 p-2"
                                                title="Excluir Aula"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {newLessonModuleId === module.id ? (
                                    <div className="bg-surfaceHighlight/30 p-4 rounded-lg border border-primary/30 animate-fadeIn">
                                        <h4 className="text-sm font-bold text-primary mb-3">Nova Aula</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                            <input 
                                                placeholder="Título da Aula" 
                                                className="bg-surface border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                                value={newLesson.title || ''}
                                                onChange={e => setNewLesson({...newLesson, title: e.target.value})}
                                            />
                                            <input 
                                                placeholder="YouTube ID (ex: M7lc1UVf-VE)" 
                                                className="bg-surface border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                                value={newLesson.video_id || ''}
                                                onChange={e => setNewLesson({...newLesson, video_id: e.target.value})}
                                            />
                                        </div>
                                        <textarea 
                                             placeholder="Descrição (opcional)" 
                                             className="w-full bg-surface border border-border rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:border-primary"
                                             rows={2}
                                             value={newLesson.description || ''}
                                             onChange={e => setNewLesson({...newLesson, description: e.target.value})}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => setNewLessonModuleId(null)}
                                                className="px-3 py-1.5 text-xs font-medium text-textMuted hover:text-white"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                onClick={() => handleSaveLesson(module.id)}
                                                className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded hover:bg-primaryHover"
                                            >
                                                Salvar Aula
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