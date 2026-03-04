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

  // Mobile: show posts for selected day
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const selectedDayPosts = selectedDay
    ? postsWithDates.filter(p => isSameDay(p.date, selectedDay))
    : [];

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
                    // On mobile, show day details; on desktop, keep existing behavior
                    if (window.innerWidth < 768) {
                      setSelectedDay(isSelected ? null : day);
                    }
                  }
                }}
                className={`min-h-[48px] md:min-h-[110px] border-b border-r border-border p-1 md:p-2 text-left transition-colors ${
                  isToday ? 'bg-primary/5' : ''
                } ${isSelected ? 'ring-2 ring-inset ring-primary' : ''} ${
                  dayPosts.length > 0 ? 'md:cursor-default cursor-pointer active:bg-secondary/50' : ''
                }`}
              >
                <span className={`text-[10px] md:text-xs font-medium inline-flex items-center justify-center ${
                  isToday ? 'bg-primary text-primary-foreground w-5 h-5 md:w-6 md:h-6 rounded-full' : 'text-muted-foreground'
                }`}>
                  {format(day, 'd')}
                </span>
                {/* Mobile: dots */}
                <div className="flex flex-wrap gap-0.5 mt-1 md:hidden">
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
                <div className="mt-1 space-y-1 hidden md:block">
                  {dayPosts.slice(0, 3).map(p => (
                    <button
                      key={p.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedPostId(p.id); }}
                      className="w-full text-left text-[9px] px-1.5 py-0.5 rounded bg-muted border border-border truncate font-medium hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STAGE_COLORS[p.stage]}`} />
                      <span className="truncate">{p.client?.name} - {p.title}</span>
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
                    <span>{p.client?.name}</span>
                    <span>·</span>
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
    </div>
  );
}
