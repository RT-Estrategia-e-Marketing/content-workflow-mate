import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useUserRole } from '@/hooks/useUserRole';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sun, Moon, UserPlus, LogOut, ShieldCheck, Clock, CheckCircle, XCircle, Trash2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { db, secondaryAuth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
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
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);

  // Delete user state
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserName, setDeleteUserName] = useState('');
  const [deleteUserConfirm, setDeleteUserConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Change password state
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [changePassUserId, setChangePassUserId] = useState<string | null>(null);
  const [changePassUserName, setChangePassUserName] = useState('');
  const [changePassValue, setChangePassValue] = useState('');
  const [changePassConfirm, setChangePassConfirm] = useState('');
  const [showChangePass, setShowChangePass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

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

    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newEmail.trim(), newPassword);
      const uid = cred.user.uid;

      await setDoc(doc(db, 'profiles', uid), {
        user_id: uid,
        full_name: newName.trim(),
        job_title: newJobTitle.trim(),
        priority: 'member',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      await setDoc(doc(db, 'user_roles', uid), {
        user_id: uid,
        role: newRole,
        approved: true,
        created_at: new Date().toISOString()
      });

      // Clear the secondary auth so they don't stay logged in
      secondaryAuth.signOut();

      toast.success(`Usuário ${newName.trim()} criado com sucesso!`);
      setNewEmail(''); setNewPassword(''); setNewPasswordConfirm(''); setNewName(''); setNewJobTitle(''); setNewRole('member');
    } catch (err: any) {
      toast.error('Erro ao criar usuário: ' + (err.message || ''));
    }
    setLoading(false);
  };

  const handleUpdateJobTitle = async (profileId: string, job_title: string) => {
    await updateDoc(doc(db, 'profiles', profileId), { job_title });
    toast.success('Função atualizada');
  };

  const handleApprove = async (userId: string, role: string) => {
    await approveUser(userId, role as 'admin' | 'member');
    toast.success('Usuário aprovado!');
  };

  const handleReject = async (userId: string) => {
    setDeleting(true);
    try {
      // Deleting users fully from Firebase auth requires Admin SDK / Cloud Functions.
      // We'll just delete their roles and profiles to simulate rejection.
      await deleteDoc(doc(db, 'user_roles', userId));
      await deleteDoc(doc(db, 'profiles', userId));
      toast.success('Usuário rejeitado e removido da área de membros');
    } catch (err: any) {
      toast.error('Erro ao rejeitar: ' + (err.message || ''));
    }
    setDeleting(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId || deleteUserConfirm !== 'EXCLUIR') return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'user_roles', deleteUserId));
      await deleteDoc(doc(db, 'profiles', deleteUserId));
      toast.success('Perfil excluído. (Nota: A exclusão da conta Firebase do usuário requer funções de Admin Backend)');
      setDeleteUserOpen(false);
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

  const openChangePassword = (userId: string, name: string) => {
    setChangePassUserId(userId);
    setChangePassUserName(name);
    setChangePassValue('');
    setChangePassConfirm('');
    setShowChangePass(false);
    setChangePassOpen(true);
  };

  const handleChangePassword = async () => {
    if (!changePassUserId || !changePassValue.trim()) return;
    if (changePassValue !== changePassConfirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (changePassValue.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setChangingPass(true);
    // Real password changes on OTHER users require Firebase Admin SDK.
    // For now, this is disabled until backend Admin SDK is configured.
    toast.error('Aviso: Alterar senha de outro usuário requer Firebase Admin SDK (Backend).');
    setChangePassOpen(false);
    setChangingPass(false);
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
                <PendingUserCard
                  key={role.id}
                  role={role}
                  profileName={profile?.full_name || 'Novo usuário'}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  deleting={deleting}
                />
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
            const isMe = m.user_id === user?.uid;
            return (
              <div key={m.id} className="p-3 bg-secondary rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.avatar_url || ''} />
                      <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
                        {m.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {isMe ? '(Você)' : ''} {m.job_title && `· ${m.job_title}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && role && (
                      <Select value={role.role === 'manager' ? 'member' : role.role} onValueChange={(v) => approveUser(m.user_id, v as any)}>
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Membro</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {!isAdmin && role && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium capitalize">
                        {role.role === 'manager' ? 'Membro' : role.role === 'admin' ? 'Admin' : 'Membro'}
                      </span>
                    )}
                    {isAdmin && !isMe && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openChangePassword(m.user_id, m.full_name)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="Alterar senha"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteUser(m.user_id, m.full_name)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
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
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Confirmar senha"
                  value={newPasswordConfirm}
                  onChange={e => setNewPasswordConfirm(e.target.value)}
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
              <Select value={newRole} onValueChange={(v) => setNewRole(v as 'admin' | 'member')}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Tipo de acesso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
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
          <div className="mt-2 space-y-5">
            <p className="text-sm text-muted-foreground">
              Você está prestes a excluir <strong className="text-foreground">{deleteUserName}</strong> permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-3 block">
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

      {/* Change Password Dialog */}
      <Dialog open={changePassOpen} onOpenChange={setChangePassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Alterar Senha</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              Alterar a senha de <strong className="text-foreground">{changePassUserName}</strong>
            </p>
            <div className="relative">
              <Input
                type={showChangePass ? 'text' : 'password'}
                placeholder="Nova senha (mín. 6 caracteres)"
                value={changePassValue}
                onChange={e => setChangePassValue(e.target.value)}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowChangePass(!showChangePass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showChangePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showChangePass ? 'text' : 'password'}
                placeholder="Confirmar nova senha"
                value={changePassConfirm}
                onChange={e => setChangePassConfirm(e.target.value)}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowChangePass(!showChangePass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showChangePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setChangePassOpen(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleChangePassword} disabled={changingPass || !changePassValue.trim()} className="flex-1">
                {changingPass ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Pending user card with its own role state
function PendingUserCard({ role, profileName, onApprove, onReject, deleting }: {
  role: { id: string; user_id: string; role: string };
  profileName: string;
  onApprove: (userId: string, role: string) => void;
  onReject: (userId: string) => void;
  deleting: boolean;
}) {
  const [selectedRole, setSelectedRole] = useState<string>('member');

  return (
    <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{profileName}</p>
          <p className="text-xs text-muted-foreground">{role.user_id.substring(0, 8)}...</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Membro</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => onApprove(role.user_id, selectedRole)} className="h-8">
            <CheckCircle className="w-3 h-3 mr-1" /> Aprovar
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onReject(role.user_id)} className="h-8" disabled={deleting}>
            <XCircle className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
