import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, PlayCircle, ChevronDown, ChevronUp, CheckCircle, Check } from 'lucide-react';
import { Module, Lesson } from '../types';
import { getCourseContent, getCompletedLessons, toggleLessonProgress, supabase } from '../services/supabase';

export const CoursePlayerView: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>();
  const navigate = useNavigate();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  
  // Controle de aulas concluídas (Set de IDs)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  // Controle dos módulos abertos/fechados no accordion
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Carrega conteúdo e progresso
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const userId = (await supabase?.auth.getUser())?.data.user?.id;
        
        // 1. Busca Módulos e Aulas
        const contentData = await getCourseContent(courseId);
        setModules(contentData);

        // 2. Busca Progresso
        if (userId) {
            console.log("CoursePlayer: Buscando progresso salvo para", userId);
            const completedIds = await getCompletedLessons(userId, courseId);
            setCompletedLessons(new Set(completedIds));
        }

        // 3. Define estado inicial - se tiver lessonId na URL, usa ele
        if (contentData.length > 0) {
          setExpandedModules(new Set([contentData[0].id]));
          
          if (lessonId) {
            // Busca a aula específica pela URL
            const targetLesson = contentData
              .flatMap(m => m.lessons)
              .find(l => l.id === lessonId);
            if (targetLesson) {
              setActiveLesson(targetLesson);
              // Expande o módulo que contém a aula
              const moduleWithLesson = contentData.find(m => 
                m.lessons.some(l => l.id === lessonId)
              );
              if (moduleWithLesson) {
                setExpandedModules(new Set([moduleWithLesson.id]));
              }
            } else if (contentData[0].lessons.length > 0) {
              setActiveLesson(contentData[0].lessons[0]);
            }
          } else if (contentData[0].lessons.length > 0) {
            setActiveLesson(contentData[0].lessons[0]);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar conteúdo:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, lessonId]);

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleLessonSelect = (lesson: Lesson) => {
    setActiveLesson(lesson);
    // Atualiza a URL sem recarregar a página
    navigate(`/app/course/${courseId}/lesson/${lesson.id}`, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleComplete = async () => {
      if (!activeLesson) return;
      
      const userId = (await supabase?.auth.getUser())?.data.user?.id;
      if (!userId) return;

      // Otimista: Atualiza UI antes da request
      const isCompleted = completedLessons.has(activeLesson.id);
      const newSet = new Set(completedLessons);
      
      if (isCompleted) {
          newSet.delete(activeLesson.id);
      } else {
          newSet.add(activeLesson.id);
      }
      setCompletedLessons(newSet);

      try {
          await toggleLessonProgress(userId, activeLesson.id);
          // Sucesso (estado já está atualizado)
      } catch (e) {
          // Reverte em caso de erro
          console.error("Erro ao salvar progresso", e);
          if (isCompleted) newSet.add(activeLesson.id); 
          else newSet.delete(activeLesson.id);
          setCompletedLessons(new Set(newSet));
      }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-white">
        <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-textMuted">Carregando sala de aula...</p>
        </div>
      </div>
    );
  }

  const isCurrentLessonCompleted = activeLesson ? completedLessons.has(activeLesson.id) : false;

  return (
    <div className="min-h-screen bg-background text-textMain flex flex-col">
      {/* Header Compacto */}
      <div className="h-16 border-b border-border bg-surface flex items-center px-4 sticky top-0 z-20">
        <button 
          onClick={() => navigate('/app/courses')}
          className="flex items-center gap-2 text-textMuted hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft size={18} />
          Voltar para Cursos
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Video Player */}
            <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-border">
              {activeLesson ? (
                <iframe 
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${activeLesson.video_id}?autoplay=1&modestbranding=1&rel=0&controls=0&showinfo=0&iv_load_policy=3`}
                  title={activeLesson.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-textMuted">
                  Selecione uma aula
                </div>
              )}
            </div>

            {/* Lesson Info & Actions */}
            <div className="animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <h1 className="text-2xl lg:text-3xl font-bold text-white">
                    {activeLesson?.title}
                  </h1>
                  
                  {activeLesson && (
                      <button 
                        onClick={handleToggleComplete}
                        className={`
                            px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap
                            ${isCurrentLessonCompleted 
                                ? 'bg-transparent border border-green-500 text-green-500 hover:bg-green-500/10' 
                                : 'bg-primary text-white hover:bg-primaryHover shadow-[0_0_15px_rgba(139,44,245,0.3)]'}
                        `}
                      >
                        {isCurrentLessonCompleted ? (
                            <>
                                <Check size={18} /> Concluída
                            </>
                        ) : (
                            <>
                                Concluir aula -&gt;
                            </>
                        )}
                      </button>
                  )}
              </div>
              
              <div className="bg-surface rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold mb-2">Descrição da Aula</h3>
                <p className="text-textMuted leading-relaxed">
                  {activeLesson?.description || "Sem descrição disponível para esta aula."}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Sidebar (Modules & Lessons) */}
        <div className="w-full lg:w-[380px] bg-surface border-l border-border h-full overflow-y-auto custom-scrollbar flex flex-col">
           <div className="p-5 border-b border-border">
             <h2 className="font-bold text-lg text-white">Conteúdo do Curso</h2>
             <p className="text-xs text-textMuted mt-1">
               {completedLessons.size} de {modules.reduce((acc, m) => acc + m.lessons.length, 0)} aulas concluídas
             </p>
             <div className="w-full h-1 bg-surfaceHighlight rounded-full mt-3 overflow-hidden">
                <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ 
                        width: `${(completedLessons.size / Math.max(modules.reduce((acc, m) => acc + m.lessons.length, 0), 1)) * 100}%` 
                    }}
                ></div>
             </div>
           </div>

           <div className="flex-1">
             {modules.map((module) => (
               <div key={module.id} className="border-b border-border/50">
                 {/* Module Header */}
                 <button 
                   onClick={() => toggleModule(module.id)}
                   className="w-full flex items-center justify-between p-4 bg-surface hover:bg-surfaceHighlight transition-colors text-left"
                 >
                   <span className="font-medium text-sm text-textMain uppercase tracking-wide">
                     {module.title}
                   </span>
                   {expandedModules.has(module.id) ? (
                     <ChevronUp size={16} className="text-textMuted" />
                   ) : (
                     <ChevronDown size={16} className="text-textMuted" />
                   )}
                 </button>

                 {/* Lessons List */}
                 {expandedModules.has(module.id) && (
                   <div className="bg-background/50">
                     {module.lessons.map((lesson) => {
                       const isActive = activeLesson?.id === lesson.id;
                       const isCompleted = completedLessons.has(lesson.id);
                       
                       return (
                         <button
                           key={lesson.id}
                           onClick={() => handleLessonSelect(lesson)}
                           className={`
                             w-full flex items-start gap-3 p-4 text-left transition-all duration-200 border-l-2
                             ${isActive 
                               ? 'bg-primary/10 border-primary text-white' 
                               : 'border-transparent text-textMuted hover:text-textMain hover:bg-surfaceHighlight'}
                           `}
                         >
                            <div className="mt-0.5 relative">
                                {isCompleted ? (
                                    <CheckCircle size={18} className="text-green-500 fill-green-500/10" />
                                ) : (
                                    isActive ? <PlayCircle size={18} fill="currentColor" className="text-primary/20 text-primary" /> : <Play size={18} />
                                )}
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${isActive ? 'text-white' : ''} ${isCompleted ? 'text-textMuted line-through opacity-70' : ''}`}>
                                {lesson.title}
                              </p>
                              <p className="text-xs text-textMuted mt-1">
                                {lesson.duration || 10} min
                              </p>
                            </div>
                         </button>
                       );
                     })}
                   </div>
                 )}
               </div>
             ))}
           </div>
        </div>

      </div>
    </div>
  );
};