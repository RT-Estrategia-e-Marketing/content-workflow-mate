import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCcw, AlertTriangle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { formatDateBR } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function TrashPage() {
  const { trashedPosts, clients, restorePost, hardDeletePost, emptyTrash } = useApp();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const filteredPosts = selectedClient 
    ? trashedPosts.filter(p => p.clientId === selectedClient) 
    : trashedPosts;

  const getDaysLeft = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const expireDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((expireDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return Math.max(0, daysLeft);
  };

  return (
    <div className="animate-slide-in max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-1 flex items-center gap-2">
            <Trash2 className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
            Lixeira
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Itens excluídos. Eles serão mantidos aqui por até 30 dias.
          </p>
        </div>
        
        {trashedPosts.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4" /> Esvaziar Lixeira
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Esvaziar lixeira?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os posts na lixeira serão definitivamente apagados do banco de dados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => { emptyTrash(); }}>
                  Esvaziar Definitivamente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {trashedPosts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide py-1">
          <Button
            variant={selectedClient === null ? 'default' : 'outline'}
            onClick={() => setSelectedClient(null)}
            className="rounded-full shadow-sm text-xs h-8"
          >
            Todos
          </Button>
          {clients.map(client => {
            const clientPostsCount = trashedPosts.filter(p => p.clientId === client.id).length;
            if (clientPostsCount === 0) return null;
            return (
              <Button
                key={client.id}
                variant={selectedClient === client.id ? 'default' : 'outline'}
                onClick={() => setSelectedClient(client.id)}
                className="rounded-full shadow-sm text-xs h-8"
              >
                {client.name} <span className="ml-1 opacity-70">({clientPostsCount})</span>
              </Button>
            );
          })}
        </div>
      )}

      {filteredPosts.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-display font-bold text-card-foreground mb-2">Lixeira vazia</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Nenhum post foi excluído. Os posts excluídos aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 divide-y divide-border">
            {filteredPosts.map(post => {
              const client = clients.find(c => c.id === post.clientId);
              const daysLeft = post.deletedAt ? getDaysLeft(post.deletedAt) : 30;
              
              return (
                <div key={post.id} className="p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                      <Trash2 className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-card-foreground text-sm md:text-base truncate">
                        {post.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-1">
                        {client?.name} • Agendado: {formatDateBR(post.scheduledDate)}
                      </p>
                      {post.deletedAt && (
                        <p className={`text-[10px] md:text-xs font-semibold flex items-center gap-1 ${daysLeft <= 5 ? 'text-destructive' : 'text-warning'}`}>
                          <AlertCircle className="w-3 h-3" />
                          {daysLeft === 0 ? 'Expira hoje' : `Expira em ${daysLeft} dias (${formatDateBR(post.deletedAt)})`}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button 
                      onClick={() => restorePost(post.id)} 
                      variant="outline" 
                      size="sm"
                      className="text-xs h-8"
                    >
                      <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
                      Restaurar
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O post "{post.title}" será removido para sempre. Você tem certeza?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => hardDeletePost(post.id)}>
                            Sim, excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
