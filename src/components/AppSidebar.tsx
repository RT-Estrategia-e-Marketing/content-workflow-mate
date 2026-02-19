import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, Kanban, Settings, Bell, LogOut, Camera, ChevronUp, Check, Trash2, MailOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useNotifications } from '@/hooks/useNotifications';
import { useApp } from '@/contexts/AppContext';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import FileUpload from '@/components/FileUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendário' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
];

interface AppSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({ mobileOpen, onClose }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profiles, refetch } = useProfiles();
  const { notifications, unreadCount, markAsRead, markAsUnread, markAllAsRead, deleteNotification, deleteAllNotifications } = useNotifications();
  const { posts, clients } = useApp();
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

  const handleNotificationClick = (n: typeof notifications[0]) => {
    markAsRead(n.id);
    // Navigate to the client that owns the post
    const post = posts.find(p => p.id === n.post_id);
    if (post) {
      navigate(`/clients/${post.clientId}`);
      onClose?.();
    }
  };

  const initials = (myProfile?.full_name || user?.email || '?')
    .split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const recentNotifications = notifications.slice(0, 10);

  return (
    <>
      <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col z-30 transition-transform ${mobileOpen === false ? '-translate-x-full' : mobileOpen === true ? 'translate-x-0' : ''}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Kanban className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-sidebar-primary-foreground">PostFlow</span>
          
          {/* Notification Bell */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="ml-auto relative p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                <Bell className="w-4 h-4 text-sidebar-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start" side="bottom">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-display font-bold text-foreground">Notificações</h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                      <Check className="w-3 h-3" /> Ler todas
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={deleteAllNotifications} className="text-[10px] text-destructive hover:underline flex items-center gap-1 ml-2">
                      <Trash2 className="w-3 h-3" /> Limpar
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-[350px] overflow-y-auto">
                {recentNotifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Nenhuma notificação</p>
                ) : (
                  recentNotifications.map(n => {
                    const fromProfile = profiles.find(p => p.user_id === n.from_user_id);
                    return (
                      <div
                        key={n.id}
                        className={`w-full text-left px-3 py-2.5 transition-colors border-b border-border/50 last:border-0 ${
                          n.read ? 'hover:bg-secondary' : 'bg-primary/5 hover:bg-primary/10'
                        }`}
                      >
                        <button
                          onClick={() => handleNotificationClick(n)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start gap-2">
                            {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-foreground leading-relaxed">{n.message}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {new Date(n.created_at).toLocaleDateString('pt-BR')}
                                {fromProfile && ` · ${fromProfile.full_name}`}
                              </p>
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-2 mt-1 pl-3.5">
                          {n.read ? (
                            <button onClick={() => markAsUnread(n.id)} className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                              <MailOpen className="w-2.5 h-2.5" /> Não lida
                            </button>
                          ) : (
                            <button onClick={() => markAsRead(n.id)} className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Lida
                            </button>
                          )}
                          <button onClick={() => deleteNotification(n.id)} className="text-[9px] text-destructive/70 hover:text-destructive flex items-center gap-0.5">
                            <Trash2 className="w-2.5 h-2.5" /> Apagar
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <nav className="flex-1 px-3 mt-4 space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="px-3 mb-4">
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sidebar-accent transition-colors"
            >
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-sidebar-border" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary ring-2 ring-sidebar-border">
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
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-slide-in">
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    {myProfile?.avatar_url ? (
                      <img src={myProfile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-popover-foreground truncate">{myProfile?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={openProfile}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-popover-foreground hover:bg-secondary transition-colors"
                >
                  <Camera className="w-4 h-4 text-muted-foreground" /> Editar Perfil
                </button>
                <div className="border-t border-border">
                  <button
                    onClick={() => { setMenuOpen(false); signOut(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-secondary transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sair
                  </button>
                </div>
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
                  <img src={editAvatar} alt="" className="w-20 h-20 rounded-full object-cover ring-4 ring-border" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary ring-4 ring-border">
                    {initials}
                  </div>
                )}
              </div>
            </div>
            <FileUpload bucket="client-logos" onUpload={setEditAvatar} label="Alterar foto" preview={editAvatar} />
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Nome</label>
              <Input placeholder="Nome completo" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">E-mail</label>
              <Input placeholder="E-mail" value={user?.email || ''} disabled className="opacity-60" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Função</label>
              <Input placeholder="Função (ex: Designer, Redator)" value={editJobTitle} onChange={e => setEditJobTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Nova senha</label>
              <Input type="password" placeholder="Nova senha (mín. 6 caracteres)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <Button onClick={handleSaveProfile} className="w-full" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
