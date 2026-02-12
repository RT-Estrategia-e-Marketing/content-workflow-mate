import { Post, KANBAN_STAGES, TEAM_MEMBERS, KanbanStage } from '@/lib/types';
import { useApp } from '@/contexts/AppContext';
import { ArrowRight, ArrowLeft, Link2, UserPlus, Image, Film, Images } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

function TypeIcon({ type }: { type: string }) {
  if (type === 'reels') return <Film className="w-3 h-3" />;
  if (type === 'carousel') return <Images className="w-3 h-3" />;
  return <Image className="w-3 h-3" />;
}

interface PostCardProps {
  post: Post;
}

function PostCard({ post }: PostCardProps) {
  const { movePost, assignPost } = useApp();
  const stageIndex = KANBAN_STAGES.findIndex(s => s.key === post.stage);
  const canMoveForward = stageIndex < KANBAN_STAGES.length - 1;
  const canMoveBack = stageIndex > 0;
  const canAssign = ['content', 'internal_approval', 'adjustments'].includes(post.stage);
  const assigned = TEAM_MEMBERS.find(m => m.id === post.assignedTo);

  const handleMoveForward = () => {
    const nextStage = KANBAN_STAGES[stageIndex + 1].key;
    movePost(post.id, nextStage);
    if (nextStage === 'client_approval') {
      toast.success('Link de aprovação gerado!');
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/approve/${post.approvalLink}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const thumbnail = post.imageUrl || (post.images && post.images.length > 0 ? post.images[0] : '');

  return (
    <div className="bg-card rounded-lg p-3 shadow-sm border border-border animate-slide-in hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-xs font-semibold text-card-foreground truncate flex-1">{post.title}</h4>
        <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">{post.scheduledDate}</span>
      </div>

      {/* Thumbnail instead of mockup */}
      {thumbnail ? (
        <div className="aspect-square rounded-md overflow-hidden bg-muted mb-2">
          <img src={thumbnail} alt={post.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-square rounded-md bg-muted flex items-center justify-center mb-2">
          <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
            <TypeIcon type={post.type} />
            <span className="text-[9px]">{post.type === 'image' ? 'Imagem' : post.type === 'reels' ? 'Reels' : 'Carrossel'}</span>
          </div>
        </div>
      )}

      <p className="text-[9px] text-muted-foreground line-clamp-2 mb-2">{post.caption}</p>

      {canAssign && (
        <div className="mt-2">
          <Select value={post.assignedTo || ''} onValueChange={(val) => assignPost(post.id, val)}>
            <SelectTrigger className="h-7 text-[10px]">
              <div className="flex items-center gap-1">
                <UserPlus className="w-3 h-3" />
                <SelectValue placeholder="Delegar" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {TEAM_MEMBERS.map(m => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.name} · {m.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {assigned && !canAssign && (
        <p className="text-[10px] text-muted-foreground mt-2">👤 {assigned.name}</p>
      )}

      {post.stage === 'client_approval' && post.approvalLink && (
        <button onClick={handleCopyLink} className="mt-2 flex items-center gap-1 text-[10px] text-primary hover:underline w-full">
          <Link2 className="w-3 h-3" /> Copiar link de aprovação
        </button>
      )}

      <div className="flex gap-1 mt-3">
        {canMoveBack && (
          <button onClick={() => movePost(post.id, KANBAN_STAGES[stageIndex - 1].key)} className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
            <ArrowLeft className="w-3 h-3" />
          </button>
        )}
        {canMoveForward && (
          <button onClick={handleMoveForward} className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            Avançar <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  clientId: string;
}

export default function KanbanBoard({ clientId }: KanbanBoardProps) {
  const { getClientPosts } = useApp();
  const posts = getClientPosts(clientId);

  return (
    <div className="grid grid-cols-5 gap-4 min-h-[600px]">
      {KANBAN_STAGES.map(stage => {
        const stagePosts = posts.filter(p => p.stage === stage.key);
        return (
          <div key={stage.key} className={`rounded-xl ${stage.color} border ${stage.borderColor} p-3`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-foreground/80">{stage.label}</h3>
              <span className="text-[10px] font-semibold bg-foreground/10 text-foreground/60 rounded-full px-2 py-0.5">
                {stagePosts.length}
              </span>
            </div>
            <div className="space-y-3">
              {stagePosts.map(post => (
                <PostCard key={post.id} post={post} />
              ))}
              {stagePosts.length === 0 && (
                <p className="text-[10px] text-muted-foreground/50 text-center py-8">Nenhum post</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
