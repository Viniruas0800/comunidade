import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, BarChart } from 'lucide-react';
import { Course, UserProfile } from '../types';
import { getCourses, supabase } from '../services/supabase';

interface CoursesViewProps {
  userProfile: UserProfile | null;
}

export const CoursesView: React.FC<CoursesViewProps> = ({ userProfile }) => {
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const userId = userProfile?.id || (await supabase?.auth.getUser())?.data.user?.id;
        // Busca o email do usuário para filtrar cursos bloqueados
        const userEmail = userProfile?.email || (await supabase?.auth.getUser())?.data.user?.email;
        const data = await getCourses(userId, userEmail);
        setCoursesList(data);
      } catch (error) {
        console.error("Erro ao carregar cursos", error);
      } finally {
        setLoadingCourses(false);
      }
    };
    
    fetchCourses();
  }, [userProfile]);

  const handleCourseClick = (courseId: string) => {
    // Navega para a primeira aula do curso (ou podemos criar uma rota específica para o curso)
    navigate(`/app/course/${courseId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Catálogo de Cursos</h2>
        <div className="text-sm text-textMuted">{coursesList.length} cursos disponíveis</div>
      </div>

      {loadingCourses ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coursesList.map((course) => (
            <div 
              key={course.id} 
              onClick={() => handleCourseClick(course.id)}
              className="bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 group cursor-pointer flex flex-col h-full hover:shadow-[0_5px_20px_rgba(0,0,0,0.3)]"
            >
              {/* Course Image */}
              <div className="h-48 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-60 z-10"></div>
                {course.thumbnail_url ? (
                  <img 
                    src={course.thumbnail_url} 
                    alt={course.title} 
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                  />
                ) : (
                  <div className="w-full h-full bg-surfaceHighlight flex items-center justify-center">
                    <PlayCircle size={40} className="text-textMuted" />
                  </div>
                )}
                
                {/* Access Badge */}
                <div className="absolute bottom-3 right-3 z-20">
                  <span className="bg-primary/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
                    ACESSAR
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="text-textMuted text-sm line-clamp-2 mb-4 flex-1">
                  {course.description || "Sem descrição disponível."}
                </p>
                
                {/* Meta info & Progress */}
                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs text-textMuted mb-2">
                    <span className="flex items-center gap-1">
                      <BarChart size={14}/> {course.modules_count || 0} Módulos
                    </span>
                    <span className="text-primary font-bold">
                      {course.progress_percentage || 0}%
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-surfaceHighlight rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${course.progress_percentage || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

