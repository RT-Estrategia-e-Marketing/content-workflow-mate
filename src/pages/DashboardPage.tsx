import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, Clock, Bell, Check, Trash2, Building2, ImageIcon } from 'lucide-react';
import { formatDateBR } from '@/lib/utils';
import { useState } from 'react';
import { KANBAN_STAGES } from '@/lib/types';
import PostPreviewDialog from '@/components/PostPreviewDialog';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { clients, posts, activeWorkspaceId } = useApp();
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const { notifications, markAsRead, markAllAsRead, deleteAllNotifications, unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [taskTab, setTaskTab] = useState<'pending' | 'overdue' | 'done'>('pending');

  const myProfile = profiles.find(p => p.user_id === user?.uid);
  const activeClient = clients.find(c => c.id === activeWorkspaceId);

  // Filter posts for the active workspace
  const workspacePosts = posts.filter(p => p.clientId === activeWorkspaceId);

  const myPosts = workspacePosts.filter(p => p.assignedTo && p.assignedTo.includes(user?.uid || ''));
  const pendingPosts = myPosts.filter(p => !['approved', 'scheduled', 'published'].includes(p.stage));
  const donePosts = myPosts.filter(p => ['approved', 'scheduled', 'published'].includes(p.stage));
  const overduePosts = pendingPosts.filter(p => new Date(p.scheduledDate) < new Date());

  // Recent posts: sort by updatedAt (most recently modified) > scheduledDate > createdAt
  const recentPosts = [...workspacePosts]
    .sort((a, b) => {
      const aTime = a.updatedAt || a.scheduledDate || a.createdAt;
      const bTime = b.updatedAt || b.scheduledDate || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    })
    .slice(0, 5);

  const stats = [
    { label: 'Posts Totais', value: workspacePosts.length, icon: FileText, color: 'text-accent' },
    { label: 'Aprovados', value: workspacePosts.filter(p => ['approved', 'scheduled', 'published'].includes(p.stage)).length, icon: CheckCircle, color: 'text-success' },
    { label: 'Pendentes', value: workspacePosts.filter(p => !['approved', 'scheduled', 'published'].includes(p.stage)).length, icon: Clock, color: 'text-warning' },
  ];

  const taskList = taskTab === 'pending' ? pendingPosts.filter(p => !overduePosts.includes(p)) : taskTab === 'overdue' ? overduePosts : donePosts;
  const selectedPost = selectedPostId ? posts.find(p => p.id === selectedPostId) : null;

  const activeProfiles = profiles.slice(0, 6);

  const handleNotificationClick = (n: typeof notifications[0]) => {
    markAsRead(n.id);
    const post = posts.find(p => p.id === n.post_id);
    if (post) {
      navigate('/');
    }
  };

  // Empty state — no workspace
  if (!activeWorkspaceId || !activeClient) {
    return (
      <div className="animate-slide-in flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Building2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Nenhum workspace selecionado</h1>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Crie ou selecione um workspace na barra lateral para começar a gerenciar posts.
        </p>
      </div>
    );
  }

  const activeIsUrl = activeClient.logo && activeClient.logo.startsWith('http');

  return (
    <div className="animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-primary/10">
            {activeIsUrl ? (
              <img src={activeClient.logo} alt={activeClient.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-lg font-bold text-primary">{activeClient.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground leading-tight">
              {activeClient.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Olá, {myProfile?.full_name?.split(' ')[0] || 'Usuário'} 👋
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(stat => (
          <div key={stat.label} className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-4 h-4 md:w-5 md:h-5 ${stat.color}`} />
            </div>
            <p className="text-xl md:text-2xl font-display font-bold text-card-foreground">{stat.value}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Bottom Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks Widget */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            {myProfile?.avatar_url ? (
              <img src={myProfile.avatar_url} alt="" className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center text-xs md:text-sm font-bold text-primary">
                {(myProfile?.full_name || '?').substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="font-display font-bold text-sm md:text-base text-card-foreground">Minhas tarefas</h2>
            </div>
          </div>

          <div className="flex gap-1 mb-4 overflow-x-auto">
            {[
              { key: 'pending' as const, label: 'Próximas', count: pendingPosts.length - overduePosts.length },
              { key: 'overdue' as const, label: 'Atrasadas', count: overduePosts.length },
              { key: 'done' as const, label: 'Concluídas', count: donePosts.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setTaskTab(tab.key)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap active:scale-95 ${taskTab === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
                  }`}
              >
                {tab.label} {tab.count > 0 && `(${tab.count})`}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {taskList.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma tarefa</p>
            )}
            {taskList.map(p => {
              const stage = KANBAN_STAGES.find(s => s.key === p.stage);
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPostId(p.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left active:scale-[0.98]"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${taskTab === 'overdue' ? 'bg-destructive' : 'bg-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-card-foreground truncate">{p.title}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDateBR(p.scheduledDate)}</p>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted border border-border whitespace-nowrap hidden sm:inline">{stage?.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Posts Widget */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col">
          <h2 className="font-display font-bold text-sm md:text-base text-card-foreground mb-4">Posts Recentes</h2>
          <div className="space-y-2 flex-1">
            {recentPosts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum post neste workspace</p>
            )}
            {recentPosts.map(p => {
              const stage = KANBAN_STAGES.find(s => s.key === p.stage);
              const STAGE_COLORS: Record<string, string> = {
                content: 'bg-blue-400', design: 'bg-indigo-400', internal_approval: 'bg-yellow-400',
                adjustments: 'bg-orange-400', client_approval: 'bg-purple-400',
                approved: 'bg-green-400', scheduled: 'bg-sky-400', published: 'bg-emerald-400',
              };
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPostId(p.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary transition-colors text-left active:scale-[0.98]"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-card-foreground truncate">{p.title}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDateBR(p.scheduledDate || p.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`w-2 h-2 rounded-full ${STAGE_COLORS[p.stage] || 'bg-muted-foreground'}`} />
                    <span className="text-[9px] text-muted-foreground hidden sm:inline">{stage?.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications Widget */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-display font-bold text-sm md:text-base text-card-foreground flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notificações
              {unreadCount > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-[10px] md:text-xs h-7 px-2">
                  <Check className="w-3 h-3 mr-1" /> Ler
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={deleteAllNotifications} className="text-[10px] md:text-xs h-7 px-2 text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3 mr-1" /> Limpar
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma notificação</p>
            )}
            {notifications.slice(0, 10).map(n => {
              const fromProfile = profiles.find(p => p.user_id === n.from_user_id);
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left p-3 rounded-lg transition-colors active:scale-[0.98] ${n.read ? 'hover:bg-secondary' : 'bg-primary/5 hover:bg-primary/10'}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs text-card-foreground">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleDateString('pt-BR')}
                        {fromProfile && ` · ${fromProfile.full_name}`}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedPost && (
        <PostPreviewDialog post={selectedPost} open={!!selectedPostId} onOpenChange={(v) => { if (!v) setSelectedPostId(null); }} />
      )}
    </div>
  );
}
