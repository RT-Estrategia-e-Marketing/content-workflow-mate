import { useApp } from '@/contexts/AppContext';
import { Building2, Plus } from 'lucide-react';
import KanbanBoard from '@/components/KanbanBoard';
import NewPostModal from '@/components/NewPostModal';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function KanbanPage() {
  const { clients, activeWorkspaceId } = useApp();
  const [newPostOpen, setNewPostOpen] = useState(false);
  
  const activeClient = clients.find(c => c.id === activeWorkspaceId);

  if (!activeWorkspaceId || !activeClient) {
    return (
      <div className="animate-slide-in flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Building2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Nenhum workspace selecionado</h1>
        <p className="text-muted-foreground max-w-sm">
          Selecione um workspace na barra lateral para visualizar o Kanban.
        </p>
      </div>
    );
  }

  const activeIsUrl = activeClient.logo && activeClient.logo.startsWith('http');

  return (
    <div className="animate-slide-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-primary/10">
            {activeIsUrl ? (
              <img src={activeClient.logo} alt={activeClient.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-lg font-bold text-primary">{activeClient.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground leading-tight">
              {activeClient.name}
            </h1>
            <p className="text-sm text-muted-foreground">Kanban de posts</p>
          </div>
        </div>
        <Button onClick={() => setNewPostOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Post</span>
        </Button>
      </div>
      
      <KanbanBoard clientId={activeWorkspaceId} />

      <NewPostModal
        open={newPostOpen}
        onOpenChange={setNewPostOpen}
        defaultDate=""
      />
    </div>
  );
}
