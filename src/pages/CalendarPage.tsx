import { useApp } from '@/contexts/AppContext';
import { useMemo, useState } from 'react';
import { KANBAN_STAGES } from '@/lib/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import PostPreviewDialog from '@/components/PostPreviewDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STAGE_COLORS: Record<string, string> = {
  content: 'bg-blue-400',
  internal_approval: 'bg-yellow-400',
  adjustments: 'bg-orange-400',
  client_approval: 'bg-purple-400',
  approved: 'bg-green-400',
  scheduled: 'bg-sky-400',
};

export default function CalendarPage() {
  const { posts, clients } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState<string>('all');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const postsWithDates = useMemo(() => {
    return posts
      .filter(p => filterClient === 'all' || p.clientId === filterClient)
      .map(p => ({
        ...p,
        date: parseISO(p.scheduledDate),
        client: clients.find(c => c.id === p.clientId),
      }));
  }, [posts, clients, filterClient]);

  const selectedPost = selectedPostId ? posts.find(p => p.id === selectedPostId) : null;

  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="animate-slide-in">
      <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-1">Calendário</h1>
      <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">Visualize as publicações agendadas</p>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="h-8 w-full max-w-[200px] text-xs">
              <SelectValue placeholder="Filtrar por cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
            <div key={`empty-${i}`} className="min-h-[60px] md:min-h-[110px] border-b border-r border-border bg-muted/30" />
          ))}
          {days.map(day => {
            const dayPosts = postsWithDates.filter(p => isSameDay(p.date, day));
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className={`min-h-[60px] md:min-h-[110px] border-b border-r border-border p-1 md:p-2 ${isToday ? 'bg-primary/5' : ''}`}>
                <span className={`text-[10px] md:text-xs font-medium ${isToday ? 'bg-primary text-primary-foreground w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center' : 'text-muted-foreground'}`}>
                  {format(day, 'd')}
                </span>
                {/* Mobile: just dots */}
                <div className="flex flex-wrap gap-0.5 mt-1 md:hidden">
                  {dayPosts.slice(0, 4).map(p => {
                    const stageColor = STAGE_COLORS[p.stage] || 'bg-muted-foreground';
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPostId(p.id)}
                        className={`w-2 h-2 rounded-full ${stageColor} active:scale-125 transition-transform`}
                      />
                    );
                  })}
                  {dayPosts.length > 4 && (
                    <span className="text-[8px] text-muted-foreground">+{dayPosts.length - 4}</span>
                  )}
                </div>
                {/* Desktop: full labels */}
                <div className="mt-1 space-y-1 hidden md:block">
                  {dayPosts.slice(0, 3).map(p => {
                    const stageColor = STAGE_COLORS[p.stage] || 'bg-muted-foreground';
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPostId(p.id)}
                        className="w-full text-left text-[9px] px-1.5 py-0.5 rounded bg-muted border border-border truncate font-medium hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stageColor}`} />
                        <span className="truncate">{p.client?.name} - {p.title}</span>
                      </button>
                    );
                  })}
                  {dayPosts.length > 3 && (
                    <p className="text-[9px] text-muted-foreground">+{dayPosts.length - 3} mais</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedPost && (
        <PostPreviewDialog post={selectedPost} open={!!selectedPostId} onOpenChange={(v) => { if (!v) setSelectedPostId(null); }} />
      )}
    </div>
  );
}
