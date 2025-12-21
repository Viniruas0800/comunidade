import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { getUserStats, supabase } from '../services/supabase';

interface HomeViewProps {
  userProfile: UserProfile | null;
}

export const HomeView: React.FC<HomeViewProps> = ({ userProfile }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ lessonsWatched: number; hoursStudied: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const userId = userProfile?.id || (await supabase?.auth.getUser())?.data.user?.id;
        if (userId) {
          const userStats = await getUserStats(userId);
          setStats(userStats);
        } else {
          setStats({ lessonsWatched: 0, hoursStudied: 0 });
        }
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
        setStats({ lessonsWatched: 0, hoursStudied: 0 });
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [userProfile]);

  // Formata horas estudadas
  const formatHours = (hours: number): string => {
    if (hours === 0) return "0h";
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    }
    // Formato: "12.5h" ou "12h 30m"
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 0) {
      return `${wholeHours}h`;
    }
    return `${wholeHours}h ${minutes}m`;
  };

  const statsData = [
    { 
      label: "Aulas Assistidas", 
      val: loadingStats ? "..." : (stats?.lessonsWatched || 0).toString() 
    },
    { 
      label: "Horas Estudadas", 
      val: loadingStats ? "..." : formatHours(stats?.hoursStudied || 0) 
    },
    { 
      label: "Certificados", 
      val: "0" 
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary to-primaryHover rounded-2xl p-8 relative overflow-hidden shadow-[0_0_40px_rgba(139,44,245,0.2)]">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white mb-2">Olá, {userProfile?.username || 'Estudante'}!</h2>
          <p className="text-white/80 max-w-lg">Continue de onde parou. O conhecimento transforma o mundo.</p>
          <button 
            onClick={() => navigate('/app/courses')} 
            className="mt-6 bg-white text-primary px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Ir para Cursos
          </button>
        </div>
        {/* Abstract Shape */}
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 bg-white transform skew-x-12"></div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statsData.map((stat, i) => (
          <div key={i} className="bg-surface border border-border p-6 rounded-xl">
            <p className="text-textMuted text-sm font-medium uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-bold text-white mt-1 ${loadingStats ? 'opacity-50' : ''}`}>
              {stat.val}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

