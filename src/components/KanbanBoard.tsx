import { Post, KANBAN_STAGES, KanbanStage, PostType, Platform } from '@/lib/types';
import { useApp } from '@/contexts/AppContext';
import { useProfiles } from '@/hooks/useProfiles';
import { formatDateBR } from '@/lib/utils';
import { Image, Film, Images, Instagram, Facebook, Smartphone } from 'lucide-react';
import { useState, DragEvent } from 'react';
import PostPreviewDialog from '@/components/PostPreviewDialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

function TypeIcon({ type }: { type: string }) {
  if (type === 'reels') return <Film className="w-3 h-3" />;
  if (type === 'carousel') return <Images className="w-3 h-3" />;
  if (type === 'story') return <Smartphone className="w-3 h-3" />;
  return <Image className="w-3 h-3" />;
}

function TypeLabel({ type }: { type: PostType }) {
  if (type === 'reels') return 'Reels';
  if (type === 'carousel') return 'Carrossel';
  if (type === 'story') return 'Story';
  return 'Imagem';
}

function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground">
      {(platform === 'instagram' || platform === 'both') && <Instagram className="w-2.5 h-2.5" />}
      {(platform === 'facebook' || platform === 'both') && <Facebook className="w-2.5 h-2.5" />}
    </span>
  );
}

interface PostCardProps {
  post: Post;
}

function PostCard({ post }: PostCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { profiles } = useProfiles();
  const assigned = profiles.find(m => m.user_id === post.assignedTo);
  const thumbnail = post.imageUrl || (post.images && post.images.length > 0 ? post.images[0] : '');

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('postId', post.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Story uses 9:16, reels uses 9:16, image/carousel uses auto (contain)
  const isVertical = post.type === 'story' || post.type === 'reels';

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={() => setPreviewOpen(true)}
        className="w-full text-left bg-card rounded-lg p-3 shadow-sm border border-border animate-slide-in hover:shadow-md hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-xs font-semibold text-card-foreground truncate flex-1">{post.title}</h4>
          <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">{formatDateBR(post.scheduledDate)}</span>
        </div>

        {thumbnail ? (
          <div className={`rounded-md overflow-hidden bg-muted mb-2 flex items-center justify-center ${isVertical ? 'aspect-[9/16]' : ''}`}>
            <img src={thumbnail} alt={post.title} className={`w-full ${isVertical ? 'h-full object-cover' : 'object-contain'}`} />
          </div>
        ) : (
          <div className={`rounded-md bg-muted flex items-center justify-center mb-2 ${isVertical ? 'aspect-[9/16]' : 'aspect-square'}`}>
            <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
              <TypeIcon type={post.type} />
              <span className="text-[9px]">{TypeLabel({ type: post.type })}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 mb-1">
          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-foreground/5 text-muted-foreground">
            <TypeIcon type={post.type} /> {TypeLabel({ type: post.type })}
          </span>
          <PlatformBadge platform={post.platform} />
        </div>

        <p className="text-[9px] text-muted-foreground line-clamp-2 mb-1">{post.caption}</p>

        {assigned && (
          <p className="text-[10px] text-muted-foreground">👤 {assigned.full_name} · {assigned.job_title || assigned.priority}</p>
        )}
      </div>

      <PostPreviewDialog post={post} open={previewOpen} onOpenChange={setPreviewOpen} />
    </>
  );
}

interface KanbanBoardProps {
  clientId: string;
}

export default function KanbanBoard({ clientId }: KanbanBoardProps) {
  const { getClientPosts, movePost } = useApp();
  const posts = getClientPosts(clientId);
  const [dragOverStage, setDragOverStage] = useState<KanbanStage | null>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>, stage: KanbanStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDragLeave = () => setDragOverStage(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>, stage: KanbanStage) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData('postId');
    if (postId) movePost(postId, stage);
    setDragOverStage(null);
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 min-h-[600px] pb-4">
        {KANBAN_STAGES.map(stage => {
          const stagePosts = posts.filter(p => p.stage === stage.key);
          const isDragOver = dragOverStage === stage.key;
          return (
            <div
              key={stage.key}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.key)}
              className={`min-w-[280px] w-[280px] flex-shrink-0 rounded-xl bg-muted/50 border-2 border-dashed p-3 transition-all ${
                isDragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border'
              }`}
            >
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
                  <p className="text-[10px] text-muted-foreground/50 text-center py-8">
                    {isDragOver ? 'Soltar aqui' : 'Nenhum post'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
