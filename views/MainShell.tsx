import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { TabOption } from '../types';
import { PlayCircle, Clock, Star } from 'lucide-react';

interface MainShellProps {
  onLogout: () => void;
}

export const MainShell: React.FC<MainShellProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabOption>(TabOption.HOME);

  // Mock Content for Content View
  const courses = [
    { title: "Dominando E-commerce", modules: 12, hours: 24, progress: 45 },
    { title: "Marketing Digital 2.0", modules: 8, hours: 16, progress: 10 },
    { title: "Gestão de Tráfego Pago", modules: 15, hours: 30, progress: 0 },
  ];

  return (
    <div className="min-h-screen bg-background text-textMain flex">
      <Sidebar onLogout={onLogout} />
      
      <main className="flex-1 md:ml-64 relative">
        <TopBar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="p-6 max-w-7xl mx-auto animate-fadeIn">
          {activeTab === TabOption.HOME ? (
            <div className="space-y-8">
              {/* Hero Banner */}
              <div className="bg-gradient-to-r from-primary to-primaryHover rounded-2xl p-8 relative overflow-hidden shadow-[0_0_40px_rgba(139,44,245,0.2)]">
                <div className="relative z-10">
                  <h2 className="text-3xl font-bold text-white mb-2">Olá, Estudante!</h2>
                  <p className="text-white/80 max-w-lg">Continue de onde parou. O módulo de "Escalando suas vendas" está aguardando você.</p>
                  <button className="mt-6 bg-white text-primary px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                    Continuar estudando
                  </button>
                </div>
                {/* Abstract Shape */}
                <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 bg-white transform skew-x-12"></div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Aulas Assistidas", val: "24" },
                  { label: "Horas Estudadas", val: "12h" },
                  { label: "Certificados", val: "1" }
                ].map((stat, i) => (
                  <div key={i} className="bg-surface border border-border p-6 rounded-xl">
                    <p className="text-textMuted text-sm font-medium uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.val}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Meus Cursos</h2>
                <div className="text-sm text-textMuted">3 cursos disponíveis</div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {courses.map((course, idx) => (
                  <div key={idx} className="bg-surface border border-border rounded-xl p-6 hover:border-primary/50 transition-colors group cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-surfaceHighlight rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <PlayCircle size={24} />
                      </div>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star size={14} fill="currentColor" />
                        <span className="text-sm font-medium text-white">4.8</span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-white mb-2">{course.title}</h3>
                    
                    <div className="flex items-center gap-4 text-sm text-textMuted mb-6">
                      <span className="flex items-center gap-1"><Star size={14}/> {course.modules} Módulos</span>
                      <span className="flex items-center gap-1"><Clock size={14}/> {course.hours}h</span>
                    </div>

                    <div className="w-full bg-surfaceHighlight h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-500" 
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-textMuted mt-2 text-right">{course.progress}% concluído</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};