import { useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { CheckCircle, MessageSquare, Images, Film, Image, Instagram, Facebook, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { formatDateBR } from '@/lib/utils';

function InstagramMockup({ post, clientName, clientLogo }: { post: any; clientName: string; clientLogo: string }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const allImages = (post.type === 'carousel' || post.type === 'story') && post.images?.length > 0
    ? post.images.filter(Boolean)
    : post.imageUrl ? [post.imageUrl] : [];

  const isLogoUrl = clientLogo.startsWith('http');

  return (
    <div className="w-full max-w-[375px] mx-auto bg-card rounded-3xl border-[6px] border-foreground/80 overflow-hidden shadow-2xl">
      <div className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[35%] h-[22px] bg-foreground/80 rounded-b-xl z-10" />
      </div>

      <div className="pt-8 px-4 pb-2">
        <div className="flex items-center gap-2">
          {isLogoUrl ? (
            <img src={clientLogo} alt={clientName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm">
              {clientLogo}
            </div>
          )}
          <span className="text-sm font-semibold text-card-foreground">{clientName}</span>
          <div className="ml-auto flex items-center gap-1">
            {(post.platform === 'instagram' || post.platform === 'both') && <Instagram className="w-4 h-4 text-muted-foreground" />}
            {(post.platform === 'facebook' || post.platform === 'both') && <Facebook className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </div>

      <div className={`relative bg-muted ${post.type === 'story' ? 'aspect-[9/16]' : ''}`}>
        {post.type === 'reels' && post.videoUrl ? (
          <video src={post.videoUrl} controls className="w-full h-full object-cover" poster={post.imageUrl || undefined} />
        ) : allImages.length > 0 ? (
          <>
            <img src={allImages[currentSlide] || ''} alt="" className="w-full object-contain" />
            {allImages.length > 1 && (
              <>
                {currentSlide > 0 && (
                  <button onClick={() => setCurrentSlide(p => p - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                {currentSlide < allImages.length - 1 && (
                  <button onClick={() => setCurrentSlide(p => p + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {allImages.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentSlide ? 'bg-primary' : 'bg-foreground/30'}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40 gap-2 py-16">
            {post.type === 'reels' && <Film className="w-10 h-10" />}
            {post.type === 'carousel' && <Images className="w-10 h-10" />}
            {post.type === 'story' && <Smartphone className="w-10 h-10" />}
            {post.type === 'image' && <Image className="w-10 h-10" />}
            <span className="text-sm">
              {post.type === 'reels' ? 'Reels' : post.type === 'carousel' ? 'Carrossel' : post.type === 'story' ? 'Story' : 'Imagem'}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pt-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground">
          {post.type === 'reels' && <><Film className="w-3 h-3" /> Reels</>}
          {post.type === 'carousel' && <><Images className="w-3 h-3" /> Carrossel ({allImages.length} slides)</>}
          {post.type === 'story' && <><Smartphone className="w-3 h-3" /> Story ({allImages.length} cards)</>}
          {post.type === 'image' && <><Image className="w-3 h-3" /> Imagem</>}
        </span>
        {post.scheduledDate && (
          <span className="text-[10px] text-muted-foreground">📅 {formatDateBR(post.scheduledDate)}</span>
        )}
      </div>

      {post.type !== 'story' && post.caption && (
        <div className="px-4 py-3">
          <p className="text-sm text-card-foreground whitespace-pre-wrap leading-relaxed">{post.caption}</p>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}

export default function ApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const { posts, clients, movePost, updatePost } = useApp();
  const post = posts.find(p => p.approvalLink === token);
  const client = post ? clients.find(c => c.id === post.clientId) : null;
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'adjustment'>('pending');

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Link inválido</h1>
          <p className="text-muted-foreground">Este link de aprovação não existe ou já foi utilizado.</p>
        </div>
      </div>
    );
  }

  if (post.stage === 'approved' || status === 'approved') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-slide-in">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Post Aprovado!</h1>
          <p className="text-muted-foreground">Obrigado pela aprovação. O post será publicado conforme agendado.</p>
        </div>
      </div>
    );
  }

  if (status === 'adjustment') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-slide-in">
          <MessageSquare className="w-16 h-16 text-warning mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Ajuste Solicitado</h1>
          <p className="text-muted-foreground">Sua solicitação de ajuste foi enviada. Entraremos em contato.</p>
        </div>
      </div>
    );
  }

  const handleApprove = () => {
    movePost(post.id, 'approved');
    setStatus('approved');
  };

  const handleRequestAdjustment = () => {
    if (!feedback.trim()) return;
    const newComment = {
      id: `cm${Date.now()}`,
      author: 'Cliente',
      text: feedback.trim(),
      createdAt: new Date().toISOString(),
    };
    updatePost(post.id, { comments: [...post.comments, newComment] });
    movePost(post.id, 'adjustments');
    setStatus('adjustment');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-slide-in">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">Aprovação de Post</h1>
          <p className="text-sm text-muted-foreground">Revise o conteúdo e aprove ou solicite ajustes</p>
        </div>

        <InstagramMockup post={post} clientName={client?.name || 'Cliente'} clientLogo={client?.logo || '🏢'} />

        <div className="mt-6 space-y-3">
          <Button onClick={handleApprove} className="w-full" size="lg">
            <CheckCircle className="w-4 h-4 mr-2" /> Aprovar Post
          </Button>

          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">Ou solicite um ajuste:</p>
            <Textarea
              placeholder="Descreva o ajuste necessário..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={3}
            />
            <Button onClick={handleRequestAdjustment} variant="outline" className="w-full mt-2" disabled={!feedback.trim()}>
              <MessageSquare className="w-4 h-4 mr-2" /> Solicitar Ajuste
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
