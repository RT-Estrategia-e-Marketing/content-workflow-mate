import { Post, KANBAN_STAGES, PostType, Platform } from '@/lib/types';
import { useApp } from '@/contexts/AppContext';
import { useProfiles } from '@/hooks/useProfiles';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FileUpload from '@/components/FileUpload';
import IPhoneMockup from '@/components/IPhoneMockup';
import { ArrowLeft, ArrowRight, Link2, UserPlus, Image, Film, Images, Instagram, Facebook, X, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface PostPreviewDialogProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PostPreviewDialog({ post, open, onOpenChange }: PostPreviewDialogProps) {
  const { movePost, assignPost, updatePost } = useApp();
  const { profiles } = useProfiles();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [caption, setCaption] = useState(post.caption);
  const [type, setType] = useState<PostType>(post.type);
  const [platform, setPlatform] = useState<Platform>(post.platform);
  const [date, setDate] = useState(post.scheduledDate);
  const [mainImage, setMainImage] = useState(post.imageUrl);
  const [videoUrl, setVideoUrl] = useState(post.videoUrl || '');
  const [carouselImages, setCarouselImages] = useState<string[]>(post.images || []);

  const stageIndex = KANBAN_STAGES.findIndex(s => s.key === post.stage);
  const canMoveForward = stageIndex < KANBAN_STAGES.length - 1;
  const canMoveBack = stageIndex > 0;
  const currentStage = KANBAN_STAGES[stageIndex];
  const assigned = profiles.find(m => m.user_id === post.assignedTo);

  const handleMoveForward = () => {
    const nextStage = KANBAN_STAGES[stageIndex + 1].key;
    movePost(post.id, nextStage);
    if (nextStage === 'client_approval') {
      toast.success('Link de aprovação gerado!');
    }
    onOpenChange(false);
  };

  const handleMoveBack = () => {
    movePost(post.id, KANBAN_STAGES[stageIndex - 1].key);
    onOpenChange(false);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/approve/${post.approvalLink}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const handleSave = () => {
    let imageUrl = mainImage;
    let images: string[] | undefined = undefined;

    if (type === 'carousel') {
      imageUrl = carouselImages[0] || '';
      images = carouselImages;
    } else if (type === 'reels') {
      imageUrl = mainImage; // cover
    }

    updatePost(post.id, {
      title, caption, type, platform, scheduledDate: date,
      imageUrl, images, videoUrl: type === 'reels' ? videoUrl : undefined,
    });
    setEditing(false);
    toast.success('Post atualizado!');
  };

  const resetEdit = () => {
    setTitle(post.title);
    setCaption(post.caption);
    setType(post.type);
    setPlatform(post.platform);
    setDate(post.scheduledDate);
    setMainImage(post.imageUrl);
    setVideoUrl(post.videoUrl || '');
    setCarouselImages(post.images || []);
    setEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetEdit(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display">{editing ? 'Editar Post' : post.title}</DialogTitle>
            {!editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Edit2 className="w-4 h-4 mr-1" /> Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        {editing ? (
          <div className="space-y-4 mt-2">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" maxLength={100} />
            <Textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Legenda..." rows={4} maxLength={2200} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={type} onValueChange={(v) => setType(v as PostType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="reels">Reels</SelectItem>
                  <SelectItem value="carousel">Carrossel</SelectItem>
                </SelectContent>
              </Select>
              <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === 'image' && (
              <FileUpload bucket="post-media" onUpload={setMainImage} label="Imagem do post" preview={mainImage} />
            )}

            {type === 'reels' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Capa do Reels</p>
                <FileUpload bucket="post-media" onUpload={setMainImage} label="Upload da capa" preview={mainImage} />
                <p className="text-xs text-muted-foreground font-medium">Vídeo do Reels</p>
                <FileUpload bucket="post-media" onUpload={setVideoUrl} label="Upload do vídeo" preview={videoUrl} accept="video/*" />
              </div>
            )}

            {type === 'carousel' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Imagens do Carrossel</p>
                <div className="grid grid-cols-2 gap-2">
                  {carouselImages.map((img, i) => (
                    <div key={i} className="relative">
                      <FileUpload bucket="post-media" onUpload={(url) => setCarouselImages(prev => prev.map((im, idx) => idx === i ? url : im))} label={`Slide ${i + 1}`} preview={img} />
                      <button onClick={() => setCarouselImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px] z-10">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCarouselImages(prev => [...prev, ''])} className="w-full text-xs">
                  + Adicionar Slide
                </Button>
              </div>
            )}

            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />

            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Responsável</p>
              <Select value={post.assignedTo || ''} onValueChange={(val) => assignPost(post.id, val)}>
                <SelectTrigger className="h-9 text-sm">
                  <div className="flex items-center gap-1">
                    <UserPlus className="w-3 h-3" />
                    <SelectValue placeholder="Delegar" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id} className="text-xs">
                      {m.full_name} · {m.job_title || m.priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetEdit} className="flex-1">Cancelar</Button>
              <Button onClick={handleSave} className="flex-1">Salvar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Stage badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full ${currentStage?.color} ${currentStage?.borderColor} border font-medium`}>
                {currentStage?.label}
              </span>
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

            {/* Preview content */}
            {post.type === 'carousel' && post.images && post.images.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {post.images.map((img, i) => (
                  img && <img key={i} src={img} alt={`Slide ${i + 1}`} className="w-40 h-40 rounded-lg object-cover flex-shrink-0 border border-border" />
                ))}
              </div>
            ) : post.imageUrl ? (
              <img src={post.imageUrl} alt={post.title} className="w-full rounded-lg object-cover max-h-64 border border-border" />
            ) : (
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Sem mídia</span>
              </div>
            )}

            {post.type === 'reels' && post.videoUrl && (
              <video src={post.videoUrl} controls className="w-full rounded-lg max-h-64" />
            )}

            <div className="p-3 bg-secondary rounded-lg">
              <p className="text-xs font-medium text-secondary-foreground mb-1">Legenda:</p>
              <p className="text-sm text-secondary-foreground whitespace-pre-wrap">{post.caption}</p>
            </div>

            <p className="text-xs text-muted-foreground">📅 {post.scheduledDate}</p>
            {assigned && <p className="text-xs text-muted-foreground">👤 {assigned.full_name} · {assigned.job_title || assigned.priority}</p>}

            {post.stage === 'client_approval' && post.approvalLink && (
              <button onClick={handleCopyLink} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Link2 className="w-3 h-3" /> Copiar link de aprovação
              </button>
            )}

            {/* Stage controls */}
            <div className="flex gap-2 pt-2 border-t border-border">
              {canMoveBack && (
                <Button variant="outline" size="sm" onClick={handleMoveBack} className="flex-1">
                  <ArrowLeft className="w-3 h-3 mr-1" /> Voltar
                </Button>
              )}
              {canMoveForward && (
                <Button size="sm" onClick={handleMoveForward} className="flex-1">
                  Avançar <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
