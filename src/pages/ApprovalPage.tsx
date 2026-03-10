import { useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { CheckCircle, MessageSquare, Images, Film, Image, Instagram, Facebook, ChevronLeft, ChevronRight, Smartphone, Heart, Send as SendIcon, Bookmark, MoreHorizontal, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { formatDateBR } from '@/lib/utils';
import { Post } from '@/lib/types';
import { useNotifications } from '@/hooks/useNotifications';

function InstagramMockup({ post, clientName, clientLogo, onApprove, onRequestAdjustment }: {
  post: Post;
  clientName: string;
  clientLogo: string;
  onApprove: () => void;
  onRequestAdjustment: (feedback: string) => void;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'adjustment'>('pending');

  const allImages = (post.type === 'carousel' || post.type === 'story') && post.images?.length
    ? post.images.filter(Boolean)
    : post.imageUrl ? [post.imageUrl] : [];

  const isLogoUrl = clientLogo.startsWith('http');
  const isVertical = post.type === 'story' || post.type === 'reels';

  if (post.stage === 'approved' || post.stage === 'scheduled' || status === 'approved') {
    return (
      <div className="w-full max-w-[375px] mx-auto mb-6 text-center animate-slide-in py-8">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-900">Aprovado!</p>
      </div>
    );
  }

  if (status === 'adjustment') {
    return (
      <div className="w-full max-w-[375px] mx-auto mb-6 text-center animate-slide-in py-8">
        <MessageSquare className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-900">Ajuste solicitado</p>
      </div>
    );
  }

  const handleApprove = () => {
    onApprove();
    setStatus('approved');
  };

  const handleAdjustment = () => {
    if (!feedback.trim()) return;
    onRequestAdjustment(feedback.trim());
    setStatus('adjustment');
  };

  return (
    <div className="w-full max-w-[375px] mx-auto bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-lg mb-6">
      {/* Instagram Header */}
      <div className="px-3 py-2.5 flex items-center gap-2.5 border-b border-gray-100">
        {isLogoUrl ? (
          <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-pink-500 ring-offset-1">
            <img src={clientLogo} alt={clientName} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-sm ring-2 ring-pink-500 ring-offset-1">
            {clientLogo}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 truncate">{clientName}</p>
          <div className="flex items-center gap-1">
            {(post.platform === 'instagram' || post.platform === 'both') && <Instagram className="w-3 h-3 text-gray-400" />}
            {(post.platform === 'facebook' || post.platform === 'both') && <Facebook className="w-3 h-3 text-gray-400" />}
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-gray-900" />
      </div>

      {/* Post Media */}
      <div className={`relative bg-gray-50 ${isVertical ? 'aspect-[9/16]' : ''}`}>
        {post.type === 'reels' && post.videoUrl ? (
          <video src={post.videoUrl} controls className="w-full h-full object-contain" poster={post.imageUrl || undefined} />
        ) : allImages.length > 0 ? (
          <>
            <img src={allImages[currentSlide] || ''} alt="" className={`w-full ${isVertical ? 'h-full' : ''} object-contain`} />
            {allImages.length > 1 && (
              <>
                {currentSlide > 0 && (
                  <button onClick={() => setCurrentSlide(p => p - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center">
                    <ChevronLeft className="w-4 h-4 text-gray-700" />
                  </button>
                )}
                {currentSlide < allImages.length - 1 && (
                  <button onClick={() => setCurrentSlide(p => p + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-gray-700" />
                  </button>
                )}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {allImages.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentSlide ? 'bg-blue-500' : 'bg-white/60'}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full flex flex-col items-center justify-center text-gray-300 gap-2 py-20">
            {post.type === 'reels' && <Film className="w-10 h-10" />}
            {post.type === 'carousel' && <Images className="w-10 h-10" />}
            {post.type === 'story' && <Smartphone className="w-10 h-10" />}
            {post.type === 'image' && <Image className="w-10 h-10" />}
          </div>
        )}
      </div>

      {/* Instagram Action Bar */}
      <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Heart className="w-6 h-6 text-gray-900" />
          <MessageSquare className="w-6 h-6 text-gray-900" />
          <SendIcon className="w-6 h-6 text-gray-900" />
        </div>
        {allImages.length > 1 && (
          <div className="flex gap-1">
            {allImages.map((_, i) => (
              <div key={i} className={`w-[5px] h-[5px] rounded-full ${i === currentSlide ? 'bg-blue-500' : 'bg-gray-300'}`} />
            ))}
          </div>
        )}
        <Bookmark className="w-6 h-6 text-gray-900" />
      </div>

      {/* Caption */}
      {post.type !== 'story' && post.caption && (
        <div className="px-3 pb-2">
          <p className="text-[13px] text-gray-900 leading-[18px]">
            <span className="font-semibold">{clientName}</span>{' '}
            <span className="whitespace-pre-wrap">{post.caption}</span>
          </p>
        </div>
      )}

      {/* Type & Date badges */}
      <div className="px-3 pb-1 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {post.type === 'reels' && <><Film className="w-3 h-3" /> Reels</>}
          {post.type === 'carousel' && <><Images className="w-3 h-3" /> Carrossel ({allImages.length})</>}
          {post.type === 'story' && <><Smartphone className="w-3 h-3" /> Story ({allImages.length})</>}
          {post.type === 'image' && <><Image className="w-3 h-3" /> Imagem</>}
        </span>
        {post.scheduledDate && (
          <span className="text-[10px] text-gray-400">📅 {formatDateBR(post.scheduledDate)}</span>
        )}
      </div>

      <div className="h-2" />

      {/* Individual Approve / Adjustment */}
      <div className="px-3 pb-3 space-y-2">
        <Button onClick={handleApprove} className="w-full bg-green-500 hover:bg-green-600 text-white" size="sm">
          <CheckCircle className="w-4 h-4 mr-2" /> Aprovar
        </Button>
        <div className="border-t border-gray-100 pt-2">
          <Textarea
            placeholder="Descreva o ajuste necessário..."
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            rows={2}
            className="text-xs border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400"
          />
          <Button onClick={handleAdjustment} variant="outline" className="w-full mt-1.5 text-gray-700 border-gray-200" size="sm" disabled={!feedback.trim()}>
            <MessageSquare className="w-3 h-3 mr-1" /> Solicitar Ajuste
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const { posts, clients, movePost, updatePost } = useApp();
  const { createNotification } = useNotifications();
  const [allApproved, setAllApproved] = useState(false);

  const approvalPosts = posts.filter(p => p.approvalLink === token && (p.stage === 'client_approval' || p.stage === 'approved' || p.stage === 'scheduled'));
  const client = approvalPosts.length > 0 ? clients.find(c => c.id === approvalPosts[0].clientId) : null;

  if (approvalPosts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link inválido</h1>
          <p className="text-gray-500">Este link de aprovação não existe ou já foi utilizado.</p>
        </div>
      </div>
    );
  }

  if (allApproved || approvalPosts.every(p => p.stage === 'approved' || p.stage === 'scheduled')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center animate-slide-in">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Todos os Posts Aprovados!</h1>
          <p className="text-gray-500">Obrigado pela aprovação. Os posts serão publicados conforme agendado.</p>
        </div>
      </div>
    );
  }

  const pendingPosts = approvalPosts.filter(p => p.stage === 'client_approval');

  const handleApprovePost = (postId: string) => {
    movePost(postId, 'approved');
  };

  const handleRequestAdjustment = (postId: string, feedback: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const newComment = {
      id: `cm${Date.now()}`,
      author: 'Cliente',
      text: feedback,
      createdAt: new Date().toISOString(),
    };
    updatePost(postId, { comments: [...post.comments, newComment] });
    movePost(postId, 'adjustments');

    if (post.assignedTo && post.assignedTo.length > 0) {
      post.assignedTo.forEach(memberId => {
        createNotification({
          user_id: memberId,
          post_id: post.id,
          client_id: post.clientId,
          type: 'client_adjustment',
          message: `O cliente ${client?.name || ''} solicitou ajuste no post "${post.title}": ${feedback}`,
        });
      });
    }
  };

  const handleApproveAll = () => {
    pendingPosts.forEach(p => movePost(p.id, 'approved'));
    setAllApproved(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="max-w-[420px] mx-auto pt-8 px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            {client?.logo && (
              client.logo.startsWith('http') ? (
                <img src={client.logo} alt={client.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="text-2xl">{client.logo}</span>
              )
            )}
            <h1 className="text-xl font-bold text-gray-900">{client?.name || 'Cliente'}</h1>
          </div>
          <p className="text-sm text-gray-500">
            {pendingPosts.length} post{pendingPosts.length !== 1 ? 's' : ''} para aprovação
          </p>
        </div>

        {/* Posts */}
        {approvalPosts.map(post => (
          <InstagramMockup
            key={post.id}
            post={post}
            clientName={client?.name || 'Cliente'}
            clientLogo={client?.logo || '🏢'}
            onApprove={() => handleApprovePost(post.id)}
            onRequestAdjustment={(fb) => handleRequestAdjustment(post.id, fb)}
          />
        ))}
      </div>

      {/* Floating Approve All */}
      {pendingPosts.length > 1 && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent pt-6 pb-6 px-4">
            <div className="max-w-[375px] mx-auto">
              <Button
                onClick={handleApproveAll}
                className="w-full bg-green-500 hover:bg-green-600 text-white shadow-2xl shadow-green-500/30 rounded-2xl h-14 text-base font-semibold"
                size="lg"
              >
                <CheckCheck className="w-5 h-5 mr-2" /> Aprovar Todos ({pendingPosts.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
