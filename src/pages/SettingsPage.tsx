import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useUserRole } from '@/hooks/useUserRole';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sun, Moon, UserPlus, LogOut, ShieldCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
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
  const [newName, setNewName] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddMember = async () => {
    if (!newEmail.trim() || !newPassword.trim() || !newName.trim()) return;
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
      toast.success(`Convite enviado para ${newEmail}`);
      setNewEmail(''); setNewPassword(''); setNewName(''); setNewJobTitle('');
      setTimeout(() => { refetch(); refetchRoles(); }, 1000);
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
    await rejectUser(userId);
    toast.success('Usuário rejeitado');
  };

  // Pending users (not approved)
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
                  <div className="flex items-center justify-between">
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
                      <Button size="sm" variant="destructive" onClick={() => handleReject(role.user_id)} className="h-8">
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
            return (
              <div key={m.id} className="p-3 bg-secondary rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.user_id === user?.id ? '(Você)' : ''} {m.job_title && `· ${m.job_title}`}
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
              <Input type="password" placeholder="Senha (mín. 6 caracteres)" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} />
              <Button onClick={handleAddMember} className="w-full" disabled={loading}>
                {loading ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
