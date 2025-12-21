import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { UserProfile, Course, Module, Lesson, Post, Comment, Notification } from '../types';

// Initialize Supabase Client
const isConfigured = SUPABASE_URL && SUPABASE_ANON_KEY && (SUPABASE_URL as string) !== "https://your-project.supabase.co";

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * Verifica na tabela 'pending_invites' se o par e-mail/token existe.
 */
export const validateInvite = async (email: string, token: string): Promise<boolean> => {
  if (!supabase) {
    console.warn("Supabase não configurado. Modo de demonstração ativo.");
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('pending_invites')
      .select('id')
      .eq('email', email)
      .eq('token', token)
      .maybeSingle();

    if (error) {
      console.error("Erro ao validar convite:", error);
      return false;
    }

    return !!data;
  } catch (err) {
    return false;
  }
};

/**
 * Atualiza o campo last_seen do perfil (último acesso)
 */
export const updateLastSeen = async (userId: string): Promise<void> => {
  if (!supabase) return;

  try {
    await supabase
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', userId);
  } catch (error) {
    console.error("Erro ao atualizar last_seen:", error);
    // Não lança erro para não quebrar o fluxo
  }
};

/**
 * Busca o perfil do usuário atual.
 * Atualiza automaticamente o last_seen ao buscar.
 */
export const getProfile = async (userId: string, updateLastSeenFlag: boolean = true): Promise<UserProfile | null> => {
  if (!supabase) return null;

  // Atualiza last_seen se solicitado (padrão: sim)
  if (updateLastSeenFlag) {
    await updateLastSeen(userId);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error("Erro ao buscar perfil:", error);
    return null;
  }

  return data as UserProfile;
};

/**
 * Atualiza os dados do perfil (usado no Onboarding).
 */
export const updateProfile = async (userId: string, updates: Partial<UserProfile>) => {
  if (!supabase) {
    // Mock delay para demo
    await new Promise(resolve => setTimeout(resolve, 1000));
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    throw new Error(`Erro ao atualizar perfil: ${error.message}`);
  }
};

/**
 * Faz upload do avatar para o bucket 'avatars'.
 */
export const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
  if (!supabase) {
    return URL.createObjectURL(file);
  }

  try {
    const fileName = `${userId}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error("Erro no upload:", error);
    throw new Error("Falha ao fazer upload da imagem.");
  }
};

/**
 * Faz upload da thumbnail do curso para o bucket 'course-thumbnails'.
 */
export const uploadCourseThumbnail = async (file: File): Promise<string | null> => {
  if (!supabase) {
    return URL.createObjectURL(file);
  }

  try {
    // Nome único
    const fileName = `course-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;

    console.log("Supabase Service: Iniciando upload da imagem...", fileName);

    const { error: uploadError } = await supabase.storage
      .from('course-thumbnails')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('course-thumbnails')
      .getPublicUrl(fileName);

    console.log("Supabase Service: Upload concluído. URL:", data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error("Erro no upload da capa:", error);
    throw new Error("Falha ao fazer upload da capa do curso.");
  }
};

/**
 * Busca todos os cursos com estatísticas de progresso.
 * Filtra cursos bloqueados se userEmail for fornecido (blacklist).
 */
