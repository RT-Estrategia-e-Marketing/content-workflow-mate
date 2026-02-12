import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const EMOJI_OPTIONS = ['🏢', '🎨', '🍕', '📱', '🎵', '🏋️', '☕', '🚀', '💎', '🌿'];

export default function ClientsPage() {
  const { clients, posts, addClient } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🏢');

  const handleAdd = () => {
    if (!name.trim()) return;
    addClient({ name: name.trim(), logo: selectedEmoji, color: `hsl(${Math.random() * 360}, 60%, 50%)` });
    setName('');
    setOpen(false);
  };

  return (
    <div className="animate-slide-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes e projetos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Adicionar Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input placeholder="Nome do cliente" value={name} onChange={e => setName(e.target.value)} />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Ícone</p>
                <div className="flex gap-2 flex-wrap">
                  {EMOJI_OPTIONS.map(e => (
                    <button
                      key={e}
                      onClick={() => setSelectedEmoji(e)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${selectedEmoji === e ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary hover:bg-secondary/80'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full">Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {clients.map(client => {
          const clientPosts = posts.filter(p => p.clientId === client.id);
          return (
            <button
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="bg-card rounded-xl p-6 border border-border shadow-sm text-left hover:shadow-md hover:border-primary/30 transition-all group"
            >
              <span className="text-3xl mb-3 block">{client.logo}</span>
              <h3 className="font-display font-bold text-lg text-card-foreground group-hover:text-primary transition-colors">{client.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{clientPosts.length} posts</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
