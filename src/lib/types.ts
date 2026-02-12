export type PostType = 'image' | 'reels' | 'carousel';
export type Platform = 'instagram' | 'facebook';
export type KanbanStage = 'content' | 'internal_approval' | 'adjustments' | 'client_approval' | 'approved';

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

export interface PostComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Post {
  id: string;
  clientId: string;
  title: string;
  caption: string;
  imageUrl: string;
  images?: string[];
  type: PostType;
  platform: Platform;
  stage: KanbanStage;
  assignedTo?: string;
  scheduledDate: string;
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
}

export const KANBAN_STAGES: { key: KanbanStage; label: string; color: string; borderColor: string }[] = [
  { key: 'content', label: 'Conteúdo', color: 'bg-kanban-content', borderColor: 'border-kanban-content-border' },
  { key: 'internal_approval', label: 'Aprovação Interna', color: 'bg-kanban-internal', borderColor: 'border-kanban-internal-border' },
  { key: 'adjustments', label: 'Ajustes', color: 'bg-kanban-adjustments', borderColor: 'border-kanban-adjustments-border' },
  { key: 'client_approval', label: 'Aprovação do Cliente', color: 'bg-kanban-client', borderColor: 'border-kanban-client-border' },
  { key: 'approved', label: 'Aprovado', color: 'bg-kanban-approved', borderColor: 'border-kanban-approved-border' },
];

export const TEAM_MEMBERS: TeamMember[] = [
  { id: '1', name: 'Ana Silva', avatar: '', role: 'Designer' },
  { id: '2', name: 'Carlos Lima', avatar: '', role: 'Copywriter' },
  { id: '3', name: 'Mariana Costa', avatar: '', role: 'Social Media' },
  { id: '4', name: 'Rafael Santos', avatar: '', role: 'Diretor de Arte' },
];

export const MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'Café Artisan', logo: '☕', color: 'hsl(30, 60%, 50%)', postsCount: 12 },
  { id: 'c2', name: 'FitLife Gym', logo: '💪', color: 'hsl(145, 60%, 42%)', postsCount: 8 },
  { id: 'c3', name: 'TechNova', logo: '🚀', color: 'hsl(260, 60%, 58%)', postsCount: 15 },
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'p1', clientId: 'c1', title: 'Promo Café da Manhã', caption: '☕ Comece o dia com o melhor café artesanal da cidade! De segunda a sexta, ganhe 20% de desconto no combo café + pão de queijo.\n\n#CaféArtisan #PromoçãoDaManhã #CaféEspecial',
    imageUrl: '', type: 'image', platform: 'instagram', stage: 'content', assignedTo: '1', scheduledDate: '2026-02-18', comments: [], createdAt: '2026-02-10',
  },
  {
    id: 'p2', clientId: 'c1', title: 'Receita do Cappuccino', caption: '🎬 Veja como nosso barista prepara o cappuccino perfeito!\n\n#Reels #CaféArtisan #Cappuccino', 
    imageUrl: '', type: 'reels', platform: 'instagram', stage: 'internal_approval', assignedTo: '3', scheduledDate: '2026-02-20', comments: [], createdAt: '2026-02-09',
  },
  {
    id: 'p3', clientId: 'c2', title: 'Treino HIIT', caption: '🔥 Treino HIIT de 30 minutos para queimar calorias! Arraste para ver a sequência completa.\n\n#FitLife #HIIT #Treino',
    imageUrl: '', type: 'carousel', platform: 'instagram', stage: 'client_approval', assignedTo: '2', scheduledDate: '2026-02-22', approvalLink: 'abc123', comments: [], createdAt: '2026-02-08',
  },
  {
    id: 'p4', clientId: 'c3', title: 'Lançamento App v2.0', caption: '🚀 O futuro chegou! TechNova App 2.0 com IA integrada. Baixe agora!\n\n#TechNova #Inovação #App',
    imageUrl: '', type: 'image', platform: 'facebook', stage: 'approved', scheduledDate: '2026-02-15', comments: [], createdAt: '2026-02-05',
  },
  {
    id: 'p5', clientId: 'c2', title: 'Dicas de Nutrição', caption: '🥗 5 dicas de nutrição para maximizar seus resultados!\n\n#FitLife #Nutrição #Saúde',
    imageUrl: '', type: 'carousel', platform: 'facebook', stage: 'adjustments', assignedTo: '4', scheduledDate: '2026-02-25', comments: [{ id: 'cm1', author: 'Cliente', text: 'Trocar a foto 3 por uma com mais cores', createdAt: '2026-02-11' }], createdAt: '2026-02-07',
  },
];