export const getCourses = async (userId?: string, userEmail?: string): Promise<Course[]> => {
  if (!supabase) {
    return [
      { id: '1', title: "Dominando E-commerce", description: "Aprenda a criar sua loja do zero ao avançado.", thumbnail_url: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80&w=800", modules_count: 3, duration_hours: 24, progress_percentage: 15 },
      { id: '2', title: "Marketing Digital 2.0", description: "Estratégias modernas para redes sociais.", thumbnail_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800", modules_count: 2, duration_hours: 16, progress_percentage: 60 },
      { id: '3', title: "Gestão de Tráfego", description: "Como escalar suas vendas com anúncios pagos.", thumbnail_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800", modules_count: 4, duration_hours: 30, progress_percentage: 0 },
    ];
  }

  // 1. Busca Cursos
  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar cursos:", error);
    return [];
  }

  // 2. Filtra cursos bloqueados (blacklist) se userEmail for fornecido
  // Lista vazia ou null = curso visível para todos
  // Email na lista = usuário bloqueado (não vê o curso)
  let filteredCourses = courses || [];
  if (userEmail) {
    filteredCourses = filteredCourses.filter((course: any) => {
      const blockedEmails = course.blocked_emails;
      // Se blocked_emails for null, undefined, ou array vazio, curso é visível
      if (!blockedEmails || blockedEmails.length === 0) {
        return true;
      }
      // Se o email do usuário está na lista de bloqueados, remove o curso
      return !blockedEmails.includes(userEmail);
    });
  }

  if (!userId) {
    return filteredCourses as Course[];
  }

  // 3. Calcula progresso dinamicamente (Client-side aggregation para simplificar queries)
  // Nota: Em produção, views SQL seriam mais performáticas.

  const coursesWithStats = await Promise.all(filteredCourses.map(async (course: any) => {
    // Conta módulos
    const { count: modulesCount } = await supabase
      .from('modules')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', course.id);

    // Busca todas as lições deste curso (via modules)
    const { data: modules } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', course.id);

    const moduleIds = modules?.map(m => m.id) || [];

    if (moduleIds.length === 0) {
      return { ...course, modules_count: 0, total_lessons: 0, completed_lessons: 0, progress_percentage: 0 };
    }

    const { count: totalLessons } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .in('module_id', moduleIds);

    // Busca progresso do usuário para estas lições
    // Primeiro pegamos os IDs das lições
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds);

    const lessonIds = lessons?.map(l => l.id) || [];

    let completedLessons = 0;
    if (lessonIds.length > 0) {
      const { count } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('lesson_id', lessonIds);
      completedLessons = count || 0;
    }

    const safeTotal = totalLessons || 0;
    const percentage = safeTotal > 0 ? Math.round((completedLessons / safeTotal) * 100) : 0;

    return {
      ...course,
      modules_count: modulesCount || 0,
      total_lessons: safeTotal,
      completed_lessons: completedLessons,
      progress_percentage: percentage,
      blocked_emails: course.blocked_emails || null
    };
  }));

  return coursesWithStats;
};

/**
 * Cria ou Atualiza um Curso
 */
export const upsertCourse = async (course: Partial<Course>) => {
  if (!supabase) {
    console.log("Supabase Service: Modo Mock - Curso salvo simulado.", course);
    return;
  }

  // 1. Prepara Payload Base
  const payload: any = { ...course };

  // 2. Remove ID se for vazio para forçar Auto-Incremento/UUID
  if (!payload.id || payload.id === '') {
    delete payload.id;
  }

  // Remove campos calculados antes de salvar
  delete payload.modules_count;
  delete payload.total_lessons;
  delete payload.completed_lessons;
  delete payload.progress_percentage;
  
  // Garante que blocked_emails seja um array ou null
  if (payload.blocked_emails && Array.isArray(payload.blocked_emails)) {
    // Remove emails vazios e duplicatas
    payload.blocked_emails = [...new Set(payload.blocked_emails.filter((email: string) => email && email.trim()))];
    // Se ficar vazio, define como null
    if (payload.blocked_emails.length === 0) {
      payload.blocked_emails = null;
    }
  } else if (!payload.blocked_emails) {
    payload.blocked_emails = null;
  }

  // 3. Tenta adicionar updated_at
  const payloadWithDate = {
    ...payload,
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('courses')
      .upsert(payloadWithDate)
      .select()
      .single();

    if (error) throw error;

    // Verifica se é uma atualização (tem ID) ou criação nova
    const isUpdate = payload.id || payloadWithDate.id;
    if (isUpdate && data) {
      // Notifica todos os usuários sobre atualização do curso
      await notifyAllUsers(
        'course_update',
        'Curso Atualizado',
        `O curso "${data.title || course.title || 'Curso'}" recebeu atualizações recentes.`,
        '/app/courses'
      );
    }

    return data;

  } catch (error: any) {
    // Fallback
    const { data, error: retryError } = await supabase
      .from('courses')
      .upsert(payload)
      .select()
      .single();

    if (retryError) {
      console.error("Supabase Service: Erro fatal ao salvar curso:", retryError);
      throw retryError;
    }

    // Notifica também no fallback se for atualização
    const isUpdate = payload.id;
    if (isUpdate && data) {
      await notifyAllUsers(
        'course_update',
        'Curso Atualizado',
        `O curso "${data.title || course.title || 'Curso'}" recebeu atualizações recentes.`,
        '/app/courses'
      );
    }

    return data;
  }
};

/**
 * Deleta um curso e sua imagem de capa (se houver).
 */
export const deleteCourse = async (courseId: string) => {
  if (!supabase) return;

  try {
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('thumbnail_url')
      .eq('id', courseId)
      .single();

    if (course?.thumbnail_url) {
      try {
        const urlParts = course.thumbnail_url.split('/course-thumbnails/');
        if (urlParts.length > 1) {
          const fileName = urlParts[1];
          await supabase.storage.from('course-thumbnails').remove([fileName]);
        }
      } catch (storageError) {
        console.error("Erro ao excluir imagem do storage:", storageError);
      }
    }

    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (error) throw error;
  } catch (error) {
    console.error("Erro fatal em deleteCourse:", error);
    throw error;
  }
};

/**
 * Busca o conteúdo do curso (Módulos e Aulas)
 */
export const getCourseContent = async (courseId: string): Promise<Module[]> => {
  if (!supabase) {
    // Mock Data para demonstração
    const mockModules: Module[] = [
      {
        id: 'm1', course_id: courseId, title: 'Módulo 01: Fundamentos', order: 1, lessons: [
          { id: 'l1', module_id: 'm1', title: 'Boas vindas e Mindset', video_id: 'M7lc1UVf-VE', duration: 15, order: 1, description: 'Seja bem-vindo ao curso. Vamos alinhar as expectativas e preparar sua mente para o sucesso.' },
          { id: 'l2', module_id: 'm1', title: 'Configurando sua conta', video_id: 'SqcY0GlETPk', duration: 20, order: 2, description: 'Passo a passo para iniciar suas configurações.' },
        ]
      },
      {
        id: 'm2', course_id: courseId, title: 'Módulo 02: Estratégia', order: 2, lessons: [
          { id: 'l3', module_id: 'm2', title: 'Definindo seu Nicho', video_id: 'C_q5PMeWkLI', duration: 30, order: 1, description: 'Como escolher o nicho mais lucrativo para você.' },
          { id: 'l4', module_id: 'm2', title: 'Análise de Concorrência', video_id: 'jfKfPfyJRdk', duration: 25, order: 2, description: 'Espionando o mercado para sair na frente.' },
          { id: 'l5', module_id: 'm2', title: 'Funil de Vendas', video_id: '0p7lT-6L25c', duration: 40, order: 3, description: 'A estrutura secreta dos grandes players.' },
        ]
      }
    ];
    await new Promise(r => setTimeout(r, 800));
    return mockModules;
  }

  // 1. Buscar módulos
  const { data: modulesData, error: modulesError } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order', { ascending: true });

  if (modulesError || !modulesData) return [];

  const modules: Module[] = [];

  // 2. Buscar aulas para cada módulo
  for (const m of modulesData) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', m.id)
      .order('order', { ascending: true });

    modules.push({
      ...m,
      lessons: lessonsData || []
    });
  }

  return modules;
};

// --- PROGRESSO DO ALUNO ---

/**
 * Retorna os IDs das aulas concluídas pelo usuário para um curso específico (ou geral)
 */
export const getCompletedLessons = async (userId: string, courseId?: string): Promise<string[]> => {
  if (!supabase) return [];

  // Se tiver courseId, precisamos filtrar as lessons que pertencem ao curso
  let query = supabase.from('user_progress').select('lesson_id, completed_at').eq('user_id', userId);

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao buscar progresso:", error);
    return [];
  }

  return data.map(row => row.lesson_id);
};

/**
 * Retorna estatísticas de progresso do usuário (aulas assistidas e horas estudadas)
 */
export const getUserStats = async (userId: string): Promise<{ lessonsWatched: number; hoursStudied: number }> => {
  if (!supabase) {
    return { lessonsWatched: 0, hoursStudied: 0 };
  }

  try {
    // Busca todos os registros de progresso do usuário
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', userId);

    if (progressError) {
      console.error("Erro ao buscar estatísticas do usuário:", progressError);
      return { lessonsWatched: 0, hoursStudied: 0 };
    }

    // Aulas Assistidas: contagem total
    const lessonsWatched = progressData?.length || 0;

    // Horas Estudadas: busca as durações das aulas assistidas
    let totalMinutes = 0;
    if (progressData && progressData.length > 0) {
      const lessonIds = progressData.map((item: any) => item.lesson_id);
      
      // Busca as durações das aulas
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('duration')
        .in('id', lessonIds);

      if (!lessonsError && lessonsData) {
        lessonsData.forEach((lesson: any) => {
          // Usa duration ou 0 se não houver
          const duration = lesson.duration || 0;
          totalMinutes += duration;
        });
      }
    }

    // Converte minutos para horas (com 1 casa decimal)
    const hoursStudied = totalMinutes / 60;

    return {
      lessonsWatched,
      hoursStudied: Math.round(hoursStudied * 10) / 10 // Arredonda para 1 casa decimal
    };
  } catch (error) {
    console.error("Erro ao calcular estatísticas do usuário:", error);
    return { lessonsWatched: 0, hoursStudied: 0 };
  }
};

/**
 * Alterna o status de conclusão de uma aula (Concluir/Desmarcar)
 */
