import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, CheckCircle, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { clients, posts } = useApp();
  const navigate = useNavigate();

  const stats = [
    { label: 'Clientes', value: clients.length, icon: Users, color: 'text-primary' },
    { label: 'Posts Totais', value: posts.length, icon: FileText, color: 'text-accent' },
    { label: 'Aprovados', value: posts.filter(p => p.stage === 'approved').length, icon: CheckCircle, color: 'text-success' },
    { label: 'Pendentes', value: posts.filter(p => p.stage !== 'approved').length, icon: Clock, color: 'text-warning' },
  ];

  return (
    <div className="animate-slide-in">
      <h1 className="text-3xl font-display font-bold text-foreground mb-1">Dashboard</h1>
      <p className="text-muted-foreground mb-8">Visão geral dos seus projetos</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
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

      <h2 className="text-lg font-display font-bold text-foreground mb-4">Clientes</h2>
      <div className="grid grid-cols-3 gap-4">
        {clients.map(client => {
          const clientPosts = posts.filter(p => p.clientId === client.id);
          const approvedCount = clientPosts.filter(p => p.stage === 'approved').length;
          return (
            <button
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="bg-card rounded-xl p-5 border border-border shadow-sm text-left hover:shadow-md hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                {client.logo.startsWith('http') ? (
                  <img src={client.logo} alt={client.name} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <span className="text-2xl">{client.logo}</span>
                )}
                <div>
                  <h3 className="font-display font-bold text-card-foreground group-hover:text-primary transition-colors">{client.name}</h3>
                  <p className="text-xs text-muted-foreground">{clientPosts.length} posts</p>
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${clientPosts.length ? (approvedCount / clientPosts.length) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{approvedCount}/{clientPosts.length} aprovados</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
