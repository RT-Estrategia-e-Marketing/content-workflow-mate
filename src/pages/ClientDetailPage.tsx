import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import KanbanBoard from '@/components/KanbanBoard';
import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostType, Platform } from '@/lib/types';

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

  if (!client) return <p className="text-muted-foreground">Cliente não encontrado</p>;

  const handleAdd = () => {
    if (!title.trim() || !clientId) return;
    addPost({
      clientId,
      title: title.trim(),
      caption,
      imageUrl: '',
      type,
      platform,
      stage: 'content',
      scheduledDate: date || new Date().toISOString().split('T')[0],
    });
    setTitle('');
    setCaption('');
    setDate('');
    setOpen(false);
  };

  return (
    <div className="animate-slide-in">
      <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{client.logo}</span>
          <h1 className="text-3xl font-display font-bold text-foreground">{client.name}</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Novo Post</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Criar Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input placeholder="Título do post" value={title} onChange={e => setTitle(e.target.value)} />
              <Textarea placeholder="Legenda..." value={caption} onChange={e => setCaption(e.target.value)} rows={4} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={type} onValueChange={(v) => setType(v as PostType)}>
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
