import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import KanbanBoard from '@/components/KanbanBoard';
import { ArrowLeft, Plus, X } from 'lucide-react';
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
  const { clients, addPost } = useApp();
  const client = clients.find(c => c.id === clientId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [type, setType] = useState<PostType>('image');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [date, setDate] = useState('');
  const [mainImage, setMainImage] = useState('');
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const [reelsCover, setReelsCover] = useState('');

  if (!client) return <p className="text-muted-foreground">Cliente não encontrado</p>;

  const handleAdd = () => {
    if (!title.trim() || !clientId) return;

    let imageUrl = '';
    let images: string[] | undefined;

    if (type === 'image') {
      imageUrl = mainImage;
    } else if (type === 'carousel') {
      imageUrl = carouselImages[0] || '';
      images = carouselImages;
    } else if (type === 'reels') {
      imageUrl = reelsCover;
    }

    addPost({
      clientId,
      title: title.trim(),
      caption,
      imageUrl,
      images,
      type,
      platform,
      stage: 'content',
      scheduledDate: date || new Date().toISOString().split('T')[0],
    });
    setTitle('');
    setCaption('');
    setDate('');
    setMainImage('');
    setCarouselImages([]);
    setReelsCover('');
    setOpen(false);
  };

  const addCarouselSlot = () => {
    setCarouselImages(prev => [...prev, '']);
  };

  const updateCarouselImage = (index: number, url: string) => {
    setCarouselImages(prev => prev.map((img, i) => i === index ? url : img));
  };

  const removeCarouselImage = (index: number) => {
    setCarouselImages(prev => prev.filter((_, i) => i !== index));
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
        </div>
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
                <Select value={type} onValueChange={(v) => { setType(v as PostType); setMainImage(''); setCarouselImages([]); setReelsCover(''); }}>
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
                  </SelectContent>
                </Select>
              </div>

              {/* Upload section based on type */}
              {type === 'image' && (
                <FileUpload
                  bucket="post-media"
                  onUpload={setMainImage}
                  label="Upload da imagem do post"
                  preview={mainImage}
                />
              )}

              {type === 'reels' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Capa do Reels</p>
                  <FileUpload
                    bucket="post-media"
                    onUpload={setReelsCover}
                    label="Upload da capa do Reels"
                    preview={reelsCover}
                  />
                </div>
              )}

              {type === 'carousel' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Imagens do Carrossel</p>
                  <div className="grid grid-cols-2 gap-2">
                    {carouselImages.map((img, i) => (
                      <div key={i} className="relative">
                        <FileUpload
                          bucket="post-media"
                          onUpload={(url) => updateCarouselImage(i, url)}
                          label={`Slide ${i + 1}`}
                          preview={img}
                        />
                        <button
                          onClick={() => removeCarouselImage(i)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px] z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={addCarouselSlot} className="w-full text-xs">
                    + Adicionar Slide
                  </Button>
                </div>
              )}

              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              <Button onClick={handleAdd} className="w-full">Criar Post</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <KanbanBoard clientId={clientId!} />
    </div>
  );
}
