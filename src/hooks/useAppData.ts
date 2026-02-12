import { useState, useCallback } from 'react';
import { Post, Client, MOCK_POSTS, MOCK_CLIENTS, KanbanStage } from '@/lib/types';

export function useAppData() {
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);

  const addClient = useCallback((client: Omit<Client, 'id' | 'postsCount'>) => {
    const newClient: Client = { ...client, id: `c${Date.now()}`, postsCount: 0 };
    setClients(prev => [...prev, newClient]);
    return newClient;
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

  const movePost = useCallback((postId: string, newStage: KanbanStage) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const updated = { ...p, stage: newStage };
      if (newStage === 'client_approval') {
        updated.approvalLink = Math.random().toString(36).substring(2, 10);
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

  return { clients, posts, addClient, addPost, movePost, assignPost, getClientPosts };
}
