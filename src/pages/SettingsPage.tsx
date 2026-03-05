import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useUserRole } from '@/hooks/useUserRole';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sun, Moon, UserPlus, LogOut, ShieldCheck, Clock, CheckCircle, XCircle, Trash2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { profiles, refetch } = useProfiles();
  const { allRoles, isAdmin, approveUser, rejectUser, refetch: refetchRoles } = useUserRole();
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newName, setNewName] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // Delete user state
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserName, setDeleteUserName] = useState('');
  const [deleteUserConfirm, setDeleteUserConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleAddMember = async () => {
    if (!newEmail.trim() || !newPassword.trim() || !newName.trim()) return;
    if (newPassword !== newPasswordConfirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: newEmail.trim(),
      password: newPassword,
      options: {
        data: { full_name: newName.trim() },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      // Auto-approve the user created by admin
      toast.success(`Usuário ${newName.trim()} criado com sucesso!`);
      setNewEmail(''); setNewPassword(''); setNewPasswordConfirm(''); setNewName(''); setNewJobTitle('');
      // Wait for triggers to create role, then approve
      setTimeout(async () => {
        refetch();
        refetchRoles();
        // Find and approve the newly created user
        const { data: newRoles } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false }).limit(5);
        if (newRoles) {
          const pending = newRoles.find((r: any) => !r.approved);
          if (pending) {
            await approveUser(pending.user_id, 'member');
            if (newJobTitle.trim()) {
              const { data: newProfiles } = await supabase.from('profiles').select('*').eq('user_id', pending.user_id).limit(1);
              if (newProfiles && newProfiles.length > 0) {
                await supabase.from('profiles').update({ job_title: newJobTitle.trim() } as any).eq('id', newProfiles[0].id);
              }
            }
            refetch();
            refetchRoles();
          }
        }
      }, 1500);
    }
    setLoading(false);
  };

  const handleUpdateJobTitle = async (profileId: string, job_title: string) => {
    await supabase.from('profiles').update({ job_title } as any).eq('id', profileId);
    refetch();
    toast.success('Função atualizada');
  };

  const handleApprove = async (userId: string, role: string) => {
    await approveUser(userId, role as 'admin' | 'manager' | 'member');
    toast.success('Usuário aprovado!');
  };

  const handleReject = async (userId: string) => {
    // Reject = delete from auth entirely
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });
      if (error) throw error;
      toast.success('Usuário rejeitado e removido');
      refetchRoles();
      refetch();
    } catch (err: any) {
      toast.error('Erro ao rejeitar: ' + (err.message || ''));
    }
    setDeleting(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId || deleteUserConfirm !== 'EXCLUIR') return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: deleteUserId },
      });
      if (error) throw error;
      toast.success('Usuário excluído');
      setDeleteUserOpen(false);
      refetchRoles();
      refetch();
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err.message || ''));
    }
    setDeleting(false);
  };

  const openDeleteUser = (userId: string, name: string) => {
    setDeleteUserId(userId);
    setDeleteUserName(name);
    setDeleteUserConfirm('');
    setDeleteUserOpen(true);
  };

  const pendingRoles = allRoles.filter(r => !r.approved);
  const approvedRoles = allRoles.filter(r => r.approved);

  return (
    <div className="animate-slide-in max-w-2xl">
      <h1 className="text-3xl font-display font-bold text-foreground mb-1">Configurações</h1>
      <p className="text-muted-foreground mb-8">Configurações gerais do aplicativo</p>

      {/* Theme */}
      <section className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <h2 className="font-display font-bold text-lg text-card-foreground mb-4">Aparência</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'light' ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5 text-accent" />}
            <div>
              <p className="text-sm font-medium text-card-foreground">
                {theme === 'light' ? 'Modo Diurno' : 'Modo Noturno'}
              </p>
              <p className="text-xs text-muted-foreground">Alternar tema do aplicativo</p>
            </div>
          </div>
          <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
        </div>
      </section>

      {/* User Info */}
      <section className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <h2 className="font-display font-bold text-lg text-card-foreground mb-4">Minha Conta</h2>
        <p className="text-sm text-muted-foreground mb-2">Logado como: <span className="font-medium text-foreground">{user?.email}</span></p>
        <Button variant="outline" onClick={signOut} size="sm">
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </section>

      {/* Pending Approvals (Admin only) */}
      {isAdmin && pendingRoles.length > 0 && (
        <section className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
          <h2 className="font-display font-bold text-lg text-card-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-warning" /> Aprovações Pendentes
          </h2>
          <div className="space-y-3">
            {pendingRoles.map(role => {
              const profile = profiles.find(p => p.user_id === role.user_id);
              return (
                <div key={role.id} className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{profile?.full_name || 'Novo usuário'}</p>
                      <p className="text-xs text-muted-foreground">{role.user_id.substring(0, 8)}...</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select defaultValue="member" onValueChange={(v) => handleApprove(role.user_id, v)}>
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Gerente</SelectItem>
                          <SelectItem value="member">Membro</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => handleApprove(role.user_id, 'member')} className="h-8">
                        <CheckCircle className="w-3 h-3 mr-1" /> Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(role.user_id)} className="h-8" disabled={deleting}>
                        <XCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Team Members */}
      <section className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <h2 className="font-display font-bold text-lg text-card-foreground mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Equipe
        </h2>

        <div className="space-y-3 mb-6">
          {profiles.map(m => {
            const role = approvedRoles.find(r => r.user_id === m.user_id);
            const isMe = m.user_id === user?.id;
            return (
              <div key={m.id} className="p-3 bg-secondary rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isMe ? '(Você)' : ''} {m.job_title && `· ${m.job_title}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && role && (
                      <Select value={role.role} onValueChange={(v) => approveUser(m.user_id, v as any)}>
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Gerente</SelectItem>
                          <SelectItem value="member">Membro</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {!isAdmin && role && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium capitalize">
                        {role.role}
                      </span>
                    )}
                    {isAdmin && !isMe && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteUser(m.user_id, m.full_name)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <Input
                    placeholder="Função (ex: Designer, Redator...)"
                    defaultValue={m.job_title}
                    onBlur={(e) => {
                      if (e.target.value !== m.job_title) handleUpdateJobTitle(m.id, e.target.value);
                    }}
                    className="h-8 text-xs"
                  />
                )}
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Adicionar Pessoa
            </h3>
            <div className="space-y-3">
              <Input placeholder="Nome completo" value={newName} onChange={e => setNewName(e.target.value)} maxLength={100} />
              <Input placeholder="Função (ex: Designer, Redator)" value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} maxLength={100} />
              <Input type="email" placeholder="E-mail" value={newEmail} onChange={e => setNewEmail(e.target.value)} maxLength={255} />
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Senha (mín. 6 caracteres)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Confirmar senha"
                value={newPasswordConfirm}
                onChange={e => setNewPasswordConfirm(e.target.value)}
                minLength={6}
              />
              <Button onClick={handleAddMember} className="w-full" disabled={loading}>
                {loading ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Delete User Dialog */}
      <Dialog open={deleteUserOpen} onOpenChange={setDeleteUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Excluir Usuário</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              Você está prestes a excluir <strong className="text-foreground">{deleteUserName}</strong> permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-2 block">
                Digite <strong className="text-destructive">EXCLUIR</strong> para confirmar
              </label>
              <Input
                value={deleteUserConfirm}
                onChange={e => setDeleteUserConfirm(e.target.value)}
                placeholder="EXCLUIR"
                className="font-mono"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteUserOpen(false)} className="flex-1">Cancelar</Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={deleteUserConfirm !== 'EXCLUIR' || deleting}
                className="flex-1"
              >
                {deleting ? 'Excluindo...' : 'Excluir Usuário'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
