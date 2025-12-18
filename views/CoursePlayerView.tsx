import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, PlayCircle, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { Module, Lesson } from '../types';
import { getCourseContent } from '../services/supabase';

interface CoursePlayerViewProps {
  courseId: string;
  onBack: () => void;
}

export const CoursePlayerView: React.FC<CoursePlayerViewProps> = ({ courseId, onBack }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  
  // Controle dos módulos abertos/fechados no accordion
  // Inicialmente vazio, será preenchido após carregar dados
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      try {
        const data = await getCourseContent(courseId);
        setModules(data);

        if (data.length > 0) {
          // Expande o primeiro módulo por padrão
          setExpandedModules(new Set([data[0].id]));
          
          // Seleciona a primeira aula do primeiro módulo se existir
          if (data[0].lessons.length > 0) {
            setActiveLesson(data[0].lessons[0]);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar conteúdo:", error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [courseId]);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <div className="min-h-screen bg-background text-textMain flex flex-col">
      {/* Header Compacto */}
      <div className="h-16 border-b border-border bg-surface flex items-center px-4 sticky top-0 z-20">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-textMuted hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft size={18} />
          Voltar para Cursos
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Main Content (Video Area) - Scrollable on mobile, static on desktop */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Video Player */}
            <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-border">
              {activeLesson ? (
                <iframe 
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${activeLesson.video_id}?autoplay=1&modestbranding=1&rel=0`}
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

            {/* Lesson Info */}
            <div className="animate-fadeIn">
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                {activeLesson?.title}
              </h1>
              
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
               {modules.reduce((acc, m) => acc + m.lessons.length, 0)} aulas disponíveis
             </p>
           </div>

           <div className="flex-1">
             {modules.map((module) => (
               <div key={module.id} className="border-b border-border/50">
                 {/* Module Header (Accordion Trigger) */}
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
                            <div className={`mt-0.5 ${isActive ? 'text-primary' : 'text-textMuted'}`}>
                              {isActive ? <PlayCircle size={18} fill="currentColor" className="text-primary/20" /> : <Play size={18} />}
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${isActive ? 'text-white' : ''}`}>
                                {lesson.title}
                              </p>
                              <p className="text-xs text-textMuted mt-1">
                                {lesson.duration_mins} min
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