export const toggleLessonProgress = async (userId: string, lessonId: string): Promise<boolean> => {
  if (!supabase) return true; // Mock: retorna sempre como concluído

  try {
    // Verifica se já existe
    const { data: existing } = await supabase
      .from('user_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (existing) {
      // Se existe, deleta (desmarcar)
      const { error: delError } = await supabase
        .from('user_progress')
        .delete()
        .eq('id', existing.id);

      if (delError) throw delError;
      return false; // Agora está não-concluído
    } else {
      // Se não existe, cria (concluir)
      // IMPORTANTE: Inclui completed_at para evitar erro de coluna nula e satisfazer trigger se houver
      const { error: insError } = await supabase
        .from('user_progress')
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          completed_at: new Date().toISOString()
        });

      if (insError) throw insError;
      return true; // Agora está concluído
    }
  } catch (err: any) {
    console.error("Erro ao alternar progresso:", err);
    throw err;
  }
};


// CRUD Module
export const upsertModule = async (module: Partial<Module>) => {
  if (!supabase) return;

  const { lessons, ...moduleData } = module as any;
  if (!moduleData.id || moduleData.id === '') delete moduleData.id;
  if (!moduleData.course_id) throw new Error("course_id missing");

  const payloadWithDate = { ...moduleData, updated_at: new Date().toISOString() };

  try {
    const { error } = await supabase.from('modules').upsert(payloadWithDate);
    if (error) throw error;

    // Busca o nome do curso para contextualizar a notificação
    let courseTitle = 'Curso';
    let courseId = moduleData.course_id;
    if (courseId) {
      try {
        const { data: courseData } = await supabase
          .from('courses')
          .select('title, id')
          .eq('id', courseId)
          .single();
        if (courseData) {
          courseTitle = courseData.title;
          courseId = courseData.id;
        }
      } catch (e) {
        console.error("Erro ao buscar curso para notificação:", e);
      }
    }

    // Notifica todos os usuários sobre novo/atualizado módulo
    const moduleTitle = moduleData.title || 'Módulo';
    const isNew = !moduleData.id;
    await notifyAllUsers(
      'course_update',
      'Novo Conteúdo no Curso',
      `O módulo "${moduleTitle}" foi ${isNew ? 'adicionado' : 'atualizado'} no curso "${courseTitle}".`,
      courseId ? `/app/course/${courseId}` : '/app/courses'
    );
  } catch (err: any) {
    const { error } = await supabase.from('modules').upsert(moduleData);
    if (error) throw error;

    // Notifica também no fallback
    const moduleTitle = moduleData.title || 'Módulo';
    await notifyAllUsers(
      'course_update',
      'Novo Conteúdo no Curso',
      `O módulo "${moduleTitle}" foi adicionado ou atualizado.`,
      moduleData.course_id ? `/app/course/${moduleData.course_id}` : '/app/courses'
    );
  }
};

export const updateModule = async (moduleId: string, title: string) => {
  if (!supabase) return;
  
  // Busca o módulo para pegar course_id antes de atualizar
  const { data: moduleData } = await supabase
    .from('modules')
    .select('course_id')
    .eq('id', moduleId)
    .single();

  const { error } = await supabase
    .from('modules')
    .update({ 
      title,
      updated_at: new Date().toISOString()
    })
    .eq('id', moduleId);
  
  if (error) throw error;

  // Busca o nome do curso para contextualizar
  let courseTitle = 'Curso';
  let courseId = moduleData?.course_id;
  if (courseId) {
    try {
      const { data: courseData } = await supabase
        .from('courses')
        .select('title, id')
        .eq('id', courseId)
        .single();
      if (courseData) {
        courseTitle = courseData.title;
        courseId = courseData.id;
      }
    } catch (e) {
      console.error("Erro ao buscar curso para notificação:", e);
    }
  }

  // Notifica todos os usuários sobre atualização do módulo
  await notifyAllUsers(
    'course_update',
    'Novo Conteúdo no Curso',
    `O módulo "${title}" foi atualizado no curso "${courseTitle}".`,
    courseId ? `/app/course/${courseId}` : '/app/courses'
  );
};

export const deleteModule = async (moduleId: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('modules').delete().eq('id', moduleId);
  if (error) throw error;
};

// CRUD Lesson
export const upsertLesson = async (lesson: Partial<Lesson>) => {
  if (!supabase) return;

  const payload: any = { ...lesson };
  if (!payload.id || payload.id === '') delete payload.id;
  if (!payload.module_id) throw new Error("module_id missing");

  const payloadWithDate = { ...payload, updated_at: new Date().toISOString() };

  try {
    const { error } = await supabase.from('lessons').upsert(payloadWithDate);
    if (error) throw error;

    // Busca informações do módulo e curso para construir o link
    let courseId: string | undefined;
    let lessonId: string | undefined;
    let lessonTitle = payload.title || 'Aula';
    const isNew = !payload.id;

    if (payload.module_id) {
      try {
        const { data: moduleData } = await supabase
          .from('modules')
          .select('course_id')
          .eq('id', payload.module_id)
          .single();
        
        if (moduleData) {
          courseId = moduleData.course_id;
        }
      } catch (e) {
        console.error("Erro ao buscar módulo para notificação:", e);
      }
    }

    // Pega o ID da aula criada/atualizada
    if (payload.id) {
      lessonId = payload.id;
    } else {
      // Se foi inserção nova, busca o ID criado
      const { data: newLesson } = await supabase
        .from('lessons')
        .select('id')
        .eq('module_id', payload.module_id)
        .eq('title', payload.title)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (newLesson) {
        lessonId = newLesson.id;
      }
    }

    // Notifica todos os usuários sobre nova/atualizada aula
    const link = courseId && lessonId 
      ? `/app/course/${courseId}/lesson/${lessonId}`
      : courseId 
        ? `/app/course/${courseId}`
        : '/app/courses';

    await notifyAllUsers(
      'course_update',
      'Nova Aula Disponível',
      `A aula "${lessonTitle}" foi ${isNew ? 'adicionada' : 'atualizada'}. Confira!`,
      link
    );
  } catch (err: any) {
    const { error } = await supabase.from('lessons').upsert(payload);
    if (error) throw error;

    // Notifica também no fallback
    const lessonTitle = payload.title || 'Aula';
    await notifyAllUsers(
      'course_update',
      'Nova Aula Disponível',
      `A aula "${lessonTitle}" foi atualizada/adicionada. Confira!`,
      payload.module_id ? `/app/course/${payload.module_id}` : '/app/courses'
    );
  }
};

