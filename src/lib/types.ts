export type PostType = 'image' | 'reels' | 'carousel' | 'story';
export type Platform = 'instagram' | 'facebook' | 'both';
export type KanbanStage = 'content' | 'design' | 'internal_approval' | 'adjustments' | 'client_approval' | 'approved' | 'scheduled' | 'trash';

export interface PostComment {
  id: string;
  author: string;
  authorId?: string;
  text: string;
  createdAt: string;
  delegatedTo?: string;
}

export interface Post {
  id: string;
  clientId: string;
  title: string;
  caption: string;
  imageUrl: string;
  images?: string[];
  videoUrl?: string;
  type: PostType;
  platform: Platform;
  stage: KanbanStage;
  ideaText?: string;
  referenceLink?: string;
  assignedTo?: string[];
  scheduledDate: string;
  scheduledTime?: string;
  scheduledUnix?: number; // Added
  videoThumbnailUrl?: string;
  approvalLink?: string;
  comments: PostComment[];
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  logo: string;
  color: string;
  postsCount: number;
  meta_access_token?: string;
  meta_page_id?: string;
  meta_page_name?: string;
  meta_ig_account_id?: string;
  meta_ig_account_name?: string;
}

export const KANBAN_STAGES: { key: KanbanStage; label: string }[] = [
  { key: 'content', label: 'Conteúdo' },
  { key: 'design', label: 'Design' },
  { key: 'internal_approval', label: 'Aprovação Interna' },
  { key: 'adjustments', label: 'Ajustes' },
  { key: 'client_approval', label: 'Aprovação do Cliente' },
  { key: 'approved', label: 'Aprovado' },
  { key: 'scheduled', label: 'Agendado' },
];

export const MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'Café Artisan', logo: '☕', color: 'hsl(30, 60%, 50%)', postsCount: 12 },
  { id: 'c2', name: 'FitLife Gym', logo: '💪', color: 'hsl(145, 60%, 42%)', postsCount: 8 },
  { id: 'c3', name: 'TechNova', logo: '🚀', color: 'hsl(260, 60%, 58%)', postsCount: 15 },
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'p1', clientId: 'c1', title: 'Promo Café da Manhã', caption: '☕ Comece o dia com o melhor café artesanal da cidade! De segunda a sexta, ganhe 20% de desconto no combo café + pão de queijo.\n\n#CaféArtisan #PromoçãoDaManhã #CaféEspecial',
    imageUrl: '', type: 'image', platform: 'instagram', stage: 'content', assignedTo: [], scheduledDate: '2026-02-18', comments: [], createdAt: '2026-02-10',
  },
  {
    id: 'p2', clientId: 'c1', title: 'Receita do Cappuccino', caption: '🎬 Veja como nosso barista prepara o cappuccino perfeito!\n\n#Reels #CaféArtisan #Cappuccino',
    imageUrl: '', type: 'reels', platform: 'instagram', stage: 'internal_approval', assignedTo: [], scheduledDate: '2026-02-20', comments: [], createdAt: '2026-02-09',
  },
  {
    id: 'p3', clientId: 'c2', title: 'Treino HIIT', caption: '🔥 Treino HIIT de 30 minutos para queimar calorias! Arraste para ver a sequência completa.\n\n#FitLife #HIIT #Treino',
    imageUrl: '', type: 'carousel', platform: 'both', stage: 'client_approval', assignedTo: [], scheduledDate: '2026-02-22', approvalLink: 'abc123', comments: [], createdAt: '2026-02-08',
  },
  {
    id: 'p4', clientId: 'c3', title: 'Lançamento App v2.0', caption: '🚀 O futuro chegou! TechNova App 2.0 com IA integrada. Baixe agora!\n\n#TechNova #Inovação #App',
    imageUrl: '', type: 'image', platform: 'facebook', stage: 'approved', scheduledDate: '2026-02-15', comments: [], createdAt: '2026-02-05',
  },
  {
    id: 'p5', clientId: 'c2', title: 'Dicas de Nutrição', caption: '🥗 5 dicas de nutrição para maximizar seus resultados!\n\n#FitLife #Nutrição #Saúde',
    imageUrl: '', type: 'carousel', platform: 'facebook', stage: 'adjustments', assignedTo: [], scheduledDate: '2026-02-25', comments: [{ id: 'cm1', author: 'Cliente', text: 'Trocar a foto 3 por uma com mais cores', createdAt: '2026-02-11' }], createdAt: '2026-02-07',
  },
];
