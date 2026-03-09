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
  meta_access_token?: string;
  meta_page_id?: string;
  meta_page_name?: string;
  meta_ig_account_id?: string;
  meta_ig_account_name?: string;
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
  idea_text: string | null;
  reference_link: string | null;
  assigned_to: string | null;
  scheduled_date: string;
  approval_link: string | null;
  comments: PostComment[];
  created_at: string;
}

function dbClientToClient(c: DbClient): Client {
  return {
    id: c.id, name: c.name, logo: c.logo, color: c.color, postsCount: 0,
    meta_access_token: c.meta_access_token,
    meta_page_id: c.meta_page_id,
    meta_page_name: c.meta_page_name,
    meta_ig_account_id: c.meta_ig_account_id,
    meta_ig_account_name: c.meta_ig_account_name,
  };
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
    ideaText: p.idea_text || undefined,
    referenceLink: p.reference_link || undefined,
    assignedTo: p.assigned_to || undefined,
    scheduledDate: p.scheduled_date,
    approvalLink: p.approval_link || undefined,
    comments: (p.comments || []) as PostComment[],
    createdAt: p.created_at.split('T')[0],
  };
}

export function useAppData() {
  const [clients, setClients] = useState<Client[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const posts = allPosts.filter(p => p.stage !== 'trash');
  const trashedPosts = allPosts.filter(p => p.stage === 'trash');

  // Fetch data
  const fetchData = useCallback(async () => {
    // Only fetch if session exists
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setClients([]);
      setAllPosts([]);
      setLoading(false);
      return;
    }

    const [{ data: cData }, { data: pData }] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: true }),
      supabase.from('posts').select('*').order('created_at', { ascending: true }),
    ]);
    if (cData) setClients((cData as unknown as DbClient[]).map(dbClientToClient));
    if (pData) setAllPosts((pData as unknown as DbPost[]).map(dbPostToPost));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Handle auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchData();
    });
    return () => { subscription.unsubscribe(); };
  }, [fetchData]);

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
    if (data.meta_access_token !== undefined) update.meta_access_token = data.meta_access_token;
    if (data.meta_page_id !== undefined) update.meta_page_id = data.meta_page_id;
    if (data.meta_page_name !== undefined) update.meta_page_name = data.meta_page_name;
    if (data.meta_ig_account_id !== undefined) update.meta_ig_account_id = data.meta_ig_account_id;
    if (data.meta_ig_account_name !== undefined) update.meta_ig_account_name = data.meta_ig_account_name;

    await supabase.from('clients').update(update).eq('id', clientId);
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...data } : c));
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    // Delete posts first
    await supabase.from('posts').delete().eq('client_id', clientId);
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) { toast.error('Erro ao excluir cliente'); return; }
    setClients(prev => prev.filter(c => c.id !== clientId));
    setAllPosts(prev => prev.filter(p => p.clientId !== clientId));
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
      idea_text: post.ideaText || null,
      reference_link: post.referenceLink || null,
      assigned_to: post.assignedTo || null,
      scheduled_date: post.scheduledDate,
    }).select().single();
    if (error) { toast.error('Erro ao criar post'); return null; }
    const newPost = dbPostToPost(data as unknown as DbPost);
    setAllPosts(prev => [...prev, newPost]);
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
    if (data.ideaText !== undefined) update.idea_text = data.ideaText;
    if (data.referenceLink !== undefined) update.reference_link = data.referenceLink;
    if (data.assignedTo !== undefined) update.assigned_to = data.assignedTo;
    if (data.scheduledDate !== undefined) update.scheduled_date = data.scheduledDate;
    if (data.approvalLink !== undefined) update.approval_link = data.approvalLink;
    if (data.comments !== undefined) update.comments = data.comments;
    await supabase.from('posts').update(update).eq('id', postId);
    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, ...data } : p));
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    // Soft delete (move to trash stage)
    const { error } = await supabase.from('posts').update({ stage: 'trash' }).eq('id', postId);
    if (error) { toast.error('Erro ao excluir post'); return; }
    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, stage: 'trash' } : p));
    toast.success('Post movido para a lixeira!');
  }, []);

  const restorePost = useCallback(async (postId: string) => {
    // Restore to content stage or previous known stage? Best is to content stage.
    const { error } = await supabase.from('posts').update({ stage: 'content' }).eq('id', postId);
    if (error) { toast.error('Erro ao restaurar post'); return; }
    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, stage: 'content' } : p));
    toast.success('Post restaurado com sucesso!');
  }, []);

  const hardDeletePost = useCallback(async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) { toast.error('Erro ao excluir post definitivamente'); return; }
    setAllPosts(prev => prev.filter(p => p.id !== postId));
    toast.success('Post excluído definitivamente!');
  }, []);

  const emptyTrash = useCallback(async () => {
    const { error } = await supabase.from('posts').delete().eq('stage', 'trash');
    if (error) { toast.error('Erro ao esvaziar lixeira'); return; }
    setAllPosts(prev => prev.filter(p => p.stage !== 'trash'));
    toast.success('Lixeira esvaziada!');
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
    setAllPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return { ...p, stage: newStage, approvalLink: (update.approval_link as string) || p.approvalLink };
    }));
  }, [allPosts]);

  const assignPost = useCallback(async (postId: string, memberId: string) => {
    await supabase.from('posts').update({ assigned_to: memberId }).eq('id', postId);
    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, assignedTo: memberId } : p));
  }, []);

  const getClientPosts = useCallback((clientId: string) => {
    return allPosts.filter(p => p.clientId === clientId && p.stage !== 'trash');
  }, [allPosts]);

  return {
    clients, posts, trashedPosts, loading, addClient, updateClient, deleteClient,
    addPost, updatePost, deletePost, restorePost, hardDeletePost, emptyTrash,
    movePost, assignPost, getClientPosts
  };
}
