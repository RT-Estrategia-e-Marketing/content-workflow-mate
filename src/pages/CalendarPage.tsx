import { useApp } from '@/contexts/AppContext';
import { useMemo, useState } from 'react';
import { KANBAN_STAGES } from '@/lib/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Filter, CalendarX, Building2 } from 'lucide-react';
import PostPreviewDialog from '@/components/PostPreviewDialog';
import NewPostModal from '@/components/NewPostModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STAGE_COLORS: Record<string, string> = {
  content: 'bg-blue-400',
  design: 'bg-indigo-400',
  internal_approval: 'bg-yellow-400',
  adjustments: 'bg-orange-400',
  client_approval: 'bg-purple-400',
  approved: 'bg-green-400',
  scheduled: 'bg-sky-400',
};

export default function CalendarPage() {
  const { posts, clients, activeWorkspaceId } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string>('all');

  const [newPostOpen, setNewPostOpen] = useState(false);
  const [newPostDate, setNewPostDate] = useState<string>('');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const activeClient = clients.find(c => c.id === activeWorkspaceId);

  // Filter posts by active workspace + stage
  const filteredPosts = useMemo(() => {
    return posts
      .filter(p => p.clientId === activeWorkspaceId)
      .filter(p => filterStage === 'all' || p.stage === filterStage);
  }, [posts, activeWorkspaceId, filterStage]);

  const postsWithDates = useMemo(() => {
    return filteredPosts
      .filter(p => p.scheduledDate && isValid(parseISO(p.scheduledDate)))
      .map(p => ({
        ...p,
        date: parseISO(p.scheduledDate as string),
        client: clients.find(c => c.id === p.clientId),
      }));
  }, [filteredPosts, clients]);

  // Posts without dates
  const postsWithoutDates = useMemo(() => {
    return filteredPosts
      .filter(p => !p.scheduledDate || !isValid(parseISO(p.scheduledDate as string)))
      .map(p => ({
        ...p,
        client: clients.find(c => c.id === p.clientId),
      }));
  }, [filteredPosts, clients]);

  const selectedPost = selectedPostId ? posts.find(p => p.id === selectedPostId) : null;

  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  // Mobile: show posts for selected day
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const selectedDayPosts = selectedDay
    ? postsWithDates.filter(p => isSameDay(p.date, selectedDay))
    : [];

  // Empty state — no workspace
  if (!activeWorkspaceId || !activeClient) {
    return (
      <div className="animate-slide-in flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Building2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Nenhum workspace selecionado</h1>
        <p className="text-muted-foreground max-w-sm">
          Selecione um workspace na barra lateral para visualizar o calendário.
        </p>
      </div>
    );
  }

  const activeIsUrl = activeClient.logo && activeClient.logo.startsWith('http');

  return (
    <div className="animate-slide-in">
      {/* Workspace header — matches KanbanPage style */}
      <div className="flex items-center gap-3 mb-6">
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
          <p className="text-sm text-muted-foreground">Calendário de publicações</p>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {KANBAN_STAGES.map(s => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1))} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg md:text-xl font-display font-bold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1))} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 md:gap-3 flex-wrap mb-3 px-1">
        {KANBAN_STAGES.map(s => (
          <span key={s.key} className="flex items-center gap-1 text-[9px] md:text-[10px] text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${STAGE_COLORS[s.key] || 'bg-muted-foreground'}`} />
            <span className="hidden sm:inline">{s.label}</span>
            <span className="sm:hidden">{s.label.split(' ')[0]}</span>
          </span>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className="text-center text-[10px] md:text-xs font-semibold text-muted-foreground py-2 md:py-3 border-b border-border">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[48px] md:min-h-[110px] border-b border-r border-border bg-muted/30" />
          ))}
          {days.map(day => {
            const dayPosts = postsWithDates.filter(p => isSameDay(p.date, day));
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  if (dayPosts.length > 0) {
                    if (window.innerWidth < 768) {
                      setSelectedDay(isSelected ? null : day);
                    } else {
                      setNewPostDate(format(day, 'yyyy-MM-dd'));
                      setNewPostOpen(true);
                    }
                  } else {
                    setNewPostDate(format(day, 'yyyy-MM-dd'));
                    setNewPostOpen(true);
                  }
                }}
                className={`min-h-[48px] md:min-h-[110px] border-b border-r border-border p-1 md:p-2 text-left transition-colors flex flex-col ${isToday ? 'bg-primary/5' : ''
                  } ${isSelected ? 'ring-2 ring-inset ring-primary' : ''} ${dayPosts.length > 0 ? 'md:cursor-default cursor-pointer active:bg-secondary/50' : ''
                  }`}
              >
                {/* Day number — always pinned to top */}
                <div className="flex items-start justify-between mb-1">
                  <span className={`text-[10px] md:text-xs font-semibold inline-flex items-center justify-center leading-none ${
                    isToday
                      ? 'bg-primary text-primary-foreground w-5 h-5 md:w-6 md:h-6 rounded-full'
                      : 'text-foreground/70 w-5 h-5 md:w-6 md:h-6'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {/* Mobile: dot count */}
                  {dayPosts.length > 0 && (
                    <span className="text-[8px] text-muted-foreground md:hidden">{dayPosts.length}</span>
                  )}
                </div>
                {/* Mobile: dots */}
                <div className="flex flex-wrap gap-0.5 md:hidden">
                  {dayPosts.slice(0, 4).map(p => (
                    <span
                      key={p.id}
                      className={`w-2 h-2 rounded-full ${STAGE_COLORS[p.stage] || 'bg-muted-foreground'}`}
                    />
                  ))}
                  {dayPosts.length > 4 && (
                    <span className="text-[8px] text-muted-foreground">+{dayPosts.length - 4}</span>
                  )}
                </div>
                {/* Desktop: full labels */}
                <div className="space-y-1 hidden md:flex md:flex-col md:flex-1">
                  {dayPosts.slice(0, 3).map(p => (
                    <button
                      key={p.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedPostId(p.id); }}
                      className="w-full text-left text-[9px] px-1.5 py-0.5 rounded bg-muted border border-border truncate font-medium hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STAGE_COLORS[p.stage]}`} />
                      <span className="truncate">{p.title}</span>
                    </button>
                  ))}
                  {dayPosts.length > 3 && (
                    <p className="text-[9px] text-muted-foreground">+{dayPosts.length - 3} mais</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: Selected day detail */}
      {selectedDay && selectedDayPosts.length > 0 && (
        <div className="mt-3 bg-card rounded-xl border border-border shadow-sm p-3 md:hidden animate-slide-in">
          <h3 className="text-sm font-display font-bold text-foreground mb-2">
            {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
          </h3>
          <div className="space-y-2">
            {selectedDayPosts.map(p => {
              const stageLabel = KANBAN_STAGES.find(s => s.key === p.stage)?.label || p.stage;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPostId(p.id)}
                  className="w-full text-left p-3 rounded-lg bg-muted/50 border border-border hover:bg-secondary transition-colors active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STAGE_COLORS[p.stage]}`} />
                    <span className="text-xs font-medium text-foreground truncate">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{stageLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Posts without dates */}
      {postsWithoutDates.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarX className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Sem data agendada</h3>
            <span className="text-[10px] font-semibold bg-foreground/10 text-foreground/60 rounded-full px-2 py-0.5">{postsWithoutDates.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {postsWithoutDates.map(p => {
              const stageLabel = KANBAN_STAGES.find(s => s.key === p.stage)?.label || p.stage;
              const stageColor: Record<string, string> = {
                content: 'bg-blue-400', design: 'bg-indigo-400', internal_approval: 'bg-yellow-400',
                adjustments: 'bg-orange-400', client_approval: 'bg-purple-400',
                approved: 'bg-green-400', scheduled: 'bg-sky-400',
              };
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPostId(p.id)}
                  className="text-left p-3 rounded-lg bg-card border border-border hover:bg-secondary hover:border-primary/30 transition-all active:scale-[0.98] shadow-sm"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stageColor[p.stage] || 'bg-muted-foreground'}`} />
                    <span className="text-xs font-medium text-foreground truncate">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>{stageLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedPost && (
        <PostPreviewDialog post={selectedPost} open={!!selectedPostId} onOpenChange={(v) => { if (!v) setSelectedPostId(null); }} />
      )}

      {newPostOpen && (
        <NewPostModal
          open={newPostOpen}
          initialDate={newPostDate}
          clientId={activeWorkspaceId}
          onOpenChange={setNewPostOpen}
        />
      )}
    </div>
  );
}
