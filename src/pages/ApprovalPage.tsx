import { useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import IPhoneMockup from '@/components/IPhoneMockup';
import { CheckCircle, MessageSquare, Images, Film, Image, Instagram, Facebook } from 'lucide-react';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function ApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const { posts, movePost } = useApp();
  const post = posts.find(p => p.approvalLink === token);
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

  if (post.stage === 'approved') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Post Aprovado!</h1>
          <p className="text-muted-foreground">Este post já foi aprovado. Obrigado!</p>
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
    movePost(post.id, 'adjustments');
    setStatus('adjustment');
  };

  if (status === 'approved') {
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full animate-slide-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Aprovação de Post</h1>
          <p className="text-muted-foreground">Revise o conteúdo abaixo e aprove ou solicite ajustes</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-display font-bold text-lg text-card-foreground">{post.title}</h2>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              {post.type === 'reels' && <><Film className="w-3 h-3" /> Reels</>}
              {post.type === 'carousel' && <><Images className="w-3 h-3" /> Carrossel</>}
              {post.type === 'image' && <><Image className="w-3 h-3" /> Imagem</>}
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              {(post.platform === 'instagram' || post.platform === 'both') && <Instagram className="w-3 h-3" />}
              {(post.platform === 'facebook' || post.platform === 'both') && <Facebook className="w-3 h-3" />}
            </span>
          </div>
          
          <IPhoneMockup post={post} size="md" />

          {post.type === 'carousel' && post.images && post.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mt-4 pb-2">
              {post.images.map((img, i) => (
                img && <img key={i} src={img} alt={`Slide ${i + 1}`} className="w-24 h-24 rounded-lg object-cover flex-shrink-0 border border-border" />
              ))}
            </div>
          )}

          {post.type === 'reels' && post.videoUrl && (
            <video src={post.videoUrl} controls className="w-full rounded-lg mt-4 max-h-64" />
          )}

          <div className="mt-4 p-3 bg-secondary rounded-lg">
            <p className="text-xs font-medium text-secondary-foreground mb-1">Legenda:</p>
            <p className="text-sm text-secondary-foreground whitespace-pre-wrap">{post.caption}</p>
          </div>

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
    </div>
  );
}
