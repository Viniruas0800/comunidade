import React, { useState, useRef } from 'react';
import { Button } from '../components/Button';
import { User, Camera, Sparkles, UploadCloud } from 'lucide-react';
import { supabase, updateProfile, uploadAvatar } from '../services/supabase';

interface OnboardingViewProps {
  onComplete: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  
  // Estados para imagem
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Cria URL local para preview imediato
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let userId = 'mock-id';

      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado.");
        userId = user.id;
      }

      // Validação básica
      if (!username.trim()) throw new Error("O nome de usuário é obrigatório.");

      let finalAvatarUrl = '';

      // Se houver arquivo selecionado, faz upload
      if (selectedFile) {
        const uploadedUrl = await uploadAvatar(selectedFile, userId);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        }
      }

      await updateProfile(userId, {
        username: username.trim(),
        bio: bio.trim(),
        ...(finalAvatarUrl && { avatar_url: finalAvatarUrl }) // Só atualiza se tiver URL nova
      });

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md animate-fadeIn">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-surfaceHighlight rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(139,44,245,0.15)]">
            <Sparkles size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">Complete seu perfil</h1>
          <p className="text-textMuted mt-1">Vamos personalizar sua experiência na comunidade.</p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          
          {/* Avatar Section - Clickable */}
          <div className="flex flex-col items-center gap-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              accept="image/*"
            />
            
            <div 
              onClick={handleAvatarClick}
              className="relative group cursor-pointer"
            >
              <div className="w-28 h-28 rounded-full bg-surface border-2 border-dashed border-border flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-primary group-hover:bg-surfaceHighlight">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-textMuted group-hover:text-primary transition-colors">
                    <User size={32} className="mb-1" />
                  </div>
                )}
              </div>
              
              {/* Overlay Icon */}
              <div className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg transform transition-transform group-hover:scale-110">
                <Camera size={16} />
              </div>
            </div>
            <p className="text-xs text-textMuted">Clique para adicionar uma foto</p>
          </div>

          <div className="space-y-4">
            {/* Username Input */}
            <div className="relative">
              <label className="block text-sm font-medium text-textMuted mb-1.5">
                Nome de Usuário
              </label>
              <div className="relative">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted font-medium select-none">
                    @
                 </div>
                 <input
                  className="w-full bg-surface border border-border text-textMain rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder-textMuted/50 transition-all duration-200"
                  placeholder="seu.usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                  required
                />
              </div>
            </div>

            {/* Bio Textarea */}
            <div>
              <label className="block text-sm font-medium text-textMuted mb-1.5">
                Bio
              </label>
              <textarea
                className="w-full bg-surface border border-border text-textMain rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder-textMuted/50 transition-all duration-200 min-h-[100px] resize-none"
                placeholder="Conte um pouco sobre você e seus objetivos..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <Button type="submit" isLoading={loading}>
            {loading ? (
               <span className="flex items-center gap-2">
                 <UploadCloud size={18} className="animate-bounce" /> Salvando...
               </span>
            ) : 'Finalizar Perfil e Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
};