export const updateLesson = async (lessonId: string, updates: Partial<Lesson>) => {
  if (!supabase) return;
  
  const payload: any = { ...updates };
  delete payload.id; // Remove id do payload de atualização
  delete payload.module_id; // Não atualiza module_id
  delete payload.duration_mins; // Remove duration_mins se existir (usar apenas duration)
  
  const payloadWithDate = { 
    ...payload, 
    updated_at: new Date().toISOString() 
  };
  
  // Busca a aula antes de atualizar para pegar module_id e title
  const { data: lessonData } = await supabase
    .from('lessons')
    .select('module_id, title')
    .eq('id', lessonId)
    .single();

  const { error } = await supabase
    .from('lessons')
    .update(payloadWithDate)
    .eq('id', lessonId);
  
  if (error) throw error;

  // Busca informações do módulo e curso para construir o link
  let courseId: string | undefined;
  const lessonTitle = updates.title || lessonData?.title || 'Aula';

  if (lessonData?.module_id) {
    try {
      const { data: moduleData } = await supabase
        .from('modules')
        .select('course_id')
        .eq('id', lessonData.module_id)
        .single();
      
      if (moduleData) {
        courseId = moduleData.course_id;
      }
    } catch (e) {
      console.error("Erro ao buscar módulo para notificação:", e);
    }
  }

  // Notifica todos os usuários sobre atualização da aula
  const link = courseId && lessonId 
    ? `/app/course/${courseId}/lesson/${lessonId}`
    : courseId 
      ? `/app/course/${courseId}`
      : '/app/courses';

  await notifyAllUsers(
    'course_update',
    'Nova Aula Disponível',
    `A aula "${lessonTitle}" foi atualizada. Confira!`,
    link
  );
};

export const deleteLesson = async (lessonId: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
  if (error) throw error;
};

// --- COMMUNITY FEED FEATURES ---

type FeedFilter = 'recent' | 'popular' | 'liked' | 'saved' | 'for_you';

/**
 * Extrai menções (@username) de um texto e retorna um array único de usernames (sem o @).
 */
export const extractMentions = (content: string): string[] => {
  if (!content) return [];
  
  // Regex para encontrar @username (permite letras, números, pontos e underscores)
  // Exclui @ no final da string ou seguido de espaço/pontuação sem username
  const mentionRegex = /@([a-zA-Z0-9._]+)/g;
  const matches = content.match(mentionRegex);
  
  if (!matches) return [];
  
  // Remove o @ e retorna apenas os usernames únicos
  const usernames = matches.map(match => match.substring(1)); // Remove o @
  return [...new Set(usernames)]; // Remove duplicatas
};

