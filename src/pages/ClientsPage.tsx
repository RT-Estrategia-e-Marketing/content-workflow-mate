import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FileUpload from '@/components/FileUpload';

export default function ClientsPage() {
  const { clients, posts, addClient } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    addClient({
      name: name.trim(),
      logo: logoUrl || '',
      color: `hsl(${Math.random() * 360}, 60%, 50%)`,
    });
    setName('');
    setLogoUrl('');
    setOpen(false);
  };

  return (
    <div className="animate-slide-in">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-1">Clientes</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gerencie seus clientes e projetos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="md:h-10 md:px-4 md:text-sm">
              <Plus className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Novo Cliente</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Adicionar Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input placeholder="Nome do cliente" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
              <FileUpload
                bucket="client-logos"
                onUpload={setLogoUrl}
                label="Upload logo do cliente"
                preview={logoUrl}
              />
              <Button onClick={handleAdd} className="w-full">Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {clients.map(client => {
          const clientPosts = posts.filter(p => p.clientId === client.id);
          const isUrl = client.logo && client.logo.startsWith('http');
          return (
            <button
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="bg-card rounded-xl p-5 md:p-6 border border-border shadow-sm text-left hover:shadow-md hover:border-primary/30 transition-all group active:scale-[0.98]"
            >
              {isUrl ? (
                <img src={client.logo} alt={client.name} className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-contain mb-3" />
              ) : (
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary font-bold text-base md:text-lg">
                  {client.name.charAt(0)}
                </div>
              )}
              <h3 className="font-display font-bold text-base md:text-lg text-card-foreground group-hover:text-primary transition-colors">{client.name}</h3>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">{clientPosts.length} posts</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
