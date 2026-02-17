import { useState, useCallback, useEffect } from 'react';
import { Post, Client, MOCK_POSTS, MOCK_CLIENTS, KanbanStage } from '@/lib/types';
import { toast } from 'sonner';

function loadState<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function useAppData() {
  const [clients, setClients] = useState<Client[]>(() => loadState('postflow_clients', MOCK_CLIENTS));
  const [posts, setPosts] = useState<Post[]>(() => loadState('postflow_posts', MOCK_POSTS));

  useEffect(() => {
    localStorage.setItem('postflow_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('postflow_posts', JSON.stringify(posts));
  }, [posts]);

  const addClient = useCallback((client: Omit<Client, 'id' | 'postsCount'>) => {
    const newClient: Client = { ...client, id: `c${Date.now()}`, postsCount: 0 };
    setClients(prev => [...prev, newClient]);
    return newClient;
  }, []);

  const updateClient = useCallback((clientId: string, data: Partial<Omit<Client, 'id'>>) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...data } : c));
  }, []);

  const addPost = useCallback((post: Omit<Post, 'id' | 'createdAt' | 'comments' | 'approvalLink'>) => {
    const newPost: Post = {
      ...post,
      id: `p${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      comments: [],
    };
    setPosts(prev => [...prev, newPost]);
    return newPost;
  }, []);

  const updatePost = useCallback((postId: string, data: Partial<Omit<Post, 'id'>>) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...data } : p));
  }, []);

  const movePost = useCallback((postId: string, newStage: KanbanStage) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const updated = { ...p, stage: newStage };
      if (newStage === 'client_approval') {
        const token = Math.random().toString(36).substring(2, 10);
        updated.approvalLink = token;
        const link = `${window.location.origin}/approve/${token}`;
        navigator.clipboard.writeText(link).then(() => {
          toast.success('Link de aprovação copiado para a área de transferência!');
        }).catch(() => {
          toast.info(`Link: ${link}`);
        });
      }
      return updated;
    }));
  }, []);

  const assignPost = useCallback((postId: string, memberId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, assignedTo: memberId } : p));
  }, []);

  const getClientPosts = useCallback((clientId: string) => {
    return posts.filter(p => p.clientId === clientId);
  }, [posts]);

  return { clients, posts, addClient, updateClient, addPost, updatePost, movePost, assignPost, getClientPosts };
}
