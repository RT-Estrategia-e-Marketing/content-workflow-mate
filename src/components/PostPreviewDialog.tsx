import { Post, KANBAN_STAGES, PostType, Platform, PostComment } from '@/lib/types';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useUserRole } from '@/hooks/useUserRole';
import { useNotifications } from '@/hooks/useNotifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FileUpload from '@/components/FileUpload';
import DatePicker from '@/components/DatePicker';
import TimePicker from '@/components/TimePicker';
import { publishToFacebook, publishToInstagram } from '@/lib/meta-api';
import { formatDateBR } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Link2, UserPlus, Image, Film, Images, Instagram, Facebook, X, Edit2, MessageSquare, Send, GripVertical, Upload, Smartphone, ChevronLeft, ChevronRight, Trash2, CalendarDays, Zap } from 'lucide-react';
import { useState, useRef, DragEvent } from 'react';
import { toast } from 'sonner';
import { MultiSelect } from '@/components/ui/multi-select';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function PreviewCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  return (
    <div className="relative rounded-lg border border-border overflow-hidden bg-muted">
      <img src={images[idx]} alt={`Slide ${idx + 1}`} className="w-full object-contain" />
      {images.length > 1 && (
        <>
          {idx > 0 && (
            <button onClick={() => setIdx(i => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {idx < images.length - 1 && (
            <button onClick={() => setIdx(i => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center">
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-primary' : 'bg-foreground/30'}`} />
            ))}
          </div>
          <span className="absolute top-2 right-2 text-[10px] bg-foreground/60 text-background rounded px-1.5 py-0.5">{idx + 1}/{images.length}</span>
        </>
      )}
    </div>
  );
}

interface PostPreviewDialogProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PostPreviewDialog({ post, open, onOpenChange }: PostPreviewDialogProps) {
  const { movePost, updatePost, deletePost, clients } = useApp();
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const { isAdmin } = useUserRole();
  const { createNotification } = useNotifications();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [caption, setCaption] = useState(post.caption);
  const [ideaText, setIdeaText] = useState(post.ideaText || '');
  const [referenceLink, setReferenceLink] = useState(post.referenceLink || '');
  const [type, setType] = useState<PostType>(post.type);
  const [platform, setPlatform] = useState<Platform>(post.platform);
  const [date, setDate] = useState(post.scheduledDate);
  const [scheduledTime, setScheduledTime] = useState(post.scheduledTime || '12:00');
  const [mainImage, setMainImage] = useState(post.imageUrl);
  const [videoUrl, setVideoUrl] = useState(post.videoUrl || '');
  const [carouselImages, setCarouselImages] = useState<string[]>(post.images || []);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const multiFileRef = useRef<HTMLInputElement>(null);

  const [commentText, setCommentText] = useState('');
  const [delegateTo, setDelegateTo] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const stageIndex = KANBAN_STAGES.findIndex(s => s.key === post.stage);
  const canMoveForward = stageIndex < KANBAN_STAGES.length - 1;
  const canMoveBack = stageIndex > 0;
  const currentStage = KANBAN_STAGES[stageIndex];

  const assignedList = post.assignedTo || [];
  const assignedProfiles = profiles.filter(m => assignedList.includes(m.user_id));

  const handleMoveForward = () => {
    const nextStage = KANBAN_STAGES[stageIndex + 1].key;
    movePost(post.id, nextStage);
    
    if (['internal_approval', 'adjustments'].includes(nextStage) && assignedList.length > 0 && user) {
      const stageLabel = KANBAN_STAGES.find(s => s.key === nextStage)?.label || nextStage;
      const client = clients.find(c => c.id === post.clientId);
      const authorName = profiles.find(p => p.user_id === user.uid)?.full_name || 'Um usuário';
      
      assignedList.forEach(uid => {
        if (uid !== user.uid) {
          createNotification({
            user_id: uid,
            post_id: post.id,
            client_id: post.clientId,
            type: 'internal_review',
            message: `O usuário ${authorName} moveu o post "${post.title}" de ${client?.name || 'Cliente'} para ${stageLabel}`,
          });
        }
      });
    }
    onOpenChange(false);
  };

  const handleMoveBack = () => {
    const prevStage = KANBAN_STAGES[stageIndex - 1].key;
    movePost(post.id, prevStage);
    
    if (['internal_approval', 'adjustments'].includes(prevStage) && assignedList.length > 0 && user) {
      const stageLabel = KANBAN_STAGES.find(s => s.key === prevStage)?.label || prevStage;
      const client = clients.find(c => c.id === post.clientId);
      const authorName = profiles.find(p => p.user_id === user.uid)?.full_name || 'Um usuário';

      assignedList.forEach(uid => {
        if (uid !== user.uid) {
          createNotification({
            user_id: uid,
            post_id: post.id,
            client_id: post.clientId,
            type: 'internal_review',
            message: `O usuário ${authorName} moveu o post "${post.title}" de ${client?.name || 'Cliente'} para ${stageLabel}`,
          });
        }
      });
    }
    onOpenChange(false);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/approve/${post.approvalLink}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const handlePublishToMeta = async (publishNow: boolean = false) => {
    const client = clients.find(c => c.id === post.clientId);
    if (!client?.meta_access_token || !client?.meta_page_id) {
      toast.error('Este cliente não possui a integração com a Meta configurada corretamente.');
      return;
    }

    setIsPublishing(true);
    let successCount = 0;

    // Calc Unix timestamp if scheduling
    let scheduledUnix: number | undefined = undefined;
    if (!publishNow && post.scheduledDate && post.scheduledTime) {
      const dateTimeStr = `${post.scheduledDate}T${post.scheduledTime}:00`;
      const dateObj = new Date(dateTimeStr);
      if (!isNaN(dateObj.getTime())) {
        scheduledUnix = Math.floor(dateObj.getTime() / 1000);
        
        // Meta requirement: must be between 15 mins and 75 days in future
        const nowUnix = Math.floor(Date.now() / 1000);
        if (scheduledUnix < nowUnix + (15 * 60)) {
          toast.warning('O agendamento deve ser pelo menos 15 minutos no futuro. Publicando agora...');
          scheduledUnix = undefined;
        }
      }
    }

    try {
      // 1. Post to Facebook
      if (post.platform === 'facebook' || post.platform === 'both') {
        const action = scheduledUnix ? 'Agendando' : 'Publicando';
        toast.info(`${action} no Facebook...`);
        await publishToFacebook({
          pageId: client.meta_page_id,
          accessToken: client.meta_access_token,
          caption: post.caption,
          imageUrl: post.imageUrl,
          videoUrl: post.videoUrl,
          scheduledPublishTime: scheduledUnix
        });
        successCount++;
        toast.success(scheduledUnix ? 'Agendado no Facebook!' : 'Publicado no Facebook!');
      }

      // 2. Post to Instagram
      if ((post.platform === 'instagram' || post.platform === 'both') && client.meta_ig_account_id) {
        const action = scheduledUnix ? 'Agendando' : 'Publicando';
        toast.info(`${action} no Instagram...`);
        await publishToInstagram({
          pageId: client.meta_page_id,
          igAccountId: client.meta_ig_account_id,
          accessToken: client.meta_access_token,
          caption: post.caption,
          imageUrl: post.imageUrl,
          videoUrl: post.videoUrl,
          images: post.images,
          type: post.type,
          videoThumbnailUrl: post.videoThumbnailUrl,
          scheduledPublishTime: scheduledUnix
        });
        successCount++;
        toast.success(scheduledUnix ? 'Agendado no Instagram!' : 'Publicado no Instagram!');
      }

      if (successCount > 0) {
        movePost(post.id, 'scheduled');
        toast.success('Post movido para Agendado!');
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(`Falha ao publicar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const myProfile = profiles.find(p => p.user_id === user?.uid);
    const newComment: PostComment = {
      id: `cm${Date.now()}`,
      author: myProfile?.full_name || 'Usuário',
      authorId: user?.uid,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
      delegatedTo: delegateTo || undefined,
    };
    updatePost(post.id, { comments: [...post.comments, newComment] });

    if (delegateTo) {
      const delegatedProfile = profiles.find(p => p.user_id === delegateTo);
      createNotification({
        user_id: delegateTo,
        post_id: post.id,
        client_id: post.clientId,
        type: 'change_request',
        message: `O usuário ${myProfile?.full_name || 'Alguém'} solicitou alteração no post "${post.title}": ${commentText.trim()}`,
      });
      toast.success(`Alteração delegada para ${delegatedProfile?.full_name}`);
    }

    setCommentText('');
    setDelegateTo('');
  };

  const handleAssignMultiple = (userIds: string[]) => {
    updatePost(post.id, { assignedTo: userIds });
    toast.success('Responsáveis atualizados!');

    // Send notification to newly assigned users (diffing old vs new)
    const myProfile = profiles.find(p => p.user_id === user?.uid);
    const prevAssignees = post.assignedTo || [];
    const newAssignees = userIds.filter(id => !prevAssignees.includes(id));

    // Removed delegation notification per user request "notificar somente se foi criado ou aprovação interna"
  };

// Carousel reorder
  const handleCarouselDragStart = (e: DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCarouselDrop = (e: DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) return;
    const newImages = [...carouselImages];
    const [moved] = newImages.splice(dragIdx, 1);
    newImages.splice(targetIdx, 0, moved);
    setCarouselImages(newImages);
    setDragIdx(null);
  };

  const handleMultiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const uploads: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} muito grande`); continue; }
      const ext = file.name.split('.').pop();
      const path = `post-media/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const storageRef = ref(storage, path);
      try {
        await uploadBytes(storageRef, file);
        const publicUrl = await getDownloadURL(storageRef);
        uploads.push(publicUrl);
      } catch (err: any) {
        console.error('Erro ao fazer upload da imagem:', err);
        toast.error(`Erro: ${file.name} - ${err.message || 'Desconhecido'}`);
        continue;
      }
    }
    setCarouselImages(prev => [...prev, ...uploads]);
    if (uploads.length > 0) toast.success(`${uploads.length} imagem(ns) adicionada(s)`);
  };

  const handleSave = () => {
    let imageUrl = mainImage;
    let images: string[] | undefined = undefined;

    if (type === 'carousel' || type === 'story') {
      imageUrl = carouselImages[0] || '';
      images = carouselImages;
    } else if (type === 'reels') {
      imageUrl = mainImage;
    }

    updatePost(post.id, {
      title, caption: type === 'story' ? '' : caption, type, platform, 
      scheduledDate: date,
      scheduledTime,
      ideaText: ideaText.trim() || undefined,
      referenceLink: referenceLink.trim() || undefined,
      imageUrl, images, videoUrl: type === 'reels' ? videoUrl : undefined,
      videoThumbnailUrl: type === 'reels' ? imageUrl : undefined,
    });
    setEditing(false);
    toast.success('Post atualizado!');
  };

  const handleDeletePost = () => {
    deletePost(post.id);
    setDeleteOpen(false);
    onOpenChange(false);
  };

  const resetEdit = () => {
    setTitle(post.title);
    setCaption(post.caption);
    setIdeaText(post.ideaText || '');
    setReferenceLink(post.referenceLink || '');
    setType(post.type);
    setPlatform(post.platform);
    setDate(post.scheduledDate);
    setMainImage(post.imageUrl);
    setVideoUrl(post.videoUrl || '');
    setCarouselImages(post.images || []);
    setScheduledTime(post.scheduledTime || '12:00');
    setEditing(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetEdit(); onOpenChange(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display">{editing ? 'Editar Post' : post.title}</DialogTitle>
              <div className="flex items-center gap-1">
                {!editing && (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-1" /> Editar
                  </Button>
                )}
                {!editing && (
                  <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {editing ? (
            <div className="space-y-4 mt-2">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" maxLength={100} />
              {(post.stage === 'content' || post.stage === 'design') && (
                <div className="space-y-2 border border-border p-3 rounded-md bg-muted/30">
                  <p className="text-xs font-semibold">Briefing / Ideia</p>
                  <Textarea placeholder="Texto de ideia para o post..." value={ideaText} onChange={e => setIdeaText(e.target.value)} rows={3} />
                  <Input placeholder="Link de referência..." value={referenceLink} onChange={e => setReferenceLink(e.target.value)} />
                </div>
              )}
              {type !== 'story' && (
                <Textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Legenda..." rows={4} maxLength={2200} />
              )}
              <div className="grid grid-cols-2 gap-3">
                <Select value={type} onValueChange={(v) => setType(v as PostType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="reels">Reels</SelectItem>
                    <SelectItem value="carousel">Carrossel</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
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

              {(type === 'image') && (
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

              {(type === 'carousel' || type === 'story') && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">{type === 'story' ? 'Cards do Story' : 'Imagens do Carrossel'}</p>
                  <input ref={multiFileRef} type="file" accept="image/*" multiple onChange={handleMultiFileUpload} className="hidden" />
                  <div className="grid grid-cols-3 gap-2">
                    {carouselImages.map((img, i) => (
                      <div
                        key={i}
                        draggable
                        onDragStart={(e) => handleCarouselDragStart(e, i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleCarouselDrop(e, i)}
                        className={`relative group rounded-lg border-2 ${dragIdx === i ? 'border-primary opacity-50' : 'border-border'} overflow-hidden cursor-grab active:cursor-grabbing`}
                      >
                        {img ? (
                          <img src={img} alt={`Slide ${i + 1}`} className="w-full aspect-square object-cover" />
                        ) : (
                          <div className="w-full aspect-square bg-muted flex items-center justify-center">
                            <Upload className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-1">
                          <span className="bg-foreground/70 text-background text-[9px] rounded px-1">{i + 1}</span>
                          <button onClick={() => setCarouselImages(prev => prev.filter((_, idx) => idx !== i))} className="w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <GripVertical className="absolute bottom-1 right-1 w-3 h-3 text-foreground/40" />
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => multiFileRef.current?.click()} className="w-full text-xs">
                    <Upload className="w-3 h-3 mr-1" /> Adicionar Slides
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground font-medium mb-1 ml-1">Data de agendamento</p>
                  <DatePicker value={date} onChange={setDate} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground font-medium mb-1 ml-1">Horário</p>
                  <TimePicker 
                    value={scheduledTime} 
                    onChange={setScheduledTime}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Responsável</p>
                <MultiSelect
                  options={profiles.map(m => ({ value: m.user_id, label: m.full_name }))}
                  selected={assignedList}
                  onChange={handleAssignMultiple}
                  placeholder="Selecionar responsáveis"
                />
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
                <span className={`text-xs px-2 py-1 rounded-full bg-muted border border-border font-medium`}>
                  {currentStage?.label}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  {post.type === 'reels' && <><Film className="w-3 h-3" /> Reels</>}
                  {post.type === 'carousel' && <><Images className="w-3 h-3" /> Carrossel</>}
                  {post.type === 'story' && <><Smartphone className="w-3 h-3" /> Story</>}
                  {post.type === 'image' && <><Image className="w-3 h-3" /> Imagem</>}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                  {(post.platform === 'instagram' || post.platform === 'both') && <Instagram className="w-3 h-3" />}
                  {(post.platform === 'facebook' || post.platform === 'both') && <Facebook className="w-3 h-3" />}
                </span>
              </div>

              {/* Preview content */}
              {(post.stage === 'content' || post.stage === 'design') && (post.ideaText || post.referenceLink) && (
                <div className="p-3 bg-muted/50 rounded-lg border border-border">
                  <p className="text-xs font-semibold text-foreground mb-2">Briefing / Ideia</p>
                  {post.ideaText && <p className="text-sm text-foreground whitespace-pre-wrap mb-2">{post.ideaText}</p>}
                  {post.referenceLink && (
                    <a href={post.referenceLink} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline break-all">
                      <Link2 className="w-3 h-3" /> {post.referenceLink}
                    </a>
                  )}
                </div>
              )}

              {(post.type === 'carousel' || post.type === 'story') && post.images && post.images.length > 0 ? (
                <PreviewCarousel images={post.images.filter(Boolean)} />
              ) : post.imageUrl ? (
                <img src={post.imageUrl} alt={post.title} className="w-full rounded-lg object-contain border border-border" />
              ) : (
                <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Sem mídia</span>
                </div>
              )}

              {post.type === 'reels' && post.videoUrl && (
                <video src={post.videoUrl} controls className="w-full rounded-lg max-h-64" />
              )}

              {post.type !== 'story' && (
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-xs font-medium text-secondary-foreground mb-1">Legenda:</p>
                  <p className="text-sm text-secondary-foreground whitespace-pre-wrap">{post.caption}</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>📅 {formatDateBR(post.scheduledDate)}</span>
                {post.scheduledTime && <span>⏰ {post.scheduledTime}</span>}
              </p>
              {assignedProfiles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  👤 {assignedProfiles.map(p => `${p.full_name} · ${p.job_title || p.priority}`).join(', ')}
                </p>
              )}

              {post.stage === 'client_approval' && post.approvalLink && (
                <button onClick={handleCopyLink} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Link2 className="w-3 h-3" /> Copiar link de aprovação
                </button>
              )}

              {/* Assign */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-semibold mb-2">Responsáveis</p>
                <MultiSelect
                  options={profiles.map(m => ({ value: m.user_id, label: m.full_name }))}
                  selected={assignedList}
                  onChange={handleAssignMultiple}
                  placeholder="Selecionar responsáveis"
                />
              </div>

              {/* Comments / Change Requests */}
              {post.comments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Solicitações de alteração
                  </p>
                  {post.comments.map(c => {
                    const delegated = c.delegatedTo ? profiles.find(p => p.user_id === c.delegatedTo) : null;
                    return (
                      <div key={c.id} className="p-2 bg-muted rounded-lg text-xs">
                        <p className="font-medium text-foreground">{c.author}</p>
                        <p className="text-muted-foreground mt-0.5">{c.text}</p>
                        {delegated && (
                          <p className="text-[10px] text-primary mt-1">→ Delegado para {delegated.full_name}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add comment for internal approval */}
              {(post.stage === 'internal_approval' || post.stage === 'adjustments') && (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-semibold text-foreground">Solicitar alteração</p>
                  <Textarea
                    placeholder="Descreva a alteração necessária..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                  <Select value={delegateTo} onValueChange={setDelegateTo}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Delegar para..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(m => (
                        <SelectItem key={m.user_id} value={m.user_id} className="text-xs">
                          {m.full_name} · {m.job_title || m.priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim()} className="w-full">
                    <Send className="w-3 h-3 mr-1" /> Enviar
                  </Button>
                </div>
              )}

              {/* Meta Publishing */}
              {post.stage === 'approved' && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePublishToMeta(true)} 
                    disabled={isPublishing}
                    className="flex-1 h-9 text-xs"
                  >
                    <Zap className="w-3 h-3 mr-1.5 text-amber-500 fill-amber-500" /> Publicar Agora
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handlePublishToMeta(false)} 
                    disabled={isPublishing}
                    className="flex-1 h-9 text-xs"
                  >
                    <CalendarDays className="w-3 h-3 mr-1.5" /> Agendar no Meta
                  </Button>
                </div>
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

      {/* Delete Post Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Excluir Post</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-5">
            <p className="text-sm text-muted-foreground">
              Você está prestes a excluir o post <strong className="text-foreground">"{post.title}"</strong>. Ele ficará na Lixeira e poderá ser restaurado em até 30 dias.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} className="flex-1">Cancelar</Button>
              <Button variant="destructive" onClick={handleDeletePost} className="flex-1">
                Excluir Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
