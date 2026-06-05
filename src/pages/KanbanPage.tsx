import { useApp } from '@/contexts/AppContext';
import { Building2 } from 'lucide-react';
import KanbanBoard from '@/components/KanbanBoard';

export default function KanbanPage() {
  const { clients, activeWorkspaceId } = useApp();
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
    <div className="animate-slide-in">
      <div className="flex items-center gap-3 mb-6">
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
      <KanbanBoard clientId={activeWorkspaceId} />
    </div>
  );
}
