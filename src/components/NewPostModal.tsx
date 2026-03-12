import { useState, useRef, DragEvent } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useNotifications } from '@/hooks/useNotifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostType, Platform } from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import DatePicker from '@/components/DatePicker';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { Plus, Upload, X, GripVertical } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';

interface NewPostModalProps {
    clientId?: string;
    initialDate?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trigger?: React.ReactNode;
}

export default function NewPostModal({ clientId: initialClientId, initialDate, open, onOpenChange, trigger }: NewPostModalProps) {
    const { clients, addPost } = useApp();
    const { user } = useAuth();
    const { profiles } = useProfiles();
    const { createNotification } = useNotifications();

    const [clientId, setClientId] = useState(initialClientId || '');
    const [title, setTitle] = useState('');
    const [caption, setCaption] = useState('');
    const [ideaText, setIdeaText] = useState('');
    const [referenceLink, setReferenceLink] = useState('');
    const [type, setType] = useState<PostType>('image');
    const [platform, setPlatform] = useState<Platform>('instagram');
    const [date, setDate] = useState(initialDate || '');
    const [mainImage, setMainImage] = useState('');
    const [carouselImages, setCarouselImages] = useState<string[]>([]);
    const [reelsCover, setReelsCover] = useState('');
    const [reelsVideo, setReelsVideo] = useState('');
    const [scheduledTime, setScheduledTime] = useState('12:00');
    const [assignedTo, setAssignedTo] = useState<string[]>([]);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const multiFileRef = useRef<HTMLInputElement>(null);

    // Re-sync initial date when opened
    if (open && initialDate && !date) {
        setDate(initialDate);
    }

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

    const handleAdd = () => {
        if (!title.trim() || !clientId) {
            toast.error('Preencha o cliente e o título');
            return;
        }

        let imageUrl = '';
        let images: string[] | undefined;
        let videoUrl: string | undefined;
        if (type === 'image') { imageUrl = mainImage; }
        else if (type === 'carousel' || type === 'story') { imageUrl = carouselImages[0] || ''; images = carouselImages; }
        else if (type === 'reels') { imageUrl = reelsCover; videoUrl = reelsVideo; }

        addPost({
            clientId,
            title: title.trim(),
            caption: type === 'story' ? '' : caption,
            ideaText: ideaText.trim() || undefined,
            referenceLink: referenceLink.trim() || undefined,
            imageUrl,
            images,
            videoUrl,
            type,
            platform,
            stage: 'content',
            scheduledDate: date || new Date().toISOString().split('T')[0],
            scheduledTime,
            videoThumbnailUrl: type === 'reels' ? reelsCover : undefined,
            assignedTo: assignedTo.length > 0 ? assignedTo : undefined
        }).then(newPost => {
            if (newPost && assignedTo.length > 0 && user) {
                assignedTo.forEach(uid => {
                    if (uid !== user.uid) {
                        const clientName = clients.find(c => c.id === clientId)?.name || 'Cliente';
                        const authorName = profiles.find(p => p.user_id === user.uid)?.full_name || 'Um usuário';
                        createNotification({
                            user_id: uid,
                            post_id: newPost.id,
                            client_id: clientId,
                            type: 'delegation',
                            message: `O usuário ${authorName} atribuiu você a um novo post: "${newPost.title}" de ${clientName}`
                        });
                    }
                });
            }
        });

        // Reset form
        setTitle(''); setCaption(''); setDate(''); setMainImage('');
        setIdeaText(''); setReferenceLink('');
        setCarouselImages([]); setReelsCover(''); setReelsVideo('');
        setAssignedTo([]);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-display">Criar Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    {!initialClientId && (
                        <Select value={clientId} onValueChange={setClientId}>
                            <SelectTrigger><SelectValue placeholder="Selecione o Cliente" /></SelectTrigger>
                            <SelectContent>
                                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                    <Input placeholder="Título do post" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />

                    <div className="space-y-2 border border-border p-3 rounded-md bg-muted/30">
                        <p className="text-xs font-semibold">Briefing / Ideia</p>
                        <Textarea placeholder="Texto de ideia para o post..." value={ideaText} onChange={e => setIdeaText(e.target.value)} rows={3} />
                        <Input placeholder="Link de referência..." value={referenceLink} onChange={e => setReferenceLink(e.target.value)} />
                    </div>

                    {type !== 'story' && (
                        <Textarea placeholder="Legenda..." value={caption} onChange={e => setCaption(e.target.value)} rows={4} maxLength={2200} />
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <Select value={type} onValueChange={(v) => { setType(v as PostType); setMainImage(''); setCarouselImages([]); setReelsCover(''); setReelsVideo(''); }}>
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

                    {type === 'image' && (
                        <FileUpload bucket="post-media" onUpload={setMainImage} label="Upload da imagem do post" preview={mainImage} />
                    )}
                    {type === 'reels' && (
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground font-medium">Capa do Reels</p>
                            <FileUpload bucket="post-media" onUpload={setReelsCover} label="Upload da capa" preview={reelsCover} />
                            <p className="text-xs text-muted-foreground font-medium">Vídeo do Reels</p>
                            <FileUpload bucket="post-media" onUpload={setReelsVideo} label="Upload do vídeo" preview={reelsVideo} accept="video/*" />
                        </div>
                    )}
                    {(type === 'carousel' || type === 'story') && (
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground font-medium">{type === 'story' ? 'Cards do Story' : 'Imagens do Carrossel'}</p>
                            <input ref={multiFileRef} type="file" accept="image/*" multiple onChange={handleMultiFileUpload} className="hidden" />
                            <div className="grid grid-cols-3 gap-2">
                                {carouselImages.map((img, i) => (
                                    <div key={i} draggable onDragStart={(e) => handleCarouselDragStart(e, i)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleCarouselDrop(e, i)} className={`relative group rounded-lg border-2 ${dragIdx === i ? 'border-primary opacity-50' : 'border-border'} overflow-hidden cursor-grab active:cursor-grabbing`}>
                                        {img ? <img src={img} alt={`Slide ${i + 1}`} className="w-full aspect-square object-cover" /> : <div className="w-full aspect-square bg-muted flex items-center justify-center"><Upload className="w-4 h-4 text-muted-foreground" /></div>}
                                        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-1">
                                            <span className="bg-foreground/70 text-background text-[9px] rounded px-1">{i + 1}</span>
                                            <button onClick={() => setCarouselImages(prev => prev.filter((_, idx) => idx !== i))} className="w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>
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
                    <div className="flex gap-2 items-center">
                        <div className="flex-1">
                            <DatePicker value={date} onChange={setDate} />
                        </div>
                        <div className="w-32">
                            <Input 
                                type="time" 
                                value={scheduledTime} 
                                onChange={e => setScheduledTime(e.target.value)}
                                className="h-10"
                            />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">Responsáveis</p>
                        <MultiSelect
                            options={profiles.map(m => ({ value: m.user_id, label: m.full_name }))}
                            selected={assignedTo}
                            onChange={setAssignedTo}
                            placeholder="Selecionar responsáveis"
                        />
                    </div>
                    <Button onClick={handleAdd} className="w-full">Criar Post</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
