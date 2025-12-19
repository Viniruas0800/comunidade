import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { TabOption, Course, UserProfile } from '../types';
import { PlayCircle, Clock, BarChart, CheckCircle } from 'lucide-react';
import { getCourses, getProfile, supabase } from '../services/supabase';
import { CoursePlayerView } from './CoursePlayerView';
import { AdminView } from './AdminView';
import { CommunityView } from './CommunityView'; // Importar a nova view

interface MainShellProps {
  onLogout: () => void;
}

export const MainShell: React.FC<MainShellProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabOption>(TabOption.HOME);
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Busca perfil ao montar para checar role
  useEffect(() => {
    const fetchProfile = async () => {
        if(supabase) {
            const {data: {user}} = await supabase.auth.getUser();
            if(user) {
                const profile = await getProfile(user.id);
                setUserProfile(profile);
            }
        } else {
            // Mock de admin para demo (se quiser testar, mude para 'admin')
            setUserProfile({ id: 'mock', email: 'test', role: 'admin' } as UserProfile);
        }
    };
    fetchProfile();
  }, []);

  // Busca cursos quando a aba muda para CONTENTS ou ADMIN (para listagem)
  useEffect(() => {
    if (activeTab === TabOption.CONTENTS) {
      const fetchCourses = async () => {
        setLoadingCourses(true);
        try {
          // Passamos o ID do usuário para calcular o progresso
          const userId = userProfile?.id || (await supabase?.auth.getUser())?.data.user?.id;
          const data = await getCourses(userId);
          setCoursesList(data);
        } catch (error) {
          console.error("Erro ao carregar cursos", error);
        } finally {
          setLoadingCourses(false);
        }
      };
      
      fetchCourses();
    }
  }, [activeTab, userProfile]);

  const handleCourseClick = (courseId: string) => {
    setSelectedCourseId(courseId);
  };

  const handleBackToCourses = async () => {
    // 1. Limpa seleção para voltar à lista
    setSelectedCourseId(null);
    
    // 2. Garante que a tab ativa é Conteúdos
    setActiveTab(TabOption.CONTENTS);
    
    // 3. Força recarregamento imediato para atualizar barras de progresso
    setLoadingCourses(true);
    try {
        const userId = userProfile?.id || (await supabase?.auth.getUser())?.data.user?.id;
        console.log("MainShell: Recalculando progresso para usuário...", userId);
        const data = await getCourses(userId);
        setCoursesList(data);
    } catch (error) {
        console.error("Erro ao atualizar progresso dos cursos", error);
    } finally {
        setLoadingCourses(false);
    }
  };

  // Se for ADMIN
  if (activeTab === TabOption.ADMIN) {
      if (userProfile?.role !== 'admin') {
          // Proteção básica: se não for admin, volta pra home
          setActiveTab(TabOption.HOME);
          return null;
      }
      return (
          <div className="min-h-screen bg-background text-textMain flex">
            <Sidebar 
                onLogout={onLogout} 
                userRole={userProfile.role} 
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />
            <main className="flex-1 md:ml-64 relative">
                <AdminView />
            </main>
          </div>
      );
  }

  // Se um curso estiver selecionado (Modo Player)
  if (selectedCourseId) {
    return (
      <CoursePlayerView 
        courseId={selectedCourseId} 
        onBack={handleBackToCourses} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-textMain flex">
      <Sidebar 
        onLogout={onLogout} 
        userRole={userProfile?.role}
        activeTab={activeTab}
        onTabChange={(tab) => {
             // Se clicar em Admin e não tiver permissão, ignora
             if(tab === TabOption.ADMIN && userProfile?.role !== 'admin') return;
             setActiveTab(tab);
        }}
      />
      
      <main className="flex-1 md:ml-64 relative">
        <TopBar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="p-6 max-w-7xl mx-auto animate-fadeIn">
          {/* COMMUNITY VIEW */}
          {activeTab === TabOption.COMMUNITY && (
            <CommunityView />
          )}

          {activeTab === TabOption.HOME && (
            <div className="space-y-8">
              {/* Hero Banner */}
              <div className="bg-gradient-to-r from-primary to-primaryHover rounded-2xl p-8 relative overflow-hidden shadow-[0_0_40px_rgba(139,44,245,0.2)]">
                <div className="relative z-10">
                  <h2 className="text-3xl font-bold text-white mb-2">Olá, {userProfile?.username || 'Estudante'}!</h2>
                  <p className="text-white/80 max-w-lg">Continue de onde parou. O conhecimento transforma o mundo.</p>
                  <button onClick={() => setActiveTab(TabOption.CONTENTS)} className="mt-6 bg-white text-primary px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                    Ir para Cursos
                  </button>
                </div>
                {/* Abstract Shape */}
                <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 bg-white transform skew-x-12"></div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Aulas Assistidas", val: "0" },
                  { label: "Horas Estudadas", val: "0h" },
                  { label: "Certificados", val: "0" }
                ].map((stat, i) => (
                  <div key={i} className="bg-surface border border-border p-6 rounded-xl">
                    <p className="text-textMuted text-sm font-medium uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === TabOption.CONTENTS && (
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
          )}
        </div>
      </main>
    </div>
  );
};