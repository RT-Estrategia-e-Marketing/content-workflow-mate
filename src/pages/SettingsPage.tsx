import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useUserRole } from '@/hooks/useUserRole';
import { useApp } from '@/contexts/AppContext';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Sun, Moon, UserPlus, LogOut, ShieldCheck, Clock, CheckCircle, XCircle, Trash2,
  Eye, EyeOff, KeyRound, Building2, Image as ImageIcon, Link2, Link2Off
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { db, secondaryAuth, functions } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import FileUpload from '@/components/FileUpload';
import MetaIcon from '@/components/icons/MetaIcon';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { profiles, refetch } = useProfiles();
  const { allRoles, isAdmin, approveUser, rejectUser, refetch: refetchRoles } = useUserRole();
  const { clients, activeWorkspaceId, setActiveWorkspaceId, updateClient, deleteClient } = useApp();
  const navigate = useNavigate();

  const activeClient = clients.find(c => c.id === activeWorkspaceId);

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

  // Workspace settings state
  const [editWorkspaceName, setEditWorkspaceName] = useState('');
  const [editWorkspaceLogo, setEditWorkspaceLogo] = useState('');
  const [savingWorkspace, setSavingWorkspace] = useState(false);

  // Delete workspace state
  const [deleteWorkspaceOpen, setDeleteWorkspaceOpen] = useState(false);
  const [deleteWorkspaceConfirm, setDeleteWorkspaceConfirm] = useState('');
  const [deletingWorkspace, setDeletingWorkspace] = useState(false);

  // Meta Integration state
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaPageId, setMetaPageId] = useState('');
  const [metaPageName, setMetaPageName] = useState('');
  const [metaIgAccountId, setMetaIgAccountId] = useState('');
  const [metaIgAccountName, setMetaIgAccountName] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaAdsAccountId, setMetaAdsAccountId] = useState('');
  const [metaUserToken, setMetaUserToken] = useState('');
  const [metaPages, setMetaPages] = useState<{ id: string, name: string, access_token: string }[]>([]);
  const [metaAdAccounts, setMetaAdAccounts] = useState<{ id: string, name: string, account_id: string }[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [metaAppId] = useState(import.meta.env.VITE_META_APP_ID || '2479723212497865');
  const [fbStatus, setFbStatus] = useState<'pending' | 'loaded' | 'error'>('pending');

  // Init Meta SDK
  useEffect(() => {
    const initFB = () => {
      const fb = (window as any).FB;
      if (fb) {
        fb.init({ appId: metaAppId, cookie: true, xfbml: true, version: 'v19.0' });
        setFbStatus('loaded');
      }
    };
    if (!(window as any).FB) {
      const script = document.createElement('script');
      script.src = "https://connect.facebook.net/pt_BR/sdk.js";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.onload = initFB;
      script.onerror = () => setFbStatus('error');
      document.head.appendChild(script);
    } else {
      initFB();
    }
  }, [metaAppId]);

  // Sync workspace fields when activeClient changes
  useEffect(() => {
    if (activeClient) {
      setEditWorkspaceName(activeClient.name);
      setEditWorkspaceLogo(activeClient.logo && activeClient.logo.startsWith('http') ? activeClient.logo : '');
    }
  }, [activeClient?.id]);

  // --- Workspace handlers ---
  const handleSaveWorkspace = async () => {
    if (!activeClient || !editWorkspaceName.trim()) return;
    setSavingWorkspace(true);
    await updateClient(activeClient.id, {
      name: editWorkspaceName.trim(),
      logo: editWorkspaceLogo || '',
    });
    setSavingWorkspace(false);
    toast.success('Workspace atualizado!');
  };

  const handleDeleteWorkspace = async () => {
    if (!activeClient || deleteWorkspaceConfirm !== 'EXCLUIR') return;
    setDeletingWorkspace(true);
    try {
      await deleteClient(activeClient.id);
      // Select next available workspace
      const remaining = clients.filter(c => c.id !== activeClient.id);
      if (remaining.length > 0) {
        setActiveWorkspaceId(remaining[0].id);
      }
      setDeleteWorkspaceOpen(false);
      navigate('/');
    } catch (err) {
      toast.error('Erro ao excluir workspace');
    }
    setDeletingWorkspace(false);
  };

  // --- Meta handlers ---
  const openMetaDialog = () => {
    if (!activeClient) return;
    setMetaPageId(activeClient.meta_page_id || '');
    setMetaPageName(activeClient.meta_page_name || '');
    setMetaIgAccountId(activeClient.meta_ig_account_id || '');
    setMetaIgAccountName(activeClient.meta_ig_account_name || '');
    setMetaAccessToken(activeClient.meta_access_token || '');
    setMetaAdsAccountId(activeClient.meta_ads_account_id || '');
    setMetaUserToken(activeClient.meta_user_token || '');
    setMetaPages([]);
    setMetaOpen(true);
  };

  const handleSaveMeta = () => {
    if (!activeClient) return;
    updateClient(activeClient.id, {
      meta_page_id: metaPageId.trim(),
      meta_page_name: metaPageName.trim(),
      meta_ig_account_id: metaIgAccountId.trim(),
      meta_ig_account_name: metaIgAccountName.trim(),
      meta_access_token: metaAccessToken.trim(),
      meta_ads_account_id: metaAdsAccountId.trim(),
      meta_user_token: metaUserToken.trim(),
    });
    setMetaOpen(false);
    toast.success('Integração com Meta atualizada');
  };

  const handleDisconnectMeta = () => {
    if (!activeClient) return;
    updateClient(activeClient.id, {
      meta_page_id: '', meta_page_name: '',
      meta_ig_account_id: '', meta_ig_account_name: '',
      meta_access_token: '', meta_ads_account_id: '', meta_user_token: '',
    });
    setMetaPageId(''); setMetaPageName(''); setMetaIgAccountId('');
    setMetaIgAccountName(''); setMetaAccessToken(''); setMetaAdsAccountId('');
    setMetaUserToken(''); setMetaPages([]); setMetaAdAccounts([]);
    setMetaOpen(false);
    toast.success('Workspace desconectado do Meta');
  };

  const handleManualLogin = () => {
    const fb = (window as any).FB;
    if (!fb) { toast.error("Motor de login não carregou."); return; }
    fb.login((r: any) => {
      if (r.authResponse) handleFacebookLogin({ accessToken: r.authResponse.accessToken });
    }, {
      scope: 'pages_show_list,pages_manage_posts,pages_read_engagement,pages_read_user_content,read_insights,instagram_basic,instagram_content_publish,instagram_manage_insights,business_management,ads_read'
    });
  };

  const handleFacebookLogin = async (response: any) => {
    if (response.accessToken) {
      toast.info('Login com Facebook realizado! Obtendo conexões permanentes...');
      setLoadingPages(true);
      try {
        const exchangeMetaToken = httpsCallable(functions, 'exchangeMetaToken');
        const result = await exchangeMetaToken({ shortLivedToken: response.accessToken });
        const exchangeData = result.data as any;
        if (exchangeData.userToken) setMetaUserToken(exchangeData.userToken);
        if (exchangeData.data && exchangeData.data.length > 0) {
          setMetaPages(exchangeData.data);
          toast.success(`${exchangeData.data.length} páginas encontradas.`);
        } else {
          toast.info('Nenhuma página do Facebook encontrada.');
        }
        try {
          const adsRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id&limit=100&access_token=${response.accessToken}`);
          const adsData = await adsRes.json();
          if (adsData.data && adsData.data.length > 0) {
            setMetaAdAccounts(adsData.data);
            toast.success(`${adsData.data.length} contas de anúncio encontradas.`);
          }
        } catch (adsErr) { console.error("Erro ao buscar contas de anúncio:", adsErr); }
      } catch (err: any) {
        toast.error(`Falha na conexão: ${err.message || 'Erro desconhecido'}.`);
      } finally {
        setLoadingPages(false);
      }
    } else {
      toast.error('Erro ao fazer login no Facebook');
    }
  };

  const handleSelectMetaPage = async (pageId: string) => {
    setMetaPageId(pageId);
    const selectedPage = metaPages.find(p => p.id === pageId);
    if (selectedPage && selectedPage.access_token) {
      setMetaAccessToken(selectedPage.access_token);
      setMetaPageName(selectedPage.name);
      try {
        const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account{id,username}&access_token=${selectedPage.access_token}`);
        const data = await res.json();
        if (data.instagram_business_account?.id) {
          setMetaIgAccountId(data.instagram_business_account.id);
          setMetaIgAccountName(data.instagram_business_account.username || 'Conta Instagram');
          toast.success('Conta do Instagram vinculada encontrada!');
        } else {
          setMetaIgAccountId(''); setMetaIgAccountName('');
          toast.info('Nenhuma Conta Profissional do Instagram vinculada à esta página.');
        }
      } catch (err) {
        setMetaIgAccountId(''); setMetaIgAccountName('');
      }
    }
  };

  // --- Team handlers ---
  const handleAddMember = async () => {
    if (!newEmail.trim() || !newPassword.trim() || !newName.trim()) return;
    if (newPassword !== newPasswordConfirm) { toast.error('As senhas não coincidem'); return; }
    if (newPassword.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newEmail.trim(), newPassword);
      const uid = cred.user.uid;
      await setDoc(doc(db, 'profiles', uid), {
        user_id: uid, full_name: newName.trim(), job_title: newJobTitle.trim(),
        priority: 'member', created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      });
      await setDoc(doc(db, 'user_roles', uid), {
        user_id: uid, role: newRole, approved: true, created_at: new Date().toISOString()
      });
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
      toast.success('Perfil excluído.');
      setDeleteUserOpen(false);
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err.message || ''));
    }
    setDeleting(false);
  };

  const openDeleteUser = (userId: string, name: string) => {
    setDeleteUserId(userId); setDeleteUserName(name); setDeleteUserConfirm(''); setDeleteUserOpen(true);
  };

  const openChangePassword = (userId: string, name: string) => {
    setChangePassUserId(userId); setChangePassUserName(name);
    setChangePassValue(''); setChangePassConfirm(''); setShowChangePass(false); setChangePassOpen(true);
  };

  const handleChangePassword = async () => {
    if (!changePassUserId || !changePassValue.trim()) return;
    if (changePassValue !== changePassConfirm) { toast.error('As senhas não coincidem'); return; }
    if (changePassValue.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }
    setChangingPass(true);
    toast.error('Aviso: Alterar senha de outro usuário requer Firebase Admin SDK (Backend).');
    setChangePassOpen(false);
    setChangingPass(false);
  };

  const pendingRoles = allRoles.filter(r => !r.approved);
  const approvedRoles = allRoles.filter(r => r.approved);

  const activeIsUrl = activeClient?.logo && activeClient.logo.startsWith('http');

  return (
    <div className="animate-slide-in max-w-2xl">
      <h1 className="text-3xl font-display font-bold text-foreground mb-1">Configurações</h1>
      <p className="text-muted-foreground mb-8">Configurações gerais do aplicativo</p>

      {/* === WORKSPACE ATIVO === */}
      {activeClient && isAdmin && (
        <section className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
          <h2 className="font-display font-bold text-lg text-card-foreground mb-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Workspace Ativo
          </h2>
          <p className="text-xs text-muted-foreground mb-5">Configurações do workspace selecionado na sidebar.</p>

          {/* Logo Preview + Upload */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center bg-primary/10 border border-border flex-shrink-0">
              {editWorkspaceLogo ? (
                <img src={editWorkspaceLogo} alt={editWorkspaceName} className="w-full h-full object-contain" />
              ) : (
                <span className="text-2xl font-bold text-primary">{editWorkspaceName.charAt(0) || '?'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{editWorkspaceName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Workspace ativo</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Nome do Workspace</label>
              <Input
                placeholder="Nome do workspace"
                value={editWorkspaceName}
                onChange={e => setEditWorkspaceName(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Logo */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Logo do Workspace</label>
              <FileUpload
                bucket="client-logos"
                onUpload={setEditWorkspaceLogo}
                label="Upload logo"
                preview={editWorkspaceLogo}
              />
            </div>

            <Button onClick={handleSaveWorkspace} disabled={savingWorkspace} className="w-full">
              {savingWorkspace ? 'Salvando...' : 'Salvar Informações'}
            </Button>
          </div>

          {/* Meta Integration */}
          <div className="border-t border-border mt-6 pt-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                  <MetaIcon className="w-4 h-4" /> Integração Meta
                </h3>
                {activeClient.meta_page_name ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Conectado: <span className="text-foreground font-medium">{activeClient.meta_page_name}</span>
                    {activeClient.meta_ig_account_name && ` · @${activeClient.meta_ig_account_name}`}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">Não conectado ao Meta</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={openMetaDialog}
                className="flex items-center gap-1.5"
              >
                {activeClient.meta_page_id ? (
                  <><Link2 className="w-3.5 h-3.5" /> Gerenciar</>
                ) : (
                  <><Link2 className="w-3.5 h-3.5" /> Conectar</>
                )}
              </Button>
            </div>
          </div>

          {/* Delete Workspace */}
          <div className="border-t border-border mt-5 pt-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-destructive">Excluir Workspace</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Remove o workspace e todos os seus posts permanentemente.</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setDeleteWorkspaceConfirm(''); setDeleteWorkspaceOpen(true); }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Excluir
              </Button>
            </div>
          </div>
        </section>
      )}

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
                          variant="ghost" size="sm"
                          onClick={() => openChangePassword(m.user_id, m.full_name)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="Alterar senha"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
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

      {/* Delete Workspace Dialog */}
      <Dialog open={deleteWorkspaceOpen} onOpenChange={setDeleteWorkspaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Excluir Workspace</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-5">
            <p className="text-sm text-muted-foreground">
              Você está prestes a excluir <strong className="text-foreground">{activeClient?.name}</strong> e todos os seus posts. Esta ação não pode ser desfeita.
            </p>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-3 block">
                Digite <strong className="text-destructive">EXCLUIR</strong> para confirmar
              </label>
              <Input
                value={deleteWorkspaceConfirm}
                onChange={e => setDeleteWorkspaceConfirm(e.target.value)}
                placeholder="EXCLUIR"
                className="font-mono"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteWorkspaceOpen(false)} className="flex-1">Cancelar</Button>
              <Button
                variant="destructive"
                onClick={handleDeleteWorkspace}
                disabled={deleteWorkspaceConfirm !== 'EXCLUIR' || deletingWorkspace}
                className="flex-1"
              >
                {deletingWorkspace ? 'Excluindo...' : 'Excluir Workspace'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Meta Integration Dialog */}
      <Dialog open={metaOpen} onOpenChange={setMetaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <MetaIcon className="w-6 h-6 text-foreground" /> Integração Meta
            </DialogTitle>
            <DialogDescription>
              Conecte sua conta do Facebook para gerenciar postagens e Instagram.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {activeClient?.meta_page_name && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MetaIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">Conectado ao Meta</p>
                  <p className="text-muted-foreground text-xs truncate mt-0.5">
                    <strong>Página:</strong> {activeClient.meta_page_name}
                  </p>
                  {activeClient.meta_ig_account_name && (
                    <p className="text-muted-foreground text-xs truncate mt-0.5">
                      <strong>Instagram:</strong> @{activeClient.meta_ig_account_name}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleDisconnectMeta} className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0">
                  Desconectar
                </Button>
              </div>
            )}

            {!activeClient?.meta_page_name && (
              <p className="text-sm text-muted-foreground">
                Para vincular este workspace ao Meta, faça login com a conta do Facebook que gerencia a Página e o Instagram correspondentes.
              </p>
            )}

            <Button onClick={handleManualLogin} variant="outline" className="w-full font-semibold flex items-center justify-center gap-2">
              <MetaIcon className="w-5 h-5 mr-2" />
              {activeClient?.meta_page_id ? "Reconectar com Meta" : "Conectar com Meta"}
            </Button>

            {(metaPages.length > 0 || loadingPages) && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Selecionar Página do Facebook</label>
                  <Select value={metaPageId} onValueChange={handleSelectMetaPage} disabled={loadingPages}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingPages ? "Buscando páginas..." : "Selecione uma Página"} />
                    </SelectTrigger>
                    <SelectContent>
                      {metaPages.map(page => (
                        <SelectItem key={page.id} value={page.id}>{page.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Conta do Instagram Detectada (ID)</label>
                  <Input
                    placeholder="Nenhuma conta de Instagram detectada"
                    value={metaIgAccountId}
                    onChange={e => setMetaIgAccountId(e.target.value)}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Conta de Anúncios</label>
                  {metaAdAccounts.length > 0 ? (
                    <Select value={metaAdsAccountId} onValueChange={setMetaAdsAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta de anúncios" />
                      </SelectTrigger>
                      <SelectContent>
                        {metaAdAccounts.map(adAcc => (
                          <SelectItem key={adAcc.id} value={adAcc.id}>{adAcc.name || adAcc.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Ex: 1234567890 (Inserir manualmente)"
                      value={metaAdsAccountId}
                      onChange={e => setMetaAdsAccountId(e.target.value)}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveMeta} className="w-full">
                Salvar {metaPages.length > 0 ? "Seleção" : "Configurações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer Links */}
      <div className="mt-12 pt-8 border-t border-border/50 flex flex-wrap gap-x-6 gap-y-2 opacity-50 hover:opacity-100 transition-opacity">
        <a href="/privacy" className="text-[10px] text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline">
          Política de Privacidade
        </a>
        <a href="/terms" className="text-[10px] text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline">
          Termos de Uso
        </a>
        <p className="text-[10px] text-muted-foreground ml-auto">
          © 2026 PostFlow
        </p>
      </div>
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
