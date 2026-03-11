import { useState, useCallback, useEffect } from 'react';
import { Post, Client, KanbanStage, PostComment } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, getDocs, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
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

function dbClientToClient(id: string, c: DbClient): Client {
  return {
    id: id, name: c.name, logo: c.logo, color: c.color, postsCount: 0,
    meta_access_token: c.meta_access_token,
    meta_page_id: c.meta_page_id,
    meta_page_name: c.meta_page_name,
    meta_ig_account_id: c.meta_ig_account_id,
    meta_ig_account_name: c.meta_ig_account_name,
  };
}

function dbPostToPost(id: string, p: DbPost): Post {
  return {
    id: id,
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
    assignedTo: Array.isArray(p.assigned_to) ? p.assigned_to : (p.assigned_to ? [p.assigned_to] : []), // Ensure assignedTo is an array
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

  useEffect(() => {
    const clientsQuery = query(collection(db, 'clients'), orderBy('created_at'));
    const unsubscribeClients = onSnapshot(clientsQuery, (snapshot) => {
      const cData = snapshot.docs.map(doc => dbClientToClient(doc.id, doc.data() as DbClient));
      setClients(cData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching clients:", error);
      // If we're not logged in, we might not have permission to see ALL clients, 
      // but the snapshot may still trigger or we handle it gracefully.
      setLoading(false);
      if (auth.currentUser) toast.error("Erro ao carregar clientes");
    });

    const postsQuery = query(collection(db, 'posts'), orderBy('created_at'));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const pData = snapshot.docs.map(doc => dbPostToPost(doc.id, doc.data() as DbPost));
      setAllPosts(pData);
    }, (error) => {
      console.error("Error fetching posts:", error);
      if (auth.currentUser) toast.error("Erro ao carregar posts");
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // We don't clear clients/posts here anymore because anonymous 
        // access is needed for the approval page.
        // setLoading(false) is already called in clients snapshot
        return;
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeClients();
      unsubscribePosts();
    };
  }, []);

  const addClient = useCallback(async (client: Omit<Client, 'id' | 'postsCount'>) => {
    try {
      const docRef = await addDoc(collection(db, 'clients'), {
        name: client.name,
        logo: client.logo,
        color: client.color,
        created_at: new Date().toISOString()
      });
      return { id: docRef.id, ...client, postsCount: 0 } as Client;
    } catch (error) {
      toast.error('Erro ao criar cliente');
      return null;
    }
  }, []);

  const updateClient = useCallback(async (clientId: string, data: Partial<Omit<Client, 'id'>>) => {
    const update: Record<string, any> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.logo !== undefined) update.logo = data.logo;
    if (data.color !== undefined) update.color = data.color;
    if (data.meta_access_token !== undefined) update.meta_access_token = data.meta_access_token;
    if (data.meta_page_id !== undefined) update.meta_page_id = data.meta_page_id;
    if (data.meta_page_name !== undefined) update.meta_page_name = data.meta_page_name;
    if (data.meta_ig_account_id !== undefined) update.meta_ig_account_id = data.meta_ig_account_id;
    if (data.meta_ig_account_name !== undefined) update.meta_ig_account_name = data.meta_ig_account_name;

    await updateDoc(doc(db, 'clients', clientId), update);
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    try {
      const batch = writeBatch(db);
      const postsQuery = query(collection(db, 'posts'), where('client_id', '==', clientId));
      const postDocs = await getDocs(postsQuery);

      postDocs.forEach((postDoc) => {
        batch.delete(postDoc.ref);
      });
      batch.delete(doc(db, 'clients', clientId));
      await batch.commit();

      toast.success('Cliente excluído!');
    } catch (error) {
      toast.error('Erro ao excluir cliente');
    }
  }, []);

  const addPost = useCallback(async (post: Omit<Post, 'id' | 'createdAt' | 'comments' | 'approvalLink'>) => {
    try {
      const newPostData = {
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
        assigned_to: post.assignedTo || [], // Ensure assignedTo is an array
        scheduled_date: post.scheduledDate,
        approval_link: null,
        comments: [],
        created_at: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'posts'), newPostData);
      return dbPostToPost(docRef.id, newPostData as unknown as DbPost);
    } catch (error) {
      toast.error('Erro ao criar post');
      return null;
    }
  }, []);

  const updatePost = useCallback(async (postId: string, data: Partial<Omit<Post, 'id'>>) => {
    const update: Record<string, any> = {};
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
    if (data.assignedTo !== undefined) update.assigned_to = data.assignedTo; // assignedTo is already an array
    if (data.scheduledDate !== undefined) update.scheduled_date = data.scheduledDate;
    if (data.approvalLink !== undefined) update.approval_link = data.approvalLink;
    if (data.comments !== undefined) update.comments = data.comments;

    await updateDoc(doc(db, 'posts', postId), update);
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    try {
      await updateDoc(doc(db, 'posts', postId), { stage: 'trash' });
      toast.success('Post movido para a lixeira!');
    } catch (error) {
      toast.error('Erro ao excluir post');
    }
  }, []);

  const restorePost = useCallback(async (postId: string) => {
    try {
      await updateDoc(doc(db, 'posts', postId), { stage: 'content' });
      toast.success('Post restaurado com sucesso!');
    } catch (error) {
      toast.error('Erro ao restaurar post');
    }
  }, []);

  const hardDeletePost = useCallback(async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
      toast.success('Post excluído definitivamente!');
    } catch (error) {
      toast.error('Erro ao excluir post definitivamente');
    }
  }, []);

  const emptyTrash = useCallback(async () => {
    try {
      const trashQuery = query(collection(db, 'posts'), where('stage', '==', 'trash'));
      const trashDocs = await getDocs(trashQuery);

      const batch = writeBatch(db);
      trashDocs.forEach((trashDoc) => {
        batch.delete(trashDoc.ref);
      });
      await batch.commit();

      toast.success('Lixeira esvaziada!');
    } catch (error) {
      toast.error('Erro ao esvaziar lixeira');
    }
  }, []);

  const movePost = useCallback(async (postId: string, newStage: KanbanStage) => {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    const update: Record<string, any> = { stage: newStage };

    if (newStage === 'client_approval') {
      const existingToken = allPosts.find(
        other => other.clientId === post.clientId && 
        ['client_approval', 'adjustments', 'approved', 'scheduled'].includes(other.stage) && 
        other.approvalLink
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

    await updateDoc(doc(db, 'posts', postId), update);
  }, [allPosts]);

  const assignPost = useCallback(async (postId: string, memberId: string) => {
    await updateDoc(doc(db, 'posts', postId), { assigned_to: memberId });
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
