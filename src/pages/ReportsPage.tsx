import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import ReportsTab from '@/components/ReportsTab';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, BarChart3, Users, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  format, subDays, startOfMonth, endOfMonth, 
  subMonths, getUnixTime, parseISO, startOfDay, endOfDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRangeFilter } from '@/lib/meta-api';

export default function ReportsPage() {
  const { clients } = useApp();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [dateRangeKey, setDateRangeKey] = useState('last_30d');

  const selectedClient = useMemo(() =>
    clients.find(c => c.id === selectedClientId),
  [clients, selectedClientId]);

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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">Analise o desempenho de Facebook, Instagram e ADS dos seus clientes.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-card/50 backdrop-blur-sm p-2 rounded-xl border border-border/50">
          {/* Client selector */}
          <div className="flex items-center gap-2 px-2 border-r border-border/50">
            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-[200px] border-none bg-transparent focus:ring-0 shadow-none">
                <SelectValue placeholder="Selecionar Cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2">
                      {client.logo && client.logo.startsWith('http') ? (
                        <img src={client.logo} alt="" className="w-4 h-4 rounded-sm object-contain" />
                      ) : (
                        <span className="w-4 h-4 rounded-sm bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                          {client.name.charAt(0)}
                        </span>
                      )}
                      {client.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range selector */}
          <div className="flex items-center gap-2 px-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
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
      </div>

      {/* Content */}
      {!selectedClientId ? (
        <Card className="border-2 border-dashed border-border bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold font-display mb-2">Selecione um cliente para começar</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Escolha um cliente acima para visualizar as métricas de desempenho de Facebook, Instagram e Ads.
            </p>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 text-primary font-medium animate-pulse">
                Aguardando seleção <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm text-muted-foreground">
              Exibindo dados de: <strong className="text-foreground">{dateRangeLabel}</strong>
            </span>
          </div>
          <ReportsTab
            key={`${selectedClientId}-${dateRangeKey}`}
            client={selectedClient!}
            dateFilter={dateFilter}
            dateLabel={dateRangeLabel}
          />
        </div>
      )}
    </div>
  );
}