export const getPosts = async (currentUserId?: string, filter: FeedFilter = 'recent', currentUsername?: string): Promise<Post[]> => {
  if (!supabase) return [];

  let postIdsToFilter: string[] | null = null;

  // Para filtros liked e saved, primeiro busca os IDs dos posts
  if (filter === 'liked' && currentUserId) {
    const { data: likedPosts } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', currentUserId);
    
    if (likedPosts && likedPosts.length > 0) {
      postIdsToFilter = likedPosts.map((lp: any) => lp.post_id);
    } else {
      // Se não há posts curtidos, retorna array vazio
      return [];
    }
  } else if (filter === 'saved' && currentUserId) {
    const { data: savedPosts } = await supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', currentUserId);
    
    if (savedPosts && savedPosts.length > 0) {
      postIdsToFilter = savedPosts.map((sp: any) => sp.post_id);
    } else {
      // Se não há posts salvos, retorna array vazio
      return [];
    }
  } else if (filter === 'for_you' && currentUsername) {
    // Filtro "Para Você": posts onde o usuário foi mencionado
    // Busca posts onde a coluna mentions contém o username atual
    // No Supabase, para arrays, usamos .contains() com o valor como array
    const { data: mentionedPosts, error: mentionsError } = await supabase
      .from('posts')
      .select('id')
      .contains('mentions', [currentUsername]);
    
    if (mentionsError) {
      console.error("Erro ao buscar posts mencionados:", mentionsError);
      return [];
    }
    
    if (mentionedPosts && mentionedPosts.length > 0) {
      postIdsToFilter = mentionedPosts.map((mp: any) => mp.id);
    } else {
      // Se não há posts com menções, retorna array vazio
      return [];
    }
  }

  // Constrói a query base
  let query = supabase
    .from('posts')
    .select('*, profiles(*)');

  // Aplica filtro de IDs primeiro (para filtros liked, saved, for_you)
  // Isso garante que a moderação seja aplicada apenas aos posts já filtrados
  if (postIdsToFilter && postIdsToFilter.length > 0) {
    query = query.in('id', postIdsToFilter);
  }

  // Filtro de Moderação: Mostra posts aprovados OU posts pendentes do próprio usuário
  // Aplica após os filtros de IDs para garantir que funcione corretamente
  if (currentUserId) {
    // Usa .or() para combinar condições: (status = 'approved') OU (status = 'pending' AND user_id = currentUserId)
    // Sintaxe do Supabase PostgREST: "condição1,and(condição2,condição3)"
    // Alternativa: fazer duas queries e juntar, mas .or() é mais eficiente
    try {
      query = query.or(`status.eq.approved,and(status.eq.pending,user_id.eq.${currentUserId})`);
    } catch (orError) {
      // Fallback: se .or() falhar, busca todos e filtra no client-side
      console.warn("Erro ao usar .or(), usando fallback client-side:", orError);
    }
  } else {
    // Se não há usuário logado, mostra apenas posts aprovados
    query = query.eq('status', 'approved');
  }

  // Ordenação padrão (será ajustada para popular depois)
  if (filter !== 'popular') {
    query = query.order('created_at', { ascending: false });
  } else {
    // Para popular, ordena por created_at primeiro e depois ordenaremos por likes no client-side
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar posts:", error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Filtro adicional no client-side para garantir compatibilidade com dados antigos (sem status)
  // Se status for null/undefined, trata como 'approved' (compatibilidade)
  let filteredData = data;
  if (currentUserId) {
    filteredData = data.filter((post: any) => {
      const status = post.status;
      // Se não tem status (dados antigos), trata como aprovado
      if (!status || status === null) return true;
      // Se é aprovado, sempre mostra
      if (status === 'approved') return true;
      // Se é pendente, só mostra se for do próprio usuário
      if (status === 'pending') return post.user_id === currentUserId;
      // Rejeitados não aparecem
      return false;
    });
  } else {
    // Usuário não logado: só mostra aprovados ou sem status (compatibilidade)
    filteredData = data.filter((post: any) => {
      const status = post.status;
      return !status || status === null || status === 'approved';
    });
  }

  // Busca todos os dados relacionados de uma vez (otimização)
  const postIds = filteredData.map((p: any) => p.id);

  // Busca likes com perfis dos usuários que curtiram
  // Primeiro busca os likes, depois busca os perfis separadamente para evitar problemas de foreign key
  const { data: likesData } = await supabase
    .from('post_likes')
    .select('post_id, user_id')
    .in('post_id', postIds);

  // Busca perfis dos usuários que curtiram
  const userIdsFromLikes = [...new Set((likesData || []).map((l: any) => l.user_id))];
  const likesWithProfiles: any[] = [];

  if (userIdsFromLikes.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', userIdsFromLikes);

    const profilesMap: Record<string, any> = {};
    (profilesData || []).forEach((p: any) => {
      profilesMap[p.id] = p;
    });

    // Combina likes com perfis
    (likesData || []).forEach((like: any) => {
      likesWithProfiles.push({
        ...like,
        profiles: profilesMap[like.user_id] || null
      });
    });
  }

  // Busca saved_posts
  const { data: savedData } = await supabase
    .from('saved_posts')
    .select('post_id, user_id')
    .in('post_id', postIds);

  // Busca contagem de comentários
  const { data: commentsData } = await supabase
    .from('comments')
    .select('post_id')
    .in('post_id', postIds);

  // Agrupa dados por post_id para acesso rápido
  const likesByPost: Record<string, any[]> = {};
  const savedByPost: Record<string, boolean> = {};
  const commentsCountByPost: Record<string, number> = {};

  likesWithProfiles.forEach((like: any) => {
    if (!likesByPost[like.post_id]) {
      likesByPost[like.post_id] = [];
    }
    likesByPost[like.post_id].push(like);
  });

  (savedData || []).forEach((saved: any) => {
    if (currentUserId && saved.user_id === currentUserId) {
      savedByPost[saved.post_id] = true;
    }
  });

  (commentsData || []).forEach((comment: any) => {
    commentsCountByPost[comment.post_id] = (commentsCountByPost[comment.post_id] || 0) + 1;
  });

  // Mapeamento seguro com robustez para null/undefined
  let posts: Post[] = filteredData.map((post: any) => {
    // 1. Normalize Author Profile
    const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;

    // 2. Process Post Likes
    const postLikes = likesByPost[post.id] || [];
    const userHasLiked = currentUserId 
      ? postLikes.some((l: any) => l.user_id === currentUserId) 
      : false;

    // 3. Process Like Avatars (Overlapping Stack) - pega os 3 mais recentes
    const recentLikedAvatars = postLikes
      .map((l: any) => {
        const profile = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
        return profile?.avatar_url;
      })
      .filter((url: string | null | undefined) => !!url)
      .slice(0, 3);

    // 4. Process Saved Posts
    const isSaved = savedByPost[post.id] || false;

    // 5. Process Comments Count
    const commentsCount = commentsCountByPost[post.id] || 0;

    return {
      id: post.id,
      user_id: post.user_id,
      content: post.content || '',
      created_at: post.created_at,
      likes_count: postLikes.length,
      comments_count: commentsCount,
      user_has_liked: userHasLiked,
      profile: author || { username: 'Usuário Desconhecido' },
      is_saved: isSaved,
    recent_liked_avatars: recentLikedAvatars,
      image_urls: post.image_urls || [],
      file_urls: post.file_urls || [],
      mentions: post.mentions || [],
      status: post.status || 'approved' // Default para 'approved' se não houver (compatibilidade com dados antigos)
    };
  });

  // Ordenação por popularidade (client-side para MVP)
  if (filter === 'popular') {
    posts = posts.sort((a, b) => {
      // Ordena por likes_count (decrescente), depois por comments_count, depois por data
      if (b.likes_count !== a.likes_count) {
        return b.likes_count - a.likes_count;
      }
      if (b.comments_count !== a.comments_count) {
        return b.comments_count - a.comments_count;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  return posts;
};

/**
 * Faz upload de múltiplas imagens para o bucket 'post-images'.
 * Retorna um array com as URLs públicas das imagens.
 */
export const uploadPostImages = async (files: File[]): Promise<string[]> => {
  if (!supabase) {
    // Modo demo: retorna URLs temporárias
    return files.map(file => URL.createObjectURL(file));
  }

  const uploadedUrls: string[] = [];

  try {
    for (const file of files) {
      // Gera nome único para cada arquivo
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `post_${timestamp}_${random}.${fileExtension}`;

      // Faz upload para o bucket 'post-images'
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Erro ao fazer upload da imagem:", uploadError);
        throw new Error(`Falha ao fazer upload de ${file.name}: ${uploadError.message}`);
      }

      // Obtém URL pública
      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  } catch (error) {
    console.error("Erro no upload de imagens:", error);
    throw error;
  }
};

/**
 * Faz upload de múltiplos arquivos (PDF, DOCX, TXT, HTML) para o bucket 'post-images'.
 * Retorna um array com as URLs públicas dos arquivos.
 */
export const uploadPostFiles = async (files: File[]): Promise<string[]> => {
  if (!supabase) {
    // Modo demo: retorna URLs temporárias
    return files.map(file => URL.createObjectURL(file));
  }

  const uploadedUrls: string[] = [];

  try {
    for (const file of files) {
      // Gera nome único para cada arquivo
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop() || 'txt';
      const fileName = `file_${timestamp}_${random}.${fileExtension}`;

      // Faz upload para o bucket 'post-images' (mesmo bucket, mas com prefixo diferente)
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Erro ao fazer upload do arquivo:", uploadError);
        throw new Error(`Falha ao fazer upload de ${file.name}: ${uploadError.message}`);
      }

      // Obtém URL pública
      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  } catch (error) {
    console.error("Erro no upload de arquivos:", error);
    throw error;
  }
};

export const createPost = async (userId: string, content: string, images?: File[], files?: File[], userRole?: 'user' | 'admin'): Promise<Post | null> => {
  if (!supabase) return null;

  // Busca a role do usuário se não foi fornecida
  let userRoleValue = userRole;
  if (!userRoleValue) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    userRoleValue = profile?.role || 'user';
  }

  // Define o status inicial: Admin = aprovado imediatamente, outros = pendente
  const initialStatus = userRoleValue === 'admin' ? 'approved' : 'pending';

  let imageUrls: string[] = [];
  let fileUrls: string[] = [];

  // Se houver imagens, faz upload primeiro
  if (images && images.length > 0) {
    try {
      imageUrls = await uploadPostImages(images);
    } catch (error) {
      console.error("Erro ao fazer upload das imagens:", error);
      throw new Error("Falha ao fazer upload das imagens. Tente novamente.");
    }
  }

  // Se houver arquivos, faz upload
  if (files && files.length > 0) {
    try {
      fileUrls = await uploadPostFiles(files);
    } catch (error) {
      console.error("Erro ao fazer upload dos arquivos:", error);
      throw new Error("Falha ao fazer upload dos arquivos. Tente novamente.");
    }
  }

  // Extrai menções do conteúdo
  const mentions = extractMentions(content);

  // Prepara o payload do post
  const postPayload: any = {
    user_id: userId,
    content,
    status: initialStatus // Admin = 'approved', outros = 'pending'
  };

  // Adiciona image_urls apenas se houver imagens
  if (imageUrls.length > 0) {
    postPayload.image_urls = imageUrls;
  }

  // Adiciona file_urls apenas se houver arquivos
  if (fileUrls.length > 0) {
    postPayload.file_urls = fileUrls;
  }

  // Adiciona mentions apenas se houver menções
  if (mentions.length > 0) {
    postPayload.mentions = mentions;
  }

  const { data, error } = await supabase
    .from('posts')
    .insert(postPayload)
    .select('*, profiles:user_id(id, username, avatar_url, role, full_name)')
    .single();

  if (error) {
    console.error("Erro ao criar post:", error);
    throw error;
  }

  // Normaliza o profile
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

  // ETAPA 2: Notifica todos os usuários quando admin posta (status approved)
  if (data.status === 'approved') {
    try {
      const userProfile = profile || await getProfile(userId, false);
      const contentSnippet = data.content.length > 50 ? data.content.substring(0, 50) + '...' : data.content;
      
      await notifyAllUsers(
        'new_post',
        `${userProfile?.full_name || userProfile?.username || 'Alguém'} publicou na comunidade`,
        contentSnippet,
        '/app/community',
        userId, // actionByUserId: quem está postando
        userId  // excludeUserId: para não notificar a si mesmo
      );
    } catch (error) {
      console.error("Erro ao criar notificações de novo post:", error);
      // Não falha o post se a notificação falhar
    }
  }

  // Cria notificações para menções
  if (mentions.length > 0) {
    try {
      // Busca os IDs dos usuários mencionados pelos usernames
      const { data: mentionedUsers } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', mentions);

      if (mentionedUsers && mentionedUsers.length > 0) {
        const authorUsername = profile?.username || 'Alguém';
        const postLink = `/app/community#post-${data.id}`;

        // Cria notificação de menção para cada usuário mencionado
        const mentionNotifications = mentionedUsers
          .filter((user: any) => user.id !== userId) // Não notifica o próprio autor
          .map((user: any) => ({
            user_id: user.id,
            type: 'mention' as const,
            title: `${authorUsername} mencionou você`,
            content: content.length > 100 ? content.substring(0, 100) + '...' : content,
            link: postLink,
            is_read: false,
            action_by: userId // ID do autor do post que mencionou
          }));

        if (mentionNotifications.length > 0) {
          await supabase.from('notifications').insert(mentionNotifications);
        }
      }
    } catch (error) {
      console.error("Erro ao criar notificações de menção:", error);
      // Não falha o post se a notificação falhar
    }
  }

  return {
    ...data,
    likes_count: 0,
    comments_count: 0,
    user_has_liked: false,
    profile: profile || null,
    is_saved: false,
    recent_liked_avatars: [],
    image_urls: data.image_urls || [],
    file_urls: data.file_urls || [],
    mentions: data.mentions || [],
    status: data.status || initialStatus
  };
};

export const togglePostLike = async (userId: string, postId: string): Promise<boolean> => {
  if (!supabase) return true;

  // Checa se já deu like
  const { data: existing } = await supabase
    .from('post_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) {
    await supabase.from('post_likes').delete().eq('id', existing.id);
    return false; // Removed like
  } else {
    await supabase.from('post_likes').insert({ user_id: userId, post_id: postId });
    return true; // Added like
  }
};

export const toggleSavePost = async (userId: string, postId: string): Promise<boolean> => {
  if (!supabase) return true;

  const { data: existing } = await supabase
    .from('saved_posts')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) {
    await supabase.from('saved_posts').delete().eq('id', existing.id);
    return false; // Unsaved
  } else {
    await supabase.from('saved_posts').insert({ user_id: userId, post_id: postId });
    return true; // Saved
  }
};

export const addComment = async (userId: string, postId: string, content: string, userRole?: 'user' | 'admin'): Promise<Comment | null> => {
  if (!supabase) return null;

  try {
    // Busca a role do usuário se não foi fornecida
    let userRoleValue = userRole;
    if (!userRoleValue) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      userRoleValue = profile?.role || 'user';
    }

    // Define o status inicial: Admin = aprovado imediatamente, outros = pendente
    const initialStatus = userRoleValue === 'admin' ? 'approved' : 'pending';

    // Insere o comentário com status
    const { data: commentData, error: insertError } = await supabase
      .from('comments')
      .insert({ user_id: userId, post_id: postId, content, status: initialStatus })
      .select('*')
      .single();

    if (insertError) {
      console.error("Erro ao criar comentário:", insertError);
      throw insertError;
    }

    // Depois busca o perfil separadamente para garantir compatibilidade
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, email, username, avatar_url, role, full_name')
      .eq('id', userId)
      .single();

    // Cria notificação de reply para o dono do post (se diferente do autor do comentário)
    try {
      const { data: postData } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (postData && postData.user_id !== userId) {
        const commentAuthorUsername = profileData?.username || 'Alguém';
        const commentPreview = content.length > 100 ? content.substring(0, 100) + '...' : content;
        const commentLink = `/app/community#post-${postId}`;

        await createNotification(
          postData.user_id,
          'reply',
          `${commentAuthorUsername} respondeu seu post`,
          commentPreview,
          commentLink,
          userId // action_by: ID de quem comentou
        );
      }
    } catch (error) {
      console.error("Erro ao criar notificação de reply:", error);
      // Não falha o comentário se a notificação falhar
    }

    return {
      id: commentData.id,
      post_id: commentData.post_id,
      user_id: commentData.user_id,
      content: commentData.content,
      created_at: commentData.created_at,
      profile: profileData || null,
      status: commentData.status || initialStatus
    };
  } catch (err: any) {
    console.error("Erro ao adicionar comentário:", err);
    throw err;
  }
};

export const getComments = async (postId: string, currentUserId?: string): Promise<Comment[]> => {
  if (!supabase) return [];

  try {
    // Constrói a query base
    let query = supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId);

    // Filtro de Moderação: Mostra comentários aprovados OU comentários pendentes do próprio usuário
    if (currentUserId) {
      // Usa .or() para combinar condições: (status = 'approved') OU (status = 'pending' AND user_id = currentUserId)
      try {
        query = query.or(`status.eq.approved,and(status.eq.pending,user_id.eq.${currentUserId})`);
      } catch (orError) {
        // Fallback: se .or() falhar, busca todos e filtra no client-side
        console.warn("Erro ao usar .or() em getComments, usando fallback client-side:", orError);
      }
    } else {
      // Se não há usuário logado, mostra apenas comentários aprovados
      query = query.eq('status', 'approved');
    }

    const { data: commentsData, error: commentsError } = await query.order('created_at', { ascending: true });

    if (commentsError) {
      console.error("Erro ao buscar comentários:", commentsError);
      return [];
    }

    if (!commentsData || commentsData.length === 0) {
      return [];
    }

    // Filtro adicional no client-side para garantir compatibilidade com dados antigos (sem status)
    let filteredComments = commentsData;
    if (currentUserId) {
      filteredComments = commentsData.filter((c: any) => {
        const status = c.status;
        // Se não tem status (dados antigos), trata como aprovado
        if (!status || status === null) return true;
        // Se é aprovado, sempre mostra
        if (status === 'approved') return true;
        // Se é pendente, mostra apenas se for do próprio usuário
        if (status === 'pending') return c.user_id === currentUserId;
        // Rejeitados não aparecem
        return false;
      });
    } else {
      // Usuário não logado: só mostra aprovados ou sem status (compatibilidade)
      filteredComments = commentsData.filter((c: any) => {
        const status = c.status;
        return !status || status === null || status === 'approved';
      });
    }

    // Busca perfis dos usuários que comentaram (otimização: busca todos de uma vez)
    const userIds = [...new Set(filteredComments.map((c: any) => c.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email, username, avatar_url, role, full_name')
      .in('id', userIds);

    // Cria mapa de perfis para acesso rápido
    const profilesMap: Record<string, any> = {};
    (profilesData || []).forEach((p: any) => {
      profilesMap[p.id] = p;
    });

    // Mapeia comentários com seus perfis
    return filteredComments.map((c: any) => ({
      id: c.id,
      post_id: c.post_id,
      user_id: c.user_id,
      content: c.content,
      created_at: c.created_at,
      profile: profilesMap[c.user_id] || null,
      status: c.status || 'approved' // Default para 'approved' se não houver (compatibilidade com dados antigos)
    }));
  } catch (err: any) {
    console.error("Erro ao buscar comentários:", err);
    return [];
  }
};

/**
 * Busca posts pendentes de moderação (apenas para Admin)
 */
export const getPendingPosts = async (): Promise<Post[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao buscar posts pendentes:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Mapeia os posts com estrutura similar ao getPosts
    return data.map((post: any) => {
      const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
      
      return {
        id: post.id,
        user_id: post.user_id,
        content: post.content || '',
        created_at: post.created_at,
        likes_count: 0, // Será calculado se necessário
        comments_count: 0, // Será calculado se necessário
        user_has_liked: false,
        profile: author || null,
        is_saved: false,
        recent_liked_avatars: [],
        image_urls: post.image_urls || [],
        file_urls: post.file_urls || [],
        mentions: post.mentions || [],
        status: post.status || 'pending'
      };
    });
  } catch (err: any) {
    console.error("Erro ao buscar posts pendentes:", err);
    return [];
  }
};

/**
 * Modera um post (aprova ou rejeita)
 */
export const moderatePost = async (postId: string, newStatus: 'approved' | 'rejected'): Promise<boolean> => {
  if (!supabase) {
    console.error("Supabase não configurado. Não é possível moderar post.");
    throw new Error("Supabase não configurado");
  }

  try {
    // ETAPA 3: Busca dados do post original antes de atualizar (para notificação quando aprovado)
    let postData: any = null;
    if (newStatus === 'approved') {
      // Busca o post com o perfil do autor
      const { data: postDataBeforeUpdate, error: fetchError } = await supabase
        .from('posts')
        .select('content, user_id, profiles:user_id(full_name, username)')
        .eq('id', postId)
        .single();

      if (!fetchError && postDataBeforeUpdate) {
        postData = postDataBeforeUpdate;
      } else if (fetchError) {
        console.error("Erro ao buscar dados do post para notificação:", fetchError);
      }
    }

    const { data, error } = await supabase
      .from('posts')
      .update({ status: newStatus })
      .eq('id', postId)
      .select();

    if (error) {
      console.error("Erro ao moderar post no Supabase:", error);
      console.error("Detalhes do erro:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    // Verifica se o post foi realmente atualizado
    if (!data || data.length === 0) {
      console.warn("Post não encontrado ou não foi atualizado:", postId);
      throw new Error("Post não encontrado ou não foi possível atualizar");
    }

    // ETAPA 3: Notifica todos os usuários quando admin aprova post de aluno
    if (newStatus === 'approved' && postData) {
      try {
        const authorProfile = Array.isArray(postData.profiles) ? postData.profiles[0] : postData.profiles;
        const contentSnippet = postData.content.length > 50 ? postData.content.substring(0, 50) + '...' : postData.content;
        
        await notifyAllUsers(
          'new_post',
          `${authorProfile?.full_name || authorProfile?.username || 'Alguém'} publicou na comunidade`,
          contentSnippet,
          '/app/community',
          postData.user_id, // actionByUserId: ID do aluno autor do post, NÃO o ID do admin
          postData.user_id  // excludeUserId: Para não notificar o aluno como se fosse novidade pra ele
        );
      } catch (error) {
        console.error("Erro ao criar notificações de novo post aprovado:", error);
        // Não falha a moderação se a notificação falhar
      }
    }

    console.log("Post moderado com sucesso:", { postId, newStatus, data });
    return true;
  } catch (err: any) {
    console.error("Erro ao moderar post:", err);
    throw err;
  }
};

/**
 * Busca comentários pendentes de moderação (apenas para Admin)
 */
export const getPendingComments = async (): Promise<Comment[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(*), posts(id, content)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao buscar comentários pendentes:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Mapeia os comentários com estrutura similar ao getComments
    return data.map((comment: any) => {
      const author = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
      const post = Array.isArray(comment.posts) ? comment.posts[0] : comment.posts;
      
      return {
        id: comment.id,
        post_id: comment.post_id,
        user_id: comment.user_id,
        content: comment.content || '',
        created_at: comment.created_at,
        profile: author || null,
        status: comment.status || 'pending',
        // Informação adicional do post para contexto (opcional)
        post_content: post?.content || null
      };
    });
  } catch (err: any) {
    console.error("Erro ao buscar comentários pendentes:", err);
    return [];
  }
};

/**
 * Modera um comentário (aprova ou rejeita)
 */
export const moderateComment = async (commentId: string, newStatus: 'approved' | 'rejected'): Promise<boolean> => {
  if (!supabase) {
    console.error("Supabase não configurado. Não é possível moderar comentário.");
    throw new Error("Supabase não configurado");
  }

  try {
    const { data, error } = await supabase
      .from('comments')
      .update({ status: newStatus })
      .eq('id', commentId)
      .select();

    if (error) {
      console.error("Erro ao moderar comentário no Supabase:", error);
      console.error("Detalhes do erro:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    // Verifica se o comentário foi realmente atualizado
    if (!data || data.length === 0) {
      console.warn("Comentário não encontrado ou não foi atualizado:", commentId);
      throw new Error("Comentário não encontrado ou não foi possível atualizar");
    }

    console.log("Comentário moderado com sucesso:", { commentId, newStatus, data });
    return true;
  } catch (err: any) {
    console.error("Erro ao moderar comentário:", err);
    throw err;
  }
};

/**
 * Busca o perfil completo do usuário com estatísticas (posts e comentários)
 */
export const getUserFullProfile = async (userId: string): Promise<{
  profile: UserProfile | null;
  stats: {
    postsCount: number;
    commentsCount: number;
  };
}> => {
  if (!supabase) {
    return {
      profile: null,
      stats: { postsCount: 0, commentsCount: 0 }
    };
  }

  try {
    // Busca o perfil
    const profile = await getProfile(userId, false); // Não atualiza last_seen aqui

    // Conta posts do usuário
    const { count: postsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Conta comentários do usuário
    const { count: commentsCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return {
      profile,
      stats: {
        postsCount: postsCount || 0,
        commentsCount: commentsCount || 0
      }
    };
  } catch (error) {
    console.error("Erro ao buscar perfil completo:", error);
    return {
      profile: null,
      stats: { postsCount: 0, commentsCount: 0 }
    };
  }
};

/**
 * Busca interações do usuário (posts ou comentários)
 */
export const getUserInteractions = async (userId: string, type: 'posts' | 'comments'): Promise<Post[] | Comment[]> => {
  if (!supabase) return [];

  try {
    if (type === 'posts') {
      // Busca posts do usuário
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*, profiles:user_id(id, username, avatar_url, role)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error("Erro ao buscar posts do usuário:", postsError);
        return [];
      }

      if (!postsData || postsData.length === 0) {
        return [];
      }

      // Busca likes e saved_posts para cada post
      const postIds = postsData.map((p: any) => p.id);

      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      const { data: savedData } = await supabase
        .from('saved_posts')
        .select('post_id, user_id')
        .in('post_id', postIds)
        .eq('user_id', userId);

      const { data: commentsData } = await supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds);

      // Agrupa dados
      const likesByPost: Record<string, any[]> = {};
      const savedByPost: Record<string, boolean> = {};
      const commentsCountByPost: Record<string, number> = {};

      (likesData || []).forEach((like: any) => {
        if (!likesByPost[like.post_id]) {
          likesByPost[like.post_id] = [];
        }
        likesByPost[like.post_id].push(like);
      });

      (savedData || []).forEach((saved: any) => {
        savedByPost[saved.post_id] = true;
      });

      (commentsData || []).forEach((comment: any) => {
        commentsCountByPost[comment.post_id] = (commentsCountByPost[comment.post_id] || 0) + 1;
      });

      // Mapeia posts
      return postsData.map((post: any) => {
        const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
        const postLikes = likesByPost[post.id] || [];
        const userHasLiked = postLikes.some((l: any) => l.user_id === userId);

        return {
          id: post.id,
          user_id: post.user_id,
          content: post.content || '',
          created_at: post.created_at,
          likes_count: postLikes.length,
          comments_count: commentsCountByPost[post.id] || 0,
          user_has_liked: userHasLiked,
          profile: author || null,
          is_saved: savedByPost[post.id] || false,
          recent_liked_avatars: [],
          image_urls: post.image_urls || [],
          file_urls: post.file_urls || [],
          mentions: post.mentions || [],
          status: post.status || 'approved'
        } as Post;
      });
    } else {
      // Busca comentários do usuário com contexto do post
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*, posts(id, content, user_id)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (commentsError) {
        console.error("Erro ao buscar comentários do usuário:", commentsError);
        return [];
      }

      if (!commentsData || commentsData.length === 0) {
        return [];
      }

      // Busca perfil do usuário
      const profile = await getProfile(userId, false);

      // Mapeia comentários
      return commentsData.map((comment: any) => {
        const post = Array.isArray(comment.posts) ? comment.posts[0] : comment.posts;

        return {
          id: comment.id,
          post_id: comment.post_id,
          user_id: comment.user_id,
          content: comment.content,
          created_at: comment.created_at,
          profile: profile || null,
          status: comment.status || 'approved',
          // Informação adicional do post para contexto
          post_content: post?.content || null,
          post_author_id: post?.user_id || null
        } as Comment & { post_content?: string; post_author_id?: string };
      });
    }
  } catch (error) {
    console.error("Erro ao buscar interações do usuário:", error);
    return [];
  }
};

// --- NOTIFICATIONS ---

/**
 * Busca notificações do usuário
 */
export const getNotifications = async (userId: string): Promise<Notification[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*, trigger_user:profiles!action_by(avatar_url, full_name, username)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao buscar notificações:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Normaliza os dados do trigger_user (pode vir como array ou objeto)
    return data.map((notif: any) => {
      const triggerUser = Array.isArray(notif.trigger_user) 
        ? notif.trigger_user[0] 
        : notif.trigger_user;

      return {
        ...notif,
        trigger_user: triggerUser || null
      } as Notification;
    });
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return [];
  }
};

/**
 * Marca uma notificação como lida
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
    return false;
  }
};

/**
 * Marca todas as notificações do usuário como lidas
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error("Erro ao marcar todas as notificações como lidas:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro ao marcar todas as notificações como lidas:", error);
    return false;
  }
};

/**
 * Cria uma notificação
 */
const createNotification = async (
  userId: string,
  type: Notification['type'],
  title: string,
  content: string,
  link?: string,
  actionByUserId?: string | null
): Promise<void> => {
  if (!supabase) return;

  try {
    const notificationPayload: any = {
      user_id: userId,
      type,
      title,
      content,
      link: link || null,
      is_read: false
    };

    // Adiciona action_by apenas se fornecido
    if (actionByUserId !== undefined) {
      notificationPayload.action_by = actionByUserId;
    }

    const { error } = await supabase
      .from('notifications')
      .insert(notificationPayload);

    if (error) {
      console.error("Erro ao criar notificação:", error);
    }
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
  }
};

/**
 * Função auxiliar para notificar todos os usuários (Bulk Insert)
 */
const notifyAllUsers = async (
  type: Notification['type'],
  title: string,
  content: string,
  link?: string,
  actionByUserId?: string | null,
  excludeUserId?: string | null
): Promise<void> => {
  if (!supabase) return;

  try {
    // Busca todos os IDs de usuários na tabela profiles
    let query = supabase
      .from('profiles')
      .select('id');

    // Adiciona filtro para excluir o usuário que está gerando a ação (evitar auto-notificação)
    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data: profiles, error: profilesError } = await query;

    if (profilesError || !profiles || profiles.length === 0) {
      console.error("Erro ao buscar usuários para notificação:", profilesError);
      return;
    }

    // Monta array de objetos para inserção em massa (Bulk Insert)
    const notifications = profiles.map((profile: any) => ({
      user_id: profile.id,
      type,
      title,
      content,
      link: link || null,
      is_read: false,
      action_by: actionByUserId || null // Usa o valor do argumento ao invés de null fixo
    }));

    // Insere todas as notificações de uma vez
    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error("Erro ao criar notificações em massa:", error);
    } else {
      console.log(`Notificações criadas com sucesso para ${notifications.length} usuários`);
    }
  } catch (error) {
    console.error("Erro ao notificar todos os usuários:", error);
  }
};

/**
 * Notifica atualização de curso para todos os alunos
 * @deprecated Use notifyAllUsers diretamente
 */
export const notifyCourseUpdate = async (courseId: string, courseTitle: string, message: string): Promise<void> => {
  await notifyAllUsers(
    'course_update',
    `Atualização: ${courseTitle}`,
    message,
    `/app/course/${courseId}`
  );
};