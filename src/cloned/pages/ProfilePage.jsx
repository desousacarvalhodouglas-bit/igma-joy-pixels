import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../ClonedAuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import BottomNav from '../components/BottomNav';
import { User, Mail, Globe, LogOut, Edit, Check, Heart, MapPin, Shield, Sparkles, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getOrCreateSvcProfile, updateSvcProfile } from '../lib/authProfile';

const HELP_CATEGORIES = [
  { value: 'food', label: 'Alimentação', icon: '🍽️' },
  { value: 'legal', label: 'Jurídico', icon: '⚖️' },
  { value: 'health', label: 'Saúde', icon: '🏥' },
  { value: 'housing', label: 'Moradia', icon: '🏠' },
  { value: 'work', label: 'Trabalho', icon: '💼' },
  { value: 'education', label: 'Educação', icon: '📚' },
  { value: 'social', label: 'Social', icon: '🤝' },
  { value: 'clothes', label: 'Roupas', icon: '👕' },
  { value: 'furniture', label: 'Móveis', icon: '🪑' },
  { value: 'transport', label: 'Transporte', icon: '🚗' }
];

export default function ProfilePage() {
  const { user, logout, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCategoriesDialog, setShowCategoriesDialog] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [useDisplayName, setUseDisplayName] = useState(user?.use_display_name || false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [savingCategories, setSavingCategories] = useState(false);
  const [activeTab, setActiveTab] = useState('presentation');

  useEffect(() => {
    fetchUserProfile();
    setDisplayName(user?.display_name || user?.name || '');
  }, [user?.id]);

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const profile = await getOrCreateSvcProfile(session.user);
      setSelectedCategories(profile?.categories || []);
      setDisplayName(profile?.display_name || user?.name || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const saveDisplayName = async () => {
    try {
      if (!user?.id) return;
      await updateSvcProfile(user.id, { display_name: displayName });
      await refreshUser?.();
      toast.success('Nome fictício atualizado!');
      setShowEditDialog(false);
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const saveCategories = async () => {
    setSavingCategories(true);
    try {
      if (!user?.id) return;
      await updateSvcProfile(user.id, { categories: selectedCategories });
      await refreshUser?.();
      toast.success('Categorias atualizadas!');
      setShowCategoriesDialog(false);
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setSavingCategories(false);
    }
  };

  const getCategoryInfo = (value) => {
    return HELP_CATEGORIES.find(c => c.value === value) || { icon: '📝', label: value };
  };

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="profile-page">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 glassmorphism">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-heading font-bold text-textPrimary">{t('profile')}</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Hero Card Personalizado */}
        <div className="relative bg-white rounded-3xl shadow-card overflow-hidden mb-6">
          {/* Cover banner com gradiente e padrões */}
          <div className="relative h-36 bg-gradient-to-br from-primary via-primary to-accent overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/30 blur-2xl" />
              <div className="absolute top-10 left-10 w-24 h-24 rounded-full bg-accent/40 blur-xl" />
              <div className="absolute bottom-0 right-1/3 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-medium">
              <Sparkles size={12} />
              Membro ativo
            </div>
          </div>

          {/* Avatar sobreposto */}
          <div className="px-6 pb-6 -mt-14">
            <div className="flex items-end justify-between mb-4">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-accent ring-4 ring-white shadow-xl flex items-center justify-center overflow-hidden">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={52} className="text-white" />
                  )}
                </div>
                <button className="absolute bottom-1 right-1 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition">
                  <Camera size={14} className="text-primary" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold mb-2">
                <Shield size={12} />
                Verificado
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-heading font-bold text-textPrimary" data-testid="user-name">
                  {user?.use_display_name && user?.display_name ? user.display_name : user?.name}
                </h2>
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                  <DialogTrigger asChild>
                    <button className="p-1.5 hover:bg-gray-100 rounded-full transition-all">
                      <Edit size={16} className="text-primary" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="rounded-3xl">
                    <DialogHeader>
                      <DialogTitle>Nome Fictício (Privacidade)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome Fictício</Label>
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Ex: Maria S., João A."
                          className="rounded-xl mt-2"
                        />
                        <p className="text-xs text-textMuted mt-2">
                          Este nome aparecerá nos posts em vez do seu nome real
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={useDisplayName}
                          onChange={(e) => setUseDisplayName(e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300"
                        />
                        <Label>Usar nome fictício nos posts</Label>
                      </div>
                      <Button
                        onClick={saveDisplayName}
                        className="w-full rounded-full py-6 bg-primary hover:bg-primary-hover"
                      >
                        Salvar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {user?.use_display_name && user?.display_name && (
                <p className="text-xs text-textMuted mb-1">Nome fictício ativo</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/15 text-accent rounded-full text-xs font-semibold capitalize" data-testid="user-role">
                  {user?.role === 'migrant' ? '🌍 ' + t('migrant') : user?.role === 'helper' ? '🤝 ' + t('helper') : user?.role}
                </span>
                {user?.location && (
                  <span className="inline-flex items-center gap-1 text-xs text-textMuted">
                    <MapPin size={12} /> {user.location}
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-gray-100">
              <div className="text-center">
                <div className="text-xl font-bold text-textPrimary">{selectedCategories.length}</div>
                <div className="text-[11px] text-textMuted uppercase tracking-wide">Categorias</div>
              </div>
              <div className="text-center border-x border-gray-100">
                <div className="text-xl font-bold text-textPrimary">{user?.languages?.length || 0}</div>
                <div className="text-[11px] text-textMuted uppercase tracking-wide">Idiomas</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-textPrimary">0</div>
                <div className="text-[11px] text-textMuted uppercase tracking-wide">Ajudas</div>
              </div>
            </div>
          </div>
        </div>

        {/* Informações de contato */}
        <div className="bg-white rounded-3xl p-6 shadow-card space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-textSecondary">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail size={16} className="text-primary" />
              </div>
              <span className="text-sm" data-testid="user-email">{user?.email}</span>
            </div>
            {user?.languages && user.languages.length > 0 && (
              <div className="flex items-center gap-3 text-textSecondary">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe size={16} className="text-primary" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {user.languages.map(lang => (
                    <span key={lang} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium">
                      {lang.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>


          {/* Seção de Categorias de Ajuda */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-textPrimary flex items-center gap-2">
                <Heart size={20} className="text-primary" />
                Categorias que você ajuda
              </h3>
              <Dialog open={showCategoriesDialog} onOpenChange={setShowCategoriesDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full">
                    <Edit size={16} className="mr-1" />
                    Editar
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      🤝 Categorias de Ajuda
                    </DialogTitle>
                    <p className="text-sm text-textSecondary">
                      Selecione as categorias em que você pode oferecer ajuda
                    </p>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-2 gap-3 my-4">
                    {HELP_CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => toggleCategory(cat.value)}
                        className={`p-3 rounded-xl border-2 transition-all text-left relative ${
                          selectedCategories.includes(cat.value)
                            ? 'bg-primary/10 border-primary shadow-md'
                            : 'bg-white border-gray-200 hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{cat.icon}</span>
                          <span className={`text-sm font-medium ${
                            selectedCategories.includes(cat.value) ? 'text-primary' : 'text-textPrimary'
                          }`}>
                            {cat.label}
                          </span>
                        </div>
                        {selectedCategories.includes(cat.value) && (
                          <div className="absolute top-2 right-2">
                            <Check size={14} className="text-primary" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedCategories.length > 0 && (
                    <div className="p-3 bg-green-50 rounded-xl border border-green-200 mb-4">
                      <p className="text-sm text-green-700 flex items-center gap-2">
                        <Check size={16} />
                        {selectedCategories.length} categoria{selectedCategories.length > 1 ? 's' : ''} selecionada{selectedCategories.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={saveCategories}
                    disabled={savingCategories}
                    className="w-full rounded-full py-6 bg-primary hover:bg-primary-hover"
                  >
                    {savingCategories ? 'Salvando...' : 'Salvar Categorias'}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>

            {selectedCategories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map(cat => {
                  const info = getCategoryInfo(cat);
                  return (
                    <span 
                      key={cat}
                      className="px-3 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium flex items-center gap-1"
                    >
                      {info.icon} {info.label}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  Você ainda não selecionou categorias. Clique em "Editar" para escolher.
                </p>
              </div>
            )}
          </div>

          {user?.bio && (
            <div className="border-t border-gray-100 pt-6">
              <h3 className="font-bold text-textPrimary mb-2">Sobre</h3>
              <p className="text-textSecondary leading-relaxed">{user.bio}</p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-6">
            <Button
              data-testid="logout-button"
              onClick={handleLogout}
              variant="outline"
              className="w-full rounded-full py-6 text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut size={20} className="mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
