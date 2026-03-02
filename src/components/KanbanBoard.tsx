import { Post, KANBAN_STAGES, KanbanStage, PostType, Platform } from '@/lib/types';
import { useApp } from '@/contexts/AppContext';
import { useProfiles } from '@/hooks/useProfiles';
import { formatDateBR } from '@/lib/utils';
import { Image, Film, Images, Instagram, Facebook, Smartphone, ChevronLeft, ChevronRight, Link2, Copy } from 'lucide-react';
import { useState, DragEvent } from 'react';
import PostPreviewDialog from '@/components/PostPreviewDialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

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

const STAGE_COLORS: Record<string, string> = {
  content: 'bg-blue-400',
  internal_approval: 'bg-yellow-400',
  adjustments: 'bg-orange-400',
  client_approval: 'bg-purple-400',
  approved: 'bg-green-400',
  scheduled: 'bg-sky-400',
};

interface PostCardProps {
  post: Post;
}

function PostCard({ post }: PostCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const { profiles } = useProfiles();
  const assigned = profiles.find(m => m.user_id === post.assignedTo);

  const allImages = (post.type === 'carousel' || post.type === 'story') && post.images?.length
    ? post.images.filter(Boolean)
    : post.imageUrl ? [post.imageUrl] : [];

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('postId', post.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const isVertical = post.type === 'story' || post.type === 'reels';

  const lastAdjustment = post.stage === 'adjustments'
    ? [...post.comments].reverse().find(c => c.author === 'Cliente')
    : null;

  const handleCopyApprovalLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.approvalLink) {
      const link = `${window.location.origin}/approve/${post.approvalLink}`;
      navigator.clipboard.writeText(link).then(() => {
        toast.success('Link de aprovação copiado!');
      }).catch(() => {
        toast.info(`Link: ${link}`);
      });
    }
  };

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

        {allImages.length > 0 ? (
          <div className={`relative rounded-md overflow-hidden bg-muted mb-2 flex items-center justify-center ${isVertical ? 'aspect-[9/16]' : ''}`}>
            <img src={allImages[slideIdx] || allImages[0]} alt={post.title} className={`w-full ${isVertical ? 'h-full object-cover' : 'object-contain'}`} />
            {allImages.length > 1 && (
              <>
                {slideIdx > 0 && (
                  <button onClick={(e) => { e.stopPropagation(); setSlideIdx(i => i - 1); }} className="absolute left-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center z-10">
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                )}
                {slideIdx < allImages.length - 1 && (
                  <button onClick={(e) => { e.stopPropagation(); setSlideIdx(i => i + 1); }} className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center z-10">
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {allImages.map((_, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full ${i === slideIdx ? 'bg-primary' : 'bg-foreground/30'}`} />
                  ))}
                </div>
              </>
            )}
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

        {post.type !== 'story' && (
          <p className="text-[9px] text-muted-foreground line-clamp-2 mb-1">{post.caption}</p>
        )}

        {lastAdjustment && (
          <div className="mt-1 p-1.5 bg-destructive/10 border border-destructive/20 rounded text-[9px] text-destructive line-clamp-2">
            💬 {lastAdjustment.text}
          </div>
        )}

        {/* Copy approval link button */}
        {post.stage === 'client_approval' && post.approvalLink && (
          <button
            onClick={handleCopyApprovalLink}
            className="mt-1.5 flex items-center gap-1 text-[10px] text-primary hover:underline"
          >
            <Copy className="w-3 h-3" /> Copiar link de aprovação
          </button>
        )}

        {assigned && (
          <p className="text-[10px] text-muted-foreground mt-1">👤 {assigned.full_name} · {assigned.job_title || assigned.priority}</p>
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
    <div>
      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        {KANBAN_STAGES.map(s => (
          <span key={s.key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${STAGE_COLORS[s.key] || 'bg-muted-foreground'}`} />
            {s.label}
          </span>
        ))}
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 min-h-[600px] pb-4">
          {KANBAN_STAGES.map(stage => {
            const stagePosts = posts.filter(p => p.stage === stage.key);
            const isDragOver = dragOverStage === stage.key;
            const stageColor = STAGE_COLORS[stage.key] || 'bg-muted-foreground';
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
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stageColor}`} />
                    <h3 className="text-xs font-bold text-foreground/80">{stage.label}</h3>
                  </div>
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
    </div>
  );
}
