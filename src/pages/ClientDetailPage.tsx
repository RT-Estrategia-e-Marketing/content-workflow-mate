import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useProfiles } from '@/hooks/useProfiles';
import { useUserRole } from '@/hooks/useUserRole';
import KanbanBoard from '@/components/KanbanBoard';
import { ArrowLeft, Plus, X, Edit2, Upload, GripVertical, Trash2 } from 'lucide-react';
import { useState, useRef, DragEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostType, Platform } from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import DatePicker from '@/components/DatePicker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { clients, addPost, updateClient, deleteClient } = useApp();
  const { profiles } = useProfiles();
  const { isAdmin } = useUserRole();
  const client = clients.find(c => c.id === clientId);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [type, setType] = useState<PostType>('image');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [date, setDate] = useState('');
  const [mainImage, setMainImage] = useState('');
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const [reelsCover, setReelsCover] = useState('');
  const [reelsVideo, setReelsVideo] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const multiFileRef = useRef<HTMLInputElement>(null);

  const [editName, setEditName] = useState('');
  const [editLogo, setEditLogo] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

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

  const handleCarouselDragStart = (e: DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCarouselDrop = (e: DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) return;
    const newImages = [...carouselImages];
    const [moved] = newImages.splice(dragIdx, 1);
    newImages.splice(targetIdx, 0, moved);
    setCarouselImages(newImages);
    setDragIdx(null);
  };

  const handleMultiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const uploads: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} muito grande`); continue; }
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const { error } = await supabase.storage.from('post-media').upload(path, file);
      if (error) { toast.error(`Erro: ${file.name}`); continue; }
      const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path);
      uploads.push(publicUrl);
    }
    setCarouselImages(prev => [...prev, ...uploads]);
    if (uploads.length > 0) toast.success(`${uploads.length} imagem(ns) adicionada(s)`);
  };

  const handleAdd = () => {
    if (!title.trim() || !clientId) return;
    let imageUrl = '';
    let images: string[] | undefined;
    let videoUrl: string | undefined;
    if (type === 'image') { imageUrl = mainImage; }
    else if (type === 'carousel' || type === 'story') { imageUrl = carouselImages[0] || ''; images = carouselImages; }
    else if (type === 'reels') { imageUrl = reelsCover; videoUrl = reelsVideo; }

    addPost({ clientId, title: title.trim(), caption: type === 'story' ? '' : caption, imageUrl, images, videoUrl, type, platform, stage: 'content', scheduledDate: date || new Date().toISOString().split('T')[0], assignedTo: assignedTo || undefined });
    setTitle(''); setCaption(''); setDate(''); setMainImage('');
    setCarouselImages([]); setReelsCover(''); setReelsVideo('');
    setAssignedTo(''); setOpen(false);
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
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="md:h-10 md:px-4">
                <Plus className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Novo Post</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Criar Post</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input placeholder="Título do post" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
                {type !== 'story' && (
                  <Textarea placeholder="Legenda..." value={caption} onChange={e => setCaption(e.target.value)} rows={4} maxLength={2200} />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Select value={type} onValueChange={(v) => { setType(v as PostType); setMainImage(''); setCarouselImages([]); setReelsCover(''); setReelsVideo(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="reels">Reels</SelectItem>
                      <SelectItem value="carousel">Carrossel</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="both">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {type === 'image' && (
                  <FileUpload bucket="post-media" onUpload={setMainImage} label="Upload da imagem do post" preview={mainImage} />
                )}
                {type === 'reels' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Capa do Reels</p>
                    <FileUpload bucket="post-media" onUpload={setReelsCover} label="Upload da capa" preview={reelsCover} />
                    <p className="text-xs text-muted-foreground font-medium">Vídeo do Reels</p>
                    <FileUpload bucket="post-media" onUpload={setReelsVideo} label="Upload do vídeo" preview={reelsVideo} accept="video/*" />
                  </div>
                )}
                {(type === 'carousel' || type === 'story') && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">{type === 'story' ? 'Cards do Story' : 'Imagens do Carrossel'}</p>
                    <input ref={multiFileRef} type="file" accept="image/*" multiple onChange={handleMultiFileUpload} className="hidden" />
                    <div className="grid grid-cols-3 gap-2">
                      {carouselImages.map((img, i) => (
                        <div key={i} draggable onDragStart={(e) => handleCarouselDragStart(e, i)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleCarouselDrop(e, i)} className={`relative group rounded-lg border-2 ${dragIdx === i ? 'border-primary opacity-50' : 'border-border'} overflow-hidden cursor-grab active:cursor-grabbing`}>
                          {img ? <img src={img} alt={`Slide ${i + 1}`} className="w-full aspect-square object-cover" /> : <div className="w-full aspect-square bg-muted flex items-center justify-center"><Upload className="w-4 h-4 text-muted-foreground" /></div>}
                          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-1">
                            <span className="bg-foreground/70 text-background text-[9px] rounded px-1">{i + 1}</span>
                            <button onClick={() => setCarouselImages(prev => prev.filter((_, idx) => idx !== i))} className="w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>
                          </div>
                          <GripVertical className="absolute bottom-1 right-1 w-3 h-3 text-foreground/40" />
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => multiFileRef.current?.click()} className="w-full text-xs">
                      <Upload className="w-3 h-3 mr-1" /> Adicionar Slides
                    </Button>
                  </div>
                )}
                <DatePicker value={date} onChange={setDate} />
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Responsável</p>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar responsável" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(m => <SelectItem key={m.user_id} value={m.user_id} className="text-xs">{m.full_name} · {m.job_title || m.priority}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} className="w-full">Criar Post</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
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
          <div className="mt-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              Você está prestes a excluir <strong className="text-foreground">{client.name}</strong> e todos os seus posts. Esta ação não pode ser desfeita.
            </p>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-2 block">
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

      <KanbanBoard clientId={clientId!} />
    </div>
  );
}
