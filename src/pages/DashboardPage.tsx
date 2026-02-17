import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, CheckCircle, Clock, Bell, Check } from 'lucide-react';
import { formatDateBR } from '@/lib/utils';
import { useState } from 'react';
import { KANBAN_STAGES } from '@/lib/types';
import PostPreviewDialog from '@/components/PostPreviewDialog';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { clients, posts } = useApp();
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [taskTab, setTaskTab] = useState<'pending' | 'overdue' | 'done'>('pending');

  const myProfile = profiles.find(p => p.user_id === user?.id);

  // My tasks: posts assigned to me
  const myPosts = posts.filter(p => p.assignedTo === user?.id);
  const pendingPosts = myPosts.filter(p => p.stage !== 'approved');
  const donePosts = myPosts.filter(p => p.stage === 'approved');
  const overduePosts = pendingPosts.filter(p => new Date(p.scheduledDate) < new Date());

  const stats = [
    { label: 'Clientes', value: clients.length, icon: Users, color: 'text-primary' },
    { label: 'Posts Totais', value: posts.length, icon: FileText, color: 'text-accent' },
    { label: 'Aprovados', value: posts.filter(p => p.stage === 'approved').length, icon: CheckCircle, color: 'text-success' },
    { label: 'Pendentes', value: posts.filter(p => p.stage !== 'approved').length, icon: Clock, color: 'text-warning' },
  ];

  const taskList = taskTab === 'pending' ? pendingPosts.filter(p => !overduePosts.includes(p)) : taskTab === 'overdue' ? overduePosts : donePosts;
  const selectedPost = selectedPostId ? posts.find(p => p.id === selectedPostId) : null;

  // People - collaborators
  const activeProfiles = profiles.slice(0, 6);

  return (
    <div className="animate-slide-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">
            Olá, {myProfile?.full_name?.split(' ')[0] || 'Usuário'} 👋
          </h1>
          <p className="text-muted-foreground">Veja o que está acontecendo hoje</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(stat => (
          <div key={stat.label} className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-display font-bold text-card-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* My Tasks Widget */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            {myProfile?.avatar_url ? (
              <img src={myProfile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {(myProfile?.full_name || '?').substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="font-display font-bold text-card-foreground">Minhas tarefas</h2>
            </div>
          </div>

          <div className="flex gap-1 mb-4">
            {[
              { key: 'pending' as const, label: 'Próximas', count: pendingPosts.length - overduePosts.length },
              { key: 'overdue' as const, label: 'Atrasadas', count: overduePosts.length },
              { key: 'done' as const, label: 'Concluídas', count: donePosts.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setTaskTab(tab.key)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  taskTab === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                {tab.label} {tab.count > 0 && `(${tab.count})`}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {taskList.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma tarefa</p>
            )}
            {taskList.map(p => {
              const stage = KANBAN_STAGES.find(s => s.key === p.stage);
              const client = clients.find(c => c.id === p.clientId);
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPostId(p.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <div className={`w-2 h-2 rounded-full ${taskTab === 'overdue' ? 'bg-destructive' : stage?.borderColor?.replace('border-', 'bg-') || 'bg-muted'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground truncate">{p.title}</p>
                    <p className="text-[10px] text-muted-foreground">{client?.name} · {formatDateBR(p.scheduledDate)}</p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${stage?.color} ${stage?.borderColor} border`}>{stage?.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Projects Widget */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <h2 className="font-display font-bold text-card-foreground mb-4">Projetos</h2>
          <div className="grid grid-cols-2 gap-3">
            {clients.map(client => {
              const clientPosts = posts.filter(p => p.clientId === client.id);
              const approvedCount = clientPosts.filter(p => p.stage === 'approved').length;
              return (
                <button
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  {client.logo.startsWith('http') ? (
                    <img src={client.logo} alt={client.name} className="w-9 h-9 rounded-lg object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: `${client.color}20` }}>
                      {client.logo}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-card-foreground truncate">{client.name}</p>
                    <p className="text-[10px] text-muted-foreground">{approvedCount}/{clientPosts.length} aprovados</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* People Widget */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-card-foreground">Pessoas</h2>
            <span className="text-xs text-muted-foreground">Colaboradores</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {activeProfiles.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {p.full_name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">{p.full_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.job_title || p.priority}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications Widget */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-card-foreground flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notificações
              {unreadCount > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </h2>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                <Check className="w-3 h-3 mr-1" /> Marcar todas
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma notificação</p>
            )}
            {notifications.slice(0, 10).map(n => {
              const fromProfile = profiles.find(p => p.user_id === n.from_user_id);
              return (
                <button
                  key={n.id}
                  onClick={() => { markAsRead(n.id); setSelectedPostId(n.post_id); }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${n.read ? 'hover:bg-secondary' : 'bg-primary/5 hover:bg-primary/10'}`}
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
