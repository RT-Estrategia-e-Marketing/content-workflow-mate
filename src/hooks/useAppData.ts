import { useState, useCallback, useEffect } from 'react';
import { Post, Client, KanbanStage, PostComment } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DbClient {
  id: string;
  name: string;
  logo: string;
  color: string;
  created_at: string;
}

interface DbPost {
  id: string;
  client_id: string;
  title: string;
  caption: string;
  image_url: string;
  images: string[] | null;
  video_url: string | null;
  type: string;
  platform: string;
  stage: string;
  assigned_to: string | null;
  scheduled_date: string;
  approval_link: string | null;
  comments: PostComment[];
  created_at: string;
}

function dbClientToClient(c: DbClient): Client {
  return { id: c.id, name: c.name, logo: c.logo, color: c.color, postsCount: 0 };
}

function dbPostToPost(p: DbPost): Post {
  return {
    id: p.id,
    clientId: p.client_id,
    title: p.title,
    caption: p.caption,
    imageUrl: p.image_url,
    images: p.images || undefined,
    videoUrl: p.video_url || undefined,
    type: p.type as Post['type'],
    platform: p.platform as Post['platform'],
    stage: p.stage as KanbanStage,
    assignedTo: p.assigned_to || undefined,
    scheduledDate: p.scheduled_date,
    approvalLink: p.approval_link || undefined,
    comments: (p.comments || []) as PostComment[],
    createdAt: p.created_at.split('T')[0],
  };
}

export function useAppData() {
  const [clients, setClients] = useState<Client[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  const fetchData = useCallback(async () => {
    const [{ data: cData }, { data: pData }] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: true }),
      supabase.from('posts').select('*').order('created_at', { ascending: true }),
    ]);
    if (cData) setClients((cData as unknown as DbClient[]).map(dbClientToClient));
    if (pData) setPosts((pData as unknown as DbPost[]).map(dbPostToPost));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('app-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const addClient = useCallback(async (client: Omit<Client, 'id' | 'postsCount'>) => {
    const { data, error } = await supabase.from('clients').insert({
      name: client.name,
      logo: client.logo,
      color: client.color,
    }).select().single();
    if (error) { toast.error('Erro ao criar cliente'); return null; }
    const newClient = dbClientToClient(data as DbClient);
    setClients(prev => [...prev, newClient]);
    return newClient;
  }, []);

  const updateClient = useCallback(async (clientId: string, data: Partial<Omit<Client, 'id'>>) => {
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.logo !== undefined) update.logo = data.logo;
    if (data.color !== undefined) update.color = data.color;
    await supabase.from('clients').update(update).eq('id', clientId);
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...data } : c));
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) { toast.error('Erro ao excluir cliente'); return; }
    setClients(prev => prev.filter(c => c.id !== clientId));
    setPosts(prev => prev.filter(p => p.clientId !== clientId));
    toast.success('Cliente excluído!');
  }, []);

  const addPost = useCallback(async (post: Omit<Post, 'id' | 'createdAt' | 'comments' | 'approvalLink'>) => {
    const { data, error } = await supabase.from('posts').insert({
      client_id: post.clientId,
      title: post.title,
      caption: post.caption,
      image_url: post.imageUrl,
      images: post.images || null,
      video_url: post.videoUrl || null,
      type: post.type,
      platform: post.platform,
      stage: post.stage,
      assigned_to: post.assignedTo || null,
      scheduled_date: post.scheduledDate,
    }).select().single();
    if (error) { toast.error('Erro ao criar post'); return null; }
    const newPost = dbPostToPost(data as unknown as DbPost);
    setPosts(prev => [...prev, newPost]);
    return newPost;
  }, []);

  const updatePost = useCallback(async (postId: string, data: Partial<Omit<Post, 'id'>>) => {
    const update: Record<string, unknown> = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.caption !== undefined) update.caption = data.caption;
    if (data.imageUrl !== undefined) update.image_url = data.imageUrl;
    if (data.images !== undefined) update.images = data.images;
    if (data.videoUrl !== undefined) update.video_url = data.videoUrl;
    if (data.type !== undefined) update.type = data.type;
    if (data.platform !== undefined) update.platform = data.platform;
    if (data.stage !== undefined) update.stage = data.stage;
    if (data.assignedTo !== undefined) update.assigned_to = data.assignedTo;
    if (data.scheduledDate !== undefined) update.scheduled_date = data.scheduledDate;
    if (data.approvalLink !== undefined) update.approval_link = data.approvalLink;
    if (data.comments !== undefined) update.comments = data.comments;
    await supabase.from('posts').update(update).eq('id', postId);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...data } : p));
  }, []);

  const movePost = useCallback(async (postId: string, newStage: KanbanStage) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const update: Record<string, unknown> = { stage: newStage };

    if (newStage === 'client_approval') {
      const existingToken = posts.find(
        other => other.clientId === post.clientId && other.stage === 'client_approval' && other.approvalLink
      )?.approvalLink;
      const token = existingToken || `${post.clientId}-${Math.random().toString(36).substring(2, 10)}`;
      update.approval_link = token;

      const link = `${window.location.origin}/approve/${token}`;
      navigator.clipboard.writeText(link).then(() => {
        toast.success('Link de aprovação copiado para a área de transferência!');
      }).catch(() => {
        toast.info(`Link: ${link}`);
      });
    }

    await supabase.from('posts').update(update).eq('id', postId);
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return { ...p, stage: newStage, approvalLink: (update.approval_link as string) || p.approvalLink };
    }));
  }, [posts]);

  const assignPost = useCallback(async (postId: string, memberId: string) => {
    await supabase.from('posts').update({ assigned_to: memberId }).eq('id', postId);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, assignedTo: memberId } : p));
  }, []);

  const getClientPosts = useCallback((clientId: string) => {
    return posts.filter(p => p.clientId === clientId);
  }, [posts]);

  return { clients, posts, loading, addClient, updateClient, deleteClient, addPost, updatePost, movePost, assignPost, getClientPosts };
}
