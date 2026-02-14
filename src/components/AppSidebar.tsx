import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, Kanban, Settings, Bell, LogOut, Camera, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useNotifications } from '@/hooks/useNotifications';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FileUpload from '@/components/FileUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendário' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
];

export default function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { profiles, refetch } = useProfiles();
  const { unreadCount } = useNotifications();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const myProfile = profiles.find(p => p.user_id === user?.id);

  const [editName, setEditName] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const openProfile = () => {
    setEditName(myProfile?.full_name || '');
    setEditJobTitle(myProfile?.job_title || '');
    setEditAvatar(myProfile?.avatar_url || '');
    setNewPassword('');
    setProfileOpen(true);
    setMenuOpen(false);
  };

  const handleSaveProfile = async () => {
    if (!myProfile) return;
    setSaving(true);

    await supabase.from('profiles').update({
      full_name: editName.trim(),
      job_title: editJobTitle.trim(),
      avatar_url: editAvatar || null,
    }).eq('id', myProfile.id);

    if (newPassword.trim().length >= 6) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) toast.error('Erro ao alterar senha: ' + error.message);
      else toast.success('Senha alterada!');
    }

    refetch();
    setSaving(false);
    setProfileOpen(false);
    toast.success('Perfil atualizado!');
  };

  const initials = (myProfile?.full_name || user?.email || '?')
    .split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col z-30">
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Kanban className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-sidebar-primary-foreground">PostFlow</span>
        </div>

        <nav className="flex-1 px-3 mt-4 space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {item.to === '/' && unreadCount > 0 && (
                  <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-3 mx-3 mb-4">
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sidebar-accent transition-colors"
            >
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {initials}
                </div>
              )}
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{myProfile?.full_name || user?.email}</p>
                <p className="text-[10px] text-sidebar-foreground/50 truncate">{myProfile?.job_title || 'Sem função'}</p>
              </div>
              <ChevronUp className={`w-4 h-4 text-sidebar-foreground/40 transition-transform ${menuOpen ? '' : 'rotate-180'}`} />
            </button>

            {menuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                <button onClick={openProfile} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-popover-foreground hover:bg-secondary transition-colors">
                  <Camera className="w-4 h-4" /> Editar Perfil
                </button>
                <button onClick={() => { setMenuOpen(false); signOut(); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-secondary transition-colors">
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Profile Edit Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex justify-center">
              <div className="relative">
                {editAvatar ? (
                  <img src={editAvatar} alt="" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                    {initials}
                  </div>
                )}
              </div>
            </div>
            <FileUpload bucket="client-logos" onUpload={setEditAvatar} label="Alterar foto" preview={editAvatar} />
            <Input placeholder="Nome completo" value={editName} onChange={e => setEditName(e.target.value)} />
            <Input placeholder="E-mail" value={user?.email || ''} disabled className="opacity-60" />
            <Input placeholder="Função (ex: Designer, Redator)" value={editJobTitle} onChange={e => setEditJobTitle(e.target.value)} />
            <Input type="password" placeholder="Nova senha (mín. 6 caracteres)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <Button onClick={handleSaveProfile} className="w-full" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
