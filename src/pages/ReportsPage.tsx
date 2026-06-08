import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import ReportsTab from '@/components/ReportsTab';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  format, subDays, startOfMonth, endOfMonth, 
  subMonths, getUnixTime, parseISO, startOfDay, endOfDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRangeFilter } from '@/lib/meta-api';

export default function ReportsPage() {
  const { clients, activeWorkspaceId } = useApp();
  const [dateRangeKey, setDateRangeKey] = useState('last_30d');

  const activeClient = useMemo(() =>
    clients.find(c => c.id === activeWorkspaceId),
  [clients, activeWorkspaceId]);

  // Generate last 13 months as selectable options
  const monthOptions = useMemo(() => {
    const opts = [];
    const today = new Date();
    for (let i = 0; i < 13; i++) {
      const d = subMonths(today, i);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMMM yyyy', { locale: ptBR });
      opts.push({ key: `month_${key}`, label, date: d });
    }
    return opts;
  }, []);

  // Build the DateRangeFilter object from the selected key
  const dateFilter = useMemo((): DateRangeFilter => {
    if (dateRangeKey.startsWith('month_')) {
      const iso = dateRangeKey.replace('month_', '') + '-01';
      const d = parseISO(iso);
      return {
        since: getUnixTime(startOfDay(startOfMonth(d))),
        until: getUnixTime(endOfDay(endOfMonth(d))),
      };
    }
    return { preset: dateRangeKey };
  }, [dateRangeKey]);

  const dateRangeLabel = useMemo(() => {
    if (dateRangeKey.startsWith('month_')) {
      const opt = monthOptions.find(o => o.key === dateRangeKey);
      return opt ? opt.label : 'Mês selecionado';
    }
    const today = new Date();
    switch (dateRangeKey) {
      case 'today': return format(today, "dd 'de' MMMM", { locale: ptBR });
      case 'yesterday': return format(subDays(today, 1), "dd 'de' MMMM", { locale: ptBR });
      case 'last_7d': return `Últimos 7 dias (${format(subDays(today, 7), 'dd/MM')} – ${format(today, 'dd/MM')})`;
      case 'last_30d': return `Últimos 30 dias (${format(subDays(today, 30), 'dd/MM')} – ${format(today, 'dd/MM')})`;
      case 'this_month': return format(today, 'MMMM yyyy', { locale: ptBR });
      default: return 'Período personalizado';
    }
  }, [dateRangeKey, monthOptions]);

  // Empty state — no workspace selected
  if (!activeWorkspaceId || !activeClient) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">Analise o desempenho de Facebook, Instagram e ADS.</p>
        </div>
        <Card className="border-2 border-dashed border-border bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold font-display mb-2">Selecione um workspace para começar</h3>
            <p className="text-muted-foreground max-w-sm">
              Escolha um workspace na barra lateral para visualizar as métricas de desempenho.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeIsUrl = activeClient.logo && activeClient.logo.startsWith('http');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
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
            <p className="text-sm text-muted-foreground">Relatórios · Facebook, Instagram e ADS</p>
          </div>
        </div>

        {/* Date range selector */}
        <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm p-2 rounded-xl border border-border/50">
          <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
          <Select value={dateRangeKey} onValueChange={setDateRangeKey}>
            <SelectTrigger className="w-[200px] border-none bg-transparent focus:ring-0 shadow-none">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {/* Quick presets */}
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="last_7d">Últimos 7 dias</SelectItem>
              <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
              <SelectItem value="this_month">Mês Atual</SelectItem>
              {/* Specific months */}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t mt-1 pt-2">
                Mês Específico
              </div>
              {monthOptions.map(opt => (
                <SelectItem key={opt.key} value={opt.key} className="capitalize">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 px-1">
          <span className="text-sm text-muted-foreground">
            Exibindo dados de: <strong className="text-foreground">{dateRangeLabel}</strong>
          </span>
        </div>
        <ReportsTab
          key={`${activeWorkspaceId}-${dateRangeKey}`}
          client={activeClient}
          dateFilter={dateFilter}
          dateLabel={dateRangeLabel}
        />
      </div>
    </div>
  );
}
