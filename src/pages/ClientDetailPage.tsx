import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useProfiles } from '@/hooks/useProfiles';
import KanbanBoard from '@/components/KanbanBoard';
import { ArrowLeft, Plus, X, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostType, Platform } from '@/lib/types';
import FileUpload from '@/components/FileUpload';

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { clients, addPost, updateClient } = useApp();
  const { profiles } = useProfiles();
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

  // Edit client state
  const [editName, setEditName] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editUsePhoto, setEditUsePhoto] = useState(false);
  const [editEmoji, setEditEmoji] = useState('🏢');

  const EMOJI_OPTIONS = ['🏢', '🎨', '🍕', '📱', '🎵', '🏋️', '☕', '🚀', '💎', '🌿'];

  if (!client) return <p className="text-muted-foreground">Cliente não encontrado</p>;

  const openEditClient = () => {
    setEditName(client.name);
    const isUrl = client.logo.startsWith('http');
    setEditUsePhoto(isUrl);
    setEditLogo(isUrl ? client.logo : '');
    setEditEmoji(isUrl ? '🏢' : client.logo);
    setEditOpen(true);
  };

  const handleEditClient = () => {
    if (!editName.trim()) return;
    updateClient(client.id, {
      name: editName.trim(),
      logo: editUsePhoto && editLogo ? editLogo : editEmoji,
    });
    setEditOpen(false);
  };

  const handleAdd = () => {
    if (!title.trim() || !clientId) return;

    let imageUrl = '';
    let images: string[] | undefined;
    let videoUrl: string | undefined;

    if (type === 'image') {
      imageUrl = mainImage;
    } else if (type === 'carousel') {
      imageUrl = carouselImages[0] || '';
      images = carouselImages;
    } else if (type === 'reels') {
      imageUrl = reelsCover;
      videoUrl = reelsVideo;
    }

    addPost({
      clientId,
      title: title.trim(),
      caption,
      imageUrl,
      images,
      videoUrl,
      type,
      platform,
      stage: 'content',
      scheduledDate: date || new Date().toISOString().split('T')[0],
      assignedTo: assignedTo || undefined,
    });
    setTitle(''); setCaption(''); setDate(''); setMainImage('');
    setCarouselImages([]); setReelsCover(''); setReelsVideo('');
    setAssignedTo(''); setOpen(false);
  };

  return (
    <div className="animate-slide-in">
      <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {client.logo.startsWith('http') ? (
            <img src={client.logo} alt={client.name} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <span className="text-3xl">{client.logo}</span>
          )}
          <h1 className="text-3xl font-display font-bold text-foreground">{client.name}</h1>
          <Button variant="ghost" size="sm" onClick={openEditClient}>
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Novo Post</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Criar Post</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input placeholder="Título do post" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
                <Textarea placeholder="Legenda..." value={caption} onChange={e => setCaption(e.target.value)} rows={4} maxLength={2200} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={type} onValueChange={(v) => { setType(v as PostType); setMainImage(''); setCarouselImages([]); setReelsCover(''); setReelsVideo(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="reels">Reels</SelectItem>
                      <SelectItem value="carousel">Carrossel</SelectItem>
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

                {type === 'carousel' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Imagens do Carrossel</p>
                    <div className="grid grid-cols-2 gap-2">
                      {carouselImages.map((img, i) => (
                        <div key={i} className="relative">
                          <FileUpload bucket="post-media" onUpload={(url) => setCarouselImages(prev => prev.map((im, idx) => idx === i ? url : im))} label={`Slide ${i + 1}`} preview={img} />
                          <button onClick={() => setCarouselImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px] z-10">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCarouselImages(prev => [...prev, ''])} className="w-full text-xs">
                      + Adicionar Slide
                    </Button>
                  </div>
                )}

                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />

                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Responsável</p>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecionar responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(m => (
                        <SelectItem key={m.user_id} value={m.user_id} className="text-xs">
                          {m.full_name} · {m.job_title || m.priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleAdd} className="w-full">Criar Post</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Client Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input placeholder="Nome do cliente" value={editName} onChange={e => setEditName(e.target.value)} maxLength={100} />
            <div>
              <div className="flex gap-2 mb-2">
                <button onClick={() => setEditUsePhoto(false)} className={`text-xs px-3 py-1 rounded-full transition-colors ${!editUsePhoto ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                  Emoji
                </button>
                <button onClick={() => setEditUsePhoto(true)} className={`text-xs px-3 py-1 rounded-full transition-colors ${editUsePhoto ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                  Foto
                </button>
              </div>
              {editUsePhoto ? (
                <FileUpload bucket="client-logos" onUpload={setEditLogo} label="Upload logo do cliente" preview={editLogo} />
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {EMOJI_OPTIONS.map(e => (
                    <button key={e} onClick={() => setEditEmoji(e)} className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${editEmoji === e ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary hover:bg-secondary/80'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleEditClient} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <KanbanBoard clientId={clientId!} />
    </div>
  );
}
