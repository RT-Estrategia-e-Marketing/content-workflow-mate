import { useApp } from '@/contexts/AppContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Trash2, Link2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import FileUpload from '@/components/FileUpload';
import MetaIcon from '@/components/icons/MetaIcon';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { clients, activeWorkspaceId, setActiveWorkspaceId, updateClient, deleteClient } = useApp();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  const activeClient = clients.find(c => c.id === activeWorkspaceId);

  const [editWorkspaceName, setEditWorkspaceName] = useState('');
  const [editWorkspaceLogo, setEditWorkspaceLogo] = useState('');
  const [savingWorkspace, setSavingWorkspace] = useState(false);

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

  useEffect(() => {
    const initFB = () => {
      const fb = (window as any).FB;
      if (fb) { fb.init({ appId: metaAppId, cookie: true, xfbml: true, version: 'v19.0' }); setFbStatus('loaded'); }
    };
    if (!(window as any).FB) {
      const script = document.createElement('script');
      script.src = "https://connect.facebook.net/pt_BR/sdk.js";
      script.async = true; script.defer = true; script.crossOrigin = "anonymous";
      script.onload = initFB; script.onerror = () => setFbStatus('error');
      document.head.appendChild(script);
    } else { initFB(); }
  }, [metaAppId]);

  useEffect(() => {
    if (activeClient) {
      setEditWorkspaceName(activeClient.name);
      setEditWorkspaceLogo(activeClient.logo && activeClient.logo.startsWith('http') ? activeClient.logo : '');
    }
  }, [activeClient?.id]);

  const handleSaveWorkspace = async () => {
    if (!activeClient || !editWorkspaceName.trim()) return;
    setSavingWorkspace(true);
    await updateClient(activeClient.id, { name: editWorkspaceName.trim(), logo: editWorkspaceLogo || '' });
    setSavingWorkspace(false);
    toast.success('Workspace atualizado!');
  };

  const handleDeleteWorkspace = async () => {
    if (!activeClient || deleteWorkspaceConfirm !== 'EXCLUIR') return;
    setDeletingWorkspace(true);
    try {
      await deleteClient(activeClient.id);
      const remaining = clients.filter(c => c.id !== activeClient.id);
      if (remaining.length > 0) setActiveWorkspaceId(remaining[0].id);
      setDeleteWorkspaceOpen(false);
      navigate('/');
    } catch { toast.error('Erro ao excluir workspace'); }
    setDeletingWorkspace(false);
  };

  const openMetaDialog = () => {
    if (!activeClient) return;
    setMetaPageId(activeClient.meta_page_id || '');
    setMetaPageName(activeClient.meta_page_name || '');
    setMetaIgAccountId(activeClient.meta_ig_account_id || '');
    setMetaIgAccountName(activeClient.meta_ig_account_name || '');
    setMetaAccessToken(activeClient.meta_access_token || '');
    setMetaAdsAccountId(activeClient.meta_ads_account_id || '');
    setMetaUserToken(activeClient.meta_user_token || '');
    setMetaPages([]); setMetaOpen(true);
  };

  const handleSaveMeta = () => {
    if (!activeClient) return;
    updateClient(activeClient.id, {
      meta_page_id: metaPageId.trim(), meta_page_name: metaPageName.trim(),
      meta_ig_account_id: metaIgAccountId.trim(), meta_ig_account_name: metaIgAccountName.trim(),
      meta_access_token: metaAccessToken.trim(), meta_ads_account_id: metaAdsAccountId.trim(),
      meta_user_token: metaUserToken.trim(),
    });
    setMetaOpen(false); toast.success('Integração com Meta atualizada');
  };

  const handleDisconnectMeta = () => {
    if (!activeClient) return;
    updateClient(activeClient.id, {
      meta_page_id: '', meta_page_name: '', meta_ig_account_id: '', meta_ig_account_name: '',
      meta_access_token: '', meta_ads_account_id: '', meta_user_token: '',
    });
    setMetaPageId(''); setMetaPageName(''); setMetaIgAccountId(''); setMetaIgAccountName('');
    setMetaAccessToken(''); setMetaAdsAccountId(''); setMetaUserToken('');
    setMetaPages([]); setMetaAdAccounts([]); setMetaOpen(false);
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
          setMetaPages(exchangeData.data); toast.success(`${exchangeData.data.length} páginas encontradas.`);
        } else { toast.info('Nenhuma página do Facebook encontrada.'); }
        try {
          const adsRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id&limit=100&access_token=${response.accessToken}`);
          const adsData = await adsRes.json();
          if (adsData.data && adsData.data.length > 0) { setMetaAdAccounts(adsData.data); toast.success(`${adsData.data.length} contas de anúncio encontradas.`); }
        } catch { }
      } catch (err: any) { toast.error(`Falha na conexão: ${err.message || 'Erro desconhecido'}.`); }
      finally { setLoadingPages(false); }
    } else { toast.error('Erro ao fazer login no Facebook'); }
  };

  const handleSelectMetaPage = async (pageId: string) => {
    setMetaPageId(pageId);
    const selectedPage = metaPages.find(p => p.id === pageId);
    if (selectedPage && selectedPage.access_token) {
      setMetaAccessToken(selectedPage.access_token); setMetaPageName(selectedPage.name);
      try {
        const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account{id,username}&access_token=${selectedPage.access_token}`);
        const data = await res.json();
        if (data.instagram_business_account?.id) {
          setMetaIgAccountId(data.instagram_business_account.id);
          setMetaIgAccountName(data.instagram_business_account.username || 'Conta Instagram');
          toast.success('Conta do Instagram vinculada encontrada!');
        } else { setMetaIgAccountId(''); setMetaIgAccountName(''); toast.info('Nenhuma Conta Profissional do Instagram vinculada.'); }
      } catch { setMetaIgAccountId(''); setMetaIgAccountName(''); }
    }
  };

  // No workspace or not admin — empty state
  if (!activeClient) {
    return (
      <div className="animate-slide-in flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Building2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Nenhum workspace selecionado</h1>
        <p className="text-muted-foreground max-w-sm">
          Selecione um workspace na barra lateral para gerenciar suas configurações.
        </p>
      </div>
    );
  }

  const activeIsUrl = activeClient.logo && activeClient.logo.startsWith('http');

  return (
    <div className="animate-slide-in max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-primary/10 border border-border">
          {activeIsUrl ? (
            <img src={activeClient.logo} alt={activeClient.name} className="w-full h-full object-contain" />
          ) : (
            <span className="text-xl font-bold text-primary">{activeClient.name.charAt(0)}</span>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground leading-tight">{activeClient.name}</h1>
          <p className="text-muted-foreground text-sm">Configurações do workspace</p>
        </div>
      </div>

      {/* Workspace Info */}
      <section className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <h2 className="font-display font-bold text-lg text-card-foreground mb-5">Informações</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Nome do Workspace</label>
            <Input
              placeholder="Nome do workspace"
              value={editWorkspaceName}
              onChange={e => setEditWorkspaceName(e.target.value)}
              maxLength={100}
              disabled={!isAdmin}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Logo</label>
            {isAdmin ? (
              <FileUpload
                bucket="client-logos"
                onUpload={setEditWorkspaceLogo}
                label="Upload logo"
                preview={editWorkspaceLogo}
              />
            ) : (
              <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-primary/10 border border-border">
                {editWorkspaceLogo ? (
                  <img src={editWorkspaceLogo} alt={editWorkspaceName} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xl font-bold text-primary">{editWorkspaceName.charAt(0)}</span>
                )}
              </div>
            )}
          </div>
          {isAdmin && (
            <Button onClick={handleSaveWorkspace} disabled={savingWorkspace} className="w-full">
              {savingWorkspace ? 'Salvando...' : 'Salvar Informações'}
            </Button>
          )}
        </div>
      </section>

      {/* Meta Integration */}
      <section className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-display font-bold text-lg text-card-foreground flex items-center gap-2">
              <MetaIcon className="w-5 h-5" /> Integração Meta
            </h2>
            {activeClient.meta_page_name ? (
              <p className="text-xs text-muted-foreground mt-1">
                Conectado: <span className="text-foreground font-medium">{activeClient.meta_page_name}</span>
                {activeClient.meta_ig_account_name && ` · @${activeClient.meta_ig_account_name}`}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Não conectado ao Meta</p>
            )}
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={openMetaDialog} className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              {activeClient.meta_page_id ? 'Gerenciar' : 'Conectar'}
            </Button>
          )}
        </div>
      </section>

      {/* Danger Zone — Admin only */}
      {isAdmin && (
        <section className="bg-card rounded-xl border border-destructive/30 shadow-sm p-6 mb-6">
          <h2 className="font-display font-bold text-lg text-destructive mb-1">Zona de Perigo</h2>
          <p className="text-xs text-muted-foreground mb-4">Ações irreversíveis para este workspace.</p>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Excluir Workspace</p>
              <p className="text-xs text-muted-foreground">Remove o workspace e todos os posts permanentemente.</p>
            </div>
            <Button
              variant="destructive" size="sm"
              onClick={() => { setDeleteWorkspaceConfirm(''); setDeleteWorkspaceOpen(true); }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Excluir
            </Button>
          </div>
        </section>
      )}

      {/* Delete Workspace Dialog */}
      <Dialog open={deleteWorkspaceOpen} onOpenChange={setDeleteWorkspaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Excluir Workspace</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-5">
            <p className="text-sm text-muted-foreground">
              Você está prestes a excluir <strong className="text-foreground">{activeClient.name}</strong>. Esta ação não pode ser desfeita.
            </p>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-3 block">
                Digite <strong className="text-destructive">EXCLUIR</strong> para confirmar
              </label>
              <Input value={deleteWorkspaceConfirm} onChange={e => setDeleteWorkspaceConfirm(e.target.value)} placeholder="EXCLUIR" className="font-mono" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteWorkspaceOpen(false)} className="flex-1">Cancelar</Button>
              <Button variant="destructive" onClick={handleDeleteWorkspace} disabled={deleteWorkspaceConfirm !== 'EXCLUIR' || deletingWorkspace} className="flex-1">
                {deletingWorkspace ? 'Excluindo...' : 'Excluir Workspace'}
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
            <DialogDescription>Conecte sua conta do Facebook para gerenciar postagens.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {activeClient.meta_page_name && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MetaIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">Conectado ao Meta</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    <strong>Página:</strong> {activeClient.meta_page_name}
                  </p>
                  {activeClient.meta_ig_account_name && (
                    <p className="text-muted-foreground text-xs mt-0.5">
                      <strong>Instagram:</strong> @{activeClient.meta_ig_account_name}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleDisconnectMeta} className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0">
                  Desconectar
                </Button>
              </div>
            )}

            {!activeClient.meta_page_name && (
              <p className="text-sm text-muted-foreground">
                Faça login com a conta do Facebook que gerencia a Página e o Instagram deste workspace.
              </p>
            )}

            <Button onClick={handleManualLogin} variant="outline" className="w-full font-semibold flex items-center justify-center gap-2">
              <MetaIcon className="w-5 h-5 mr-2" />
              {activeClient.meta_page_id ? "Reconectar com Meta" : "Conectar com Meta"}
            </Button>

            {(metaPages.length > 0 || loadingPages) && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Selecionar Página do Facebook</label>
                  <Select value={metaPageId} onValueChange={handleSelectMetaPage} disabled={loadingPages}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingPages ? "Buscando..." : "Selecione uma Página"} />
                    </SelectTrigger>
                    <SelectContent>
                      {metaPages.map(page => (
                        <SelectItem key={page.id} value={page.id}>{page.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Instagram Detectado</label>
                  <Input placeholder="Nenhuma conta detectada" value={metaIgAccountId} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Conta de Anúncios</label>
                  {metaAdAccounts.length > 0 ? (
                    <Select value={metaAdsAccountId} onValueChange={setMetaAdsAccountId}>
                      <SelectTrigger><SelectValue placeholder="Selecione a conta de anúncios" /></SelectTrigger>
                      <SelectContent>
                        {metaAdAccounts.map(adAcc => (
                          <SelectItem key={adAcc.id} value={adAcc.id}>{adAcc.name || adAcc.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input placeholder="Ex: 1234567890" value={metaAdsAccountId} onChange={e => setMetaAdsAccountId(e.target.value)} />
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
    </div>
  );
}
