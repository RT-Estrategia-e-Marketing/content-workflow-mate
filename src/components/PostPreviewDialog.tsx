import { Post, KANBAN_STAGES, PostType, Platform, PostComment } from '@/lib/types';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useNotifications } from '@/hooks/useNotifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FileUpload from '@/components/FileUpload';
import DatePicker from '@/components/DatePicker';
import TimePicker from '@/components/TimePicker';
import { formatDateBR } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Link2, MessageSquare, Send, GripVertical, Upload, Smartphone, ChevronLeft, ChevronRight, Trash2, CalendarDays, Zap, Edit2, Image, Film, Images, Instagram, Facebook, X } from 'lucide-react';
import { useState, useRef, DragEvent, useEffect } from 'react';
import { toast } from 'sonner';
import { MultiSelect } from '@/components/ui/multi-select';
import { storage, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function PreviewCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  return (
    <div className="relative rounded-lg border border-border overflow-hidden bg-muted">
      <img src={images[idx]} alt={`Slide ${idx + 1}`} className="w-full object-contain" />
      {images.length > 1 && (
        <>
          <button onClick={() => setIdx((idx - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-background/80 rounded-full shadow hover:bg-background">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setIdx((idx + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-background/80 rounded-full shadow hover:bg-background">
            <ChevronRight className="w-4 h-4" />
          </button>
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
  const { clients, updatePost, deletePost } = useApp();
  const { profiles } = useProfiles();
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  
  // UI State
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Post Data State
  const [title, setTitle] = useState(post.title);
  const [caption, setCaption] = useState(post.caption);
  const [type, setType] = useState<PostType>(post.type);
  const [platform, setPlatform] = useState<Platform>(post.platform);
  const [date, setDate] = useState(post.scheduledDate);
  const [scheduledTime, setScheduledTime] = useState(post.scheduledTime || '12:00');
  const [mainImage, setMainImage] = useState(post.imageUrl);
  const [carouselImages, setCarouselImages] = useState<string[]>(post.images || []);
  const [videoUrl, setVideoUrl] = useState(post.videoUrl || '');
  const [ideaText, setIdeaText] = useState(post.ideaText || '');
  const [referenceLink, setReferenceLink] = useState(post.referenceLink || '');
  
  // Interaction State
  const [commentText, setCommentText] = useState('');
  const [delegateTo, setDelegateTo] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const multiFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) return;
    setTitle(post.title);
    setCaption(post.caption);
    setType(post.type);
    setPlatform(post.platform);
    setDate(post.scheduledDate);
    setScheduledTime(post.scheduledTime || '12:00');
    setMainImage(post.imageUrl);
    setCarouselImages(post.images || []);
    setVideoUrl(post.videoUrl || '');
    setIdeaText(post.ideaText || '');
    setReferenceLink(post.referenceLink || '');
  }, [post, editing]);

  const assignedList = post.assignedTo || [];
  const assignedProfiles = profiles.filter(m => assignedList.includes(m.user_id));
  const currentStage = KANBAN_STAGES.find(s => s.key === post.stage);

  const handleSave = async () => {
    let finalImageUrl = mainImage;
    let finalImages = carouselImages;
    if (type === 'carousel' || type === 'story') {
      finalImageUrl = carouselImages[0] || '';
    }

    let finalScheduledUnix: number | undefined = undefined;
    if (date && scheduledTime) {
      const dateObj = new Date(`${date}T${scheduledTime}:00`);
      if (!isNaN(dateObj.getTime())) finalScheduledUnix = Math.floor(dateObj.getTime() / 1000);
    }

    await updatePost(post.id, {
      title, 
      caption: type === 'story' ? '' : caption, 
      type, 
      platform,
      scheduledDate: date,
      scheduledTime,
      scheduledUnix: finalScheduledUnix,
      ideaText: ideaText.trim() || undefined,
      referenceLink: referenceLink.trim() || undefined,
      imageUrl: finalImageUrl,
      images: finalImages,
      videoUrl: type === 'reels' ? videoUrl : undefined,
    });
    setEditing(false);
    toast.success('Alterações salvas!');
  };

  const resetEdit = () => {
    setEditing(false);
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
  };

  const handleCopyLink = () => {
    if (!post.approvalLink) return toast.error('Link não disponível');
    const link = `${window.location.origin}/approve/${post.approvalLink}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const handlePublishToMeta = async (publishNow: boolean = false) => {
    const client = clients.find(c => c.id === post.clientId);
    if (!client?.meta_access_token) return toast.error('Integração Meta não configurada.');

    let scheduledUnix: number | undefined = undefined;
    const now = new Date();
    
    if (!publishNow) {
      if (!date || !scheduledTime) {
        return toast.error("Data e horário são obrigatórios para agendar.");
      }

      const dateObj = new Date(`${date}T${scheduledTime}:00`);
      console.log('DEBUG AGENDAMENTO:', { 
        inputDate: date, 
        inputTime: scheduledTime, 
        calculatedDateObj: dateObj.toString(),
        now: now.toString() 
      });

      if (!isNaN(dateObj.getTime())) {
        scheduledUnix = Math.floor(dateObj.getTime() / 1000);
        const nowUnix = Math.floor(now.getTime() / 1000);
        
        // Se for para agendar, e o horário ainda NÃO passou
        if (scheduledUnix > nowUnix) {
          setIsPublishing(true);
          try {
            await updatePost(post.id, { 
              stage: 'scheduled', 
              scheduledUnix,
              scheduledDate: date,
              scheduledTime
            });
            toast.success('Post agendado no sistema PostFlow! 🚀');
            onOpenChange(false);
            return; // INTERROMPE AQUI - NÃO PUBLICA AGORA
          } catch (error) {
            toast.error('Erro ao salvar agendamento interno.');
            setIsPublishing(false);
            return;
          }
        } else {
          toast.warning(`Horário selecionado (${scheduledTime}) já passou. Publicando AGORA...`);
          scheduledUnix = undefined;
        }
      } else {
        return toast.error("Data ou horário inválidos.");
      }
    }

    // MODO PUBLICAÇÃO IMEDIATA (Via Backend)
    setIsPublishing(true);
    try {
      const publishPostNow = httpsCallable(functions, 'publishPostNow');
      const result: any = await publishPostNow({ postId: post.id });
      if (result.data.success) {
        toast.success('Post publicado com sucesso via PostFlow! ✨');
          onOpenChange(false);
      } else {
        throw new Error(result.data.message || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Publish Error:', error);
      const msg = error.message || 'Erro ao processar publicação.';
      if (msg.includes('whitelist')) {
        toast.error("Erro de Whitelist: Se seu App na Meta está em modo 'Live', mude para 'Development' para testar.");
      } else {
        toast.error(`Falha ao publicar: ${msg}`);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const authorName = profiles.find(p => p.user_id === user?.uid)?.full_name || 'Usuário';
    const newComment: PostComment = {
      id: `cm${Date.now()}`,
      author: authorName,
      authorId: user?.uid,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
      delegatedTo: delegateTo || undefined,
    };
    await updatePost(post.id, { comments: [...post.comments, newComment] });
    
    if (delegateTo) {
      createNotification({
        user_id: delegateTo,
        post_id: post.id,
        client_id: post.clientId,
        type: 'change_request',
        message: `Alteração solicitada no post "${post.title}": ${commentText.trim()}`,
      });
      toast.success('Alteração delegada com sucesso.');
    }
    setCommentText('');
    setDelegateTo('');
  };

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
      const path = `post-media/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      try {
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploads.push(url);
      } catch (err) {
        toast.error(`Falha no upload de ${file.name}`);
      }
    }
    setCarouselImages(prev => [...prev, ...uploads]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) { resetEdit(); onOpenChange(false); } }}>
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
                  <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {editing ? (
            <div className="space-y-4 mt-2">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" />
              {(post.stage === 'content' || post.stage === 'design') && (
                <div className="space-y-2 border border-border p-3 rounded-md bg-muted/30">
                  <p className="text-xs font-semibold">Briefing / Ideia</p>
                  <Textarea placeholder="Ideia para o post..." value={ideaText} onChange={e => setIdeaText(e.target.value)} rows={3} />
                  <Input placeholder="Link de referência..." value={referenceLink} onChange={e => setReferenceLink(e.target.value)} />
                </div>
              )}
              {type !== 'story' && (
                <Textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Legenda..." rows={4} />
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

              {type === 'image' && <FileUpload bucket="post-media" onUpload={setMainImage} label="Imagem" preview={mainImage} />}
              
              {type === 'reels' && (
                <div className="space-y-2">
                  <FileUpload bucket="post-media" onUpload={setMainImage} label="Capa do Reels" preview={mainImage} />
                  <FileUpload bucket="post-media" onUpload={setVideoUrl} label="Vídeo do Reels" preview={videoUrl} accept="video/*" />
                </div>
              )}

              {(type === 'carousel' || type === 'story') && (
                <div className="space-y-2">
                  <input ref={multiFileRef} type="file" accept="image/*" multiple onChange={handleMultiFileUpload} className="hidden" />
                  <div className="grid grid-cols-3 gap-2">
                    {carouselImages.map((img, i) => (
                      <div key={i} draggable onDragStart={(e) => handleCarouselDragStart(e, i)} onDragOver={e => e.preventDefault()} onDrop={e => handleCarouselDrop(e, i)} className="relative group rounded border overflow-hidden">
                        <img src={img} className="w-full aspect-square object-cover" />
                        <button onClick={() => setCarouselImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => multiFileRef.current?.click()} className="w-full"><Upload className="w-3 h-3 mr-1" /> Adicionar Mídia</Button>
                </div>
              )}

              <div className="flex gap-3">
                <DatePicker value={date} onChange={setDate} />
                <TimePicker value={scheduledTime} onChange={setScheduledTime} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={resetEdit} className="flex-1">Cancelar</Button>
                <Button onClick={handleSave} className="flex-1">Salvar</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-1 rounded-full bg-muted border border-border font-medium">{currentStage?.label}</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  {post.type === 'reels' && <><Film className="w-3 h-3" /> Reels</>}
                  {post.type === 'carousel' && <><Images className="w-3 h-3" /> Carrossel</>}
                  {post.type === 'image' && <><Image className="w-3 h-3" /> Imagem</>}
                  {post.type === 'story' && <><Smartphone className="w-3 h-3" /> Story</>}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                  {(post.platform === 'instagram' || post.platform === 'both') && <Instagram className="w-3 h-3" />}
                  {(post.platform === 'facebook' || post.platform === 'both') && <Facebook className="w-3 h-3" />}
                </span>
              </div>

              {post.imageUrl && (type === 'carousel' || type === 'story' ? <PreviewCarousel images={post.images || []} /> : <img src={post.imageUrl} className="w-full rounded-lg border object-contain" />)}
              {post.type === 'reels' && post.videoUrl && <video src={post.videoUrl} controls className="w-full rounded-lg max-h-64" />}

              {post.caption && (
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-xs font-medium text-secondary-foreground mb-1">Legenda:</p>
                  <p className="text-sm text-secondary-foreground whitespace-pre-wrap">{post.caption}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <p>📅 {formatDateBR(post.scheduledDate)} {post.scheduledTime && `· ⏰ ${post.scheduledTime}`}</p>
                {post.approvalLink && <button onClick={handleCopyLink} className="text-primary hover:underline italic">Copiar link de aprovação</button>}
              </div>

              {post.comments.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-semibold flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Solicitações de alteração</p>
                  {post.comments.map(c => (
                    <div key={c.id} className="p-2 bg-muted rounded text-xs">
                      <p className="font-medium">{c.author} {c.delegatedTo && `→ Delegado`}</p>
                      <p className="text-muted-foreground mt-0.5">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {(post.stage === 'internal_approval' || post.stage === 'adjustments') && (
                <div className="space-y-2 border-t pt-3">
                  <Textarea placeholder="Nova solicitação..." value={commentText} onChange={e => setCommentText(e.target.value)} rows={2} className="text-xs" />
                  <Select value={delegateTo} onValueChange={setDelegateTo}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Delegar para..." /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(m => <SelectItem key={m.user_id} value={m.user_id} className="text-xs">{m.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleAddComment} className="w-full"><Send className="w-3 h-3 mr-1" /> Enviar</Button>
                </div>
              )}

              {post.stage === 'approved' && (
                <div className="flex flex-col gap-2 pt-2 border-t">
                  <Button onClick={() => handlePublishToMeta(true)} disabled={isPublishing} className="w-full gap-2">
                    <Zap className="w-4 h-4 fill-current" /> Publicar Agora
                  </Button>
                  <Button variant="outline" onClick={() => handlePublishToMeta(false)} disabled={isPublishing} className="w-full gap-2">
                    <CalendarDays className="w-4 h-4" /> Agendar no Meta
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive font-display">Excluir Post</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Deseja realmente excluir este post?</p>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="flex-1">Cancelar</Button>
            <Button variant="destructive" onClick={() => { deletePost(post.id); onOpenChange(false); }} className="flex-1">Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
