import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useProfiles } from '@/hooks/useProfiles';
import { useUserRole } from '@/hooks/useUserRole';
import KanbanBoard from '@/components/KanbanBoard';
import { ArrowLeft, Plus, X, Edit2, Upload, GripVertical, Trash2 } from 'lucide-react';
import { useState, useRef, DragEvent } from 'react';
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostType, Platform } from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import DatePicker from '@/components/DatePicker';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import MetaIcon from '@/components/icons/MetaIcon';
import NewPostModal from '@/components/NewPostModal';

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { clients, addPost, updateClient, deleteClient } = useApp();
  const { profiles } = useProfiles();
  const { isAdmin } = useUserRole();
  const client = clients.find(c => c.id === clientId);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');

  const [editName, setEditName] = useState('');
  const [editLogo, setEditLogo] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const [metaOpen, setMetaOpen] = useState(false);
  const [metaPageId, setMetaPageId] = useState('');
  const [metaIgAccountId, setMetaIgAccountId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');

  // Meta Graph API states
  const [metaPages, setMetaPages] = useState<{ id: string, name: string, access_token: string }[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [metaAppId] = useState(import.meta.env.VITE_META_APP_ID || 'SEU_APP_ID');

  if (!client) return <p className="text-muted-foreground">Cliente não encontrado</p>;

  const openEditClient = () => {
    setEditName(client.name);
    setEditLogo(client.logo && client.logo.startsWith('http') ? client.logo : '');
    setEditOpen(true);
  };

  const handleEditClient = () => {
    if (!editName.trim()) return;
    updateClient(client.id, { name: editName.trim(), logo: editLogo || '' });
    setEditOpen(false);
  };

  const openMetaDialog = () => {
    setMetaPageId(client.meta_page_id || '');
    setMetaIgAccountId(client.meta_ig_account_id || '');
    setMetaAccessToken(client.meta_access_token || '');
    setMetaPages([]);
    setMetaOpen(true);
  };

  const handleSaveMeta = () => {
    updateClient(client.id, {
      meta_page_id: metaPageId.trim(),
      meta_ig_account_id: metaIgAccountId.trim(),
      meta_access_token: metaAccessToken.trim()
    });
    setMetaOpen(false);
    toast.success('Integração com Meta atualizada');
  };

  const handleFacebookLogin = async (response: any) => {
    if (response.accessToken) {
      setMetaAccessToken(response.accessToken);
      toast.success('Login com Facebook realizado! Buscando páginas...');

      setLoadingPages(true);
      try {
        const res = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${response.accessToken}`);
        const data = await res.json();

        if (data.data && data.data.length > 0) {
          setMetaPages(data.data);
          toast.success(`${data.data.length} páginas encontradas.`);
        } else {
          toast.info('Nenhuma página do Facebook encontrada para este usuário.');
        }
      } catch (err) {
        console.error('Erro ao buscar páginas do Meta:', err);
        toast.error('Erro ao buscar as páginas.');
      } finally {
        setLoadingPages(false);
      }
    } else {
      toast.error('Erro ao fazer login no Facebook');
    }
  };

  const handleSelectMetaPage = async (pageId: string) => {
    setMetaPageId(pageId);

    // Find the specific page token from the selected page
    const selectedPage = metaPages.find(p => p.id === pageId);
    if (selectedPage && selectedPage.access_token) {
      setMetaAccessToken(selectedPage.access_token);

      // Fetch IG Account ID
      try {
        const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${selectedPage.access_token}`);
        const data = await res.json();

        if (data.instagram_business_account?.id) {
          setMetaIgAccountId(data.instagram_business_account.id);
          toast.success('Conta do Instagram vinculada encontrada!');
        } else {
          setMetaIgAccountId('');
          toast.info('Nenhuma Conta Profissional do Instagram vinculada à esta página.');
        }
      } catch (err) {
        console.error('Erro ao buscar IG Account:', err);
        setMetaIgAccountId('');
      }
    }
  };

  const isUrl = client.logo && client.logo.startsWith('http');

  return (
    <div className="animate-slide-in">
      <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors active:scale-95">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {isUrl ? (
            <img src={client.logo} alt={client.name} className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-contain flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
              {client.name.charAt(0)}
            </div>
          )}
          <h1 className="text-xl md:text-3xl font-display font-bold text-foreground truncate">{client.name}</h1>
          {isAdmin && (
            <>
              <Button variant="ghost" size="sm" onClick={openEditClient} className="flex-shrink-0">
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={openMetaDialog} className="flex-shrink-0" title="Integração Meta">
                <MetaIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDeleteConfirm(''); setDeleteOpen(true); }}
                className="flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
        {/* All approved users can create posts */}
        <NewPostModal
          clientId={clientId!}
          open={open}
          onOpenChange={setOpen}
          trigger={
            <Button size="sm" className="md:h-10 md:px-4">
              <Plus className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Novo Post</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          }
        />
      </div>

      {/* Edit Client Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Editar Cliente</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <Input placeholder="Nome do cliente" value={editName} onChange={e => setEditName(e.target.value)} maxLength={100} />
            <FileUpload bucket="client-logos" onUpload={setEditLogo} label="Upload logo do cliente" preview={editLogo} />
            <Button onClick={handleEditClient} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Client Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Excluir Cliente</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-5">
            <p className="text-sm text-muted-foreground">
              Você está prestes a excluir <strong className="text-foreground">{client.name}</strong> e todos os seus posts. Esta ação não pode ser desfeita.
            </p>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-3 block">
                Digite <strong className="text-destructive">EXCLUIR</strong> para confirmar
              </label>
              <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="EXCLUIR" className="font-mono" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} className="flex-1">Cancelar</Button>
              <Button variant="destructive" onClick={() => { deleteClient(client.id); navigate('/clients'); }} disabled={deleteConfirm !== 'EXCLUIR'} className="flex-1">
                Excluir Cliente
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
              <MetaIcon className="w-6 h-6 text-foreground" /> Integração Meta (Setup)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Para vincular este cliente ao Meta, faça login com a conta do Facebook que gerencia a Página e o Instagram correspondentes.
            </p>

            <FacebookLogin
              appId={metaAppId}
              autoLoad={false}
              fields="name,email,picture,accounts"
              scope="pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish"
              callback={handleFacebookLogin}
              render={renderProps => (
                <Button
                  onClick={renderProps.onClick}
                  variant="outline"
                  className="w-full font-semibold flex items-center justify-center gap-2"
                >
                  <MetaIcon className="w-5 h-5 mr-2" />
                  {metaPages.length > 0 ? "Reconectar com Meta" : "Conectar com Meta"}
                </Button>
              )}
            />

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
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">
                    Se o ID acima estiver vazio, verifique se a sua Página do Facebook está conectada a uma Conta Profissional do Instagram.
                  </p>
                </div>
              </div>
            )}

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou insira manualmente</span></div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Access Token (Page)</label>
              <Input placeholder="EAAG..." value={metaAccessToken} onChange={e => setMetaAccessToken(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">ID da Página (Facebook)</label>
              <Input placeholder="1234567890..." value={metaPageId} onChange={e => setMetaPageId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">ID da Conta Profissional (Instagram)</label>
              <Input placeholder="178414..." value={metaIgAccountId} onChange={e => setMetaIgAccountId(e.target.value)} />
            </div>
            <Button onClick={handleSaveMeta} className="w-full hover:bg-primary/90">Salvar Configurações</Button>
          </div>
        </DialogContent>
      </Dialog>

      <KanbanBoard clientId={clientId!} />
    </div>
  );
}
