import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { UserProfile, Course, Module, Lesson } from '../types';

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
 * Busca o perfil do usuário atual.
 */
export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!supabase) return null;

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
 * Busca todos os cursos disponíveis.
 */
export const getCourses = async (): Promise<Course[]> => {
  if (!supabase) {
    // Retorna dados mockados se não houver conexão
    return [
      { id: '1', title: "Dominando E-commerce", description: "Aprenda a criar sua loja do zero ao avançado.", thumbnail_url: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80&w=800", modules_count: 3, duration_hours: 24 },
      { id: '2', title: "Marketing Digital 2.0", description: "Estratégias modernas para redes sociais.", thumbnail_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800", modules_count: 2, duration_hours: 16 },
      { id: '3', title: "Gestão de Tráfego", description: "Como escalar suas vendas com anúncios pagos.", thumbnail_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800", modules_count: 4, duration_hours: 30 },
    ];
  }

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar cursos:", error);
    return [];
  }

  return data as Course[];
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

  // 3. Tenta adicionar updated_at
  const payloadWithDate = {
    ...payload,
    updated_at: new Date().toISOString()
  };

  console.log("Supabase Service: Tentando salvar curso. Payload:", payloadWithDate);

  try {
    // Tentativa principal com data
    const { data, error } = await supabase
      .from('courses')
      .upsert(payloadWithDate)
      .select()
      .single();

    if (error) throw error;
    
    console.log("Supabase Service: Curso salvo com sucesso.", data);
    return data;

  } catch (error: any) {
    console.warn("Supabase Service: Falha na primeira tentativa de save. Tentando fallback sem updated_at...", error.message);
    
    // Fallback: Tenta salvar sem o campo updated_at se o erro persistir (ex: coluna não existe)
    // Isso evita travar o sistema se o banco estiver desatualizado
    const { data, error: retryError } = await supabase
      .from('courses')
      .upsert(payload) // Payload sem a data forçada
      .select()
      .single();

    if (retryError) {
      console.error("Supabase Service: Erro fatal ao salvar curso:", retryError);
      throw retryError;
    }

    return data;
  }
};

/**
 * Deleta um curso e sua imagem de capa (se houver).
 */
export const deleteCourse = async (courseId: string) => {
  if (!supabase) return;

  console.log(`Supabase Service: Iniciando exclusão do curso ${courseId}`);

  try {
    // 1. Buscar info do curso para pegar a imagem
    const { data: course, error: fetchError } = await supabase
        .from('courses')
        .select('thumbnail_url')
        .eq('id', courseId)
        .single();
    
    if (fetchError) console.warn("Aviso: Não foi possível buscar dados da imagem antes de excluir.", fetchError);

    // 2. Se tiver imagem no Storage, deletar
    if (course?.thumbnail_url) {
        try {
            // Extrai o nome do arquivo da URL pública
            // URL Típica: .../storage/v1/object/public/course-thumbnails/nome-arquivo.jpg
            const urlParts = course.thumbnail_url.split('/course-thumbnails/');
            if (urlParts.length > 1) {
                const fileName = urlParts[1];
                console.log(`Supabase Service: Removendo imagem ${fileName}`);
                await supabase.storage.from('course-thumbnails').remove([fileName]);
            }
        } catch (storageError) {
            console.error("Erro ao excluir imagem do storage (prosseguindo com exclusão do curso):", storageError);
        }
    }

    // 3. Deletar o registro do curso
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    
    if (error) {
        console.error("Erro ao deletar curso do banco:", error);
        throw error;
    }
    
    console.log("Supabase Service: Curso excluído com sucesso.");

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
          { id: 'l1', module_id: 'm1', title: 'Boas vindas e Mindset', video_id: 'M7lc1UVf-VE', duration_mins: 15, order: 1, description: 'Seja bem-vindo ao curso. Vamos alinhar as expectativas e preparar sua mente para o sucesso.' },
          { id: 'l2', module_id: 'm1', title: 'Configurando sua conta', video_id: 'SqcY0GlETPk', duration_mins: 20, order: 2, description: 'Passo a passo para iniciar suas configurações.' },
        ]
      },
      {
        id: 'm2', course_id: courseId, title: 'Módulo 02: Estratégia', order: 2, lessons: [
          { id: 'l3', module_id: 'm2', title: 'Definindo seu Nicho', video_id: 'C_q5PMeWkLI', duration_mins: 30, order: 1, description: 'Como escolher o nicho mais lucrativo para você.' },
          { id: 'l4', module_id: 'm2', title: 'Análise de Concorrência', video_id: 'jfKfPfyJRdk', duration_mins: 25, order: 2, description: 'Espionando o mercado para sair na frente.' },
          { id: 'l5', module_id: 'm2', title: 'Funil de Vendas', video_id: '0p7lT-6L25c', duration_mins: 40, order: 3, description: 'A estrutura secreta dos grandes players.' },
        ]
      }
    ];
    // Simula delay de rede
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

// CRUD Module
export const upsertModule = async (module: Partial<Module>) => {
  if (!supabase) return;
  
  const { lessons, ...moduleData } = module as any; 
  
  // Limpeza de ID e Validação
  if (!moduleData.id || moduleData.id === '') {
    delete moduleData.id;
  }
  
  // Validação Crítica
  if (!moduleData.course_id) {
    throw new Error("Supabase Service Error: course_id is missing for module upsert");
  }

  const payloadWithDate = {
    ...moduleData,
    updated_at: new Date().toISOString()
  };

  console.log("Supabase Service: Salvando módulo...", payloadWithDate);

  try {
    const { error } = await supabase.from('modules').upsert(payloadWithDate);
    if (error) throw error;
  } catch (err: any) {
    console.warn("Supabase Service: Erro ao salvar módulo, tentando fallback sem updated_at...", err.message);
    const { error } = await supabase.from('modules').upsert(moduleData);
    if (error) {
        console.error("Erro fatal ao salvar módulo:", error);
        throw error;
    }
  }
};

export const deleteModule = async (moduleId: string) => {
  if (!supabase) return;
  console.log(`Supabase Service: Deletando módulo ${moduleId}`);
  const { error } = await supabase.from('modules').delete().eq('id', moduleId);
  if (error) {
      console.error("Erro ao deletar módulo:", error);
      throw error;
  }
};

// CRUD Lesson
export const upsertLesson = async (lesson: Partial<Lesson>) => {
  if (!supabase) return;

  const payload: any = { ...lesson };
  if (!payload.id || payload.id === '') {
    delete payload.id;
  }

  // Validação Crítica
  if (!payload.module_id) {
    throw new Error("Supabase Service Error: module_id is missing for lesson upsert");
  }

  const payloadWithDate = {
    ...payload,
    updated_at: new Date().toISOString()
  };

  console.log("Supabase Service: Salvando aula... PAYLOAD AULA:", payloadWithDate);

  try {
    const { error } = await supabase.from('lessons').upsert(payloadWithDate);
    if (error) throw error;
  } catch (err: any) {
    console.warn("Supabase Service: Erro ao salvar aula, tentando fallback...", err.message);
    const { error } = await supabase.from('lessons').upsert(payload);
    if (error) {
         console.error("Erro fatal ao salvar aula:", error);
         throw error;
    }
  }
};

export const deleteLesson = async (lessonId: string) => {
  if (!supabase) return;
  console.log(`Supabase Service: Deletando aula ${lessonId}`);
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
  if (error) {
      console.error("Erro ao deletar aula:", error);
      throw error;
  }
};