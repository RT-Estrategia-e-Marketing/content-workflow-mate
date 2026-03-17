import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import ReportsTab from '@/components/ReportsTab';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarDays, Filter, ChevronRight, BarChart3, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ReportsPage() {
  const { clients } = useApp();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [dateRange, setDateRange] = useState('last_30d');

  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId),
  [clients, selectedClientId]);

  const dateRangeLabel = useMemo(() => {
    const today = new Date();
    switch (dateRange) {
      case 'today': return format(today, "dd 'de' MMMM", { locale: ptBR });
      case 'yesterday': return format(subDays(today, 1), "dd 'de' MMMM", { locale: ptBR });
      case 'last_7d': return `Últimos 7 dias (${format(subDays(today, 7), 'dd/MM')} - ${format(today, 'dd/MM')})`;
      case 'last_30d': return `Últimos 30 dias (${format(subDays(today, 30), 'dd/MM')} - ${format(today, 'dd/MM')})`;
      case 'this_month': return format(today, 'MMMM yyyy', { locale: ptBR });
      default: return 'Período personalizado';
    }
  }, [dateRange]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">Gere e analise o desempenho dos seus clientes.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-card/50 backdrop-blur-sm p-2 rounded-xl border border-border/50">
          <div className="flex items-center gap-2 px-2 border-r border-border/50">
            <Users className="w-4 h-4 text-muted-foreground" />
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

          <div className="flex items-center gap-2 px-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px] border-none bg-transparent focus:ring-0 shadow-none">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="last_7d">Últimos 7 dias</SelectItem>
                <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
                <SelectItem value="this_month">Mês Atual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!selectedClientId ? (
        <Card className="border-2 border-dashed border-border bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold font-display mb-2">selecione um cliente para começar</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Escolha um cliente acima para visualizar as métricas de desempenho e gerar o relatório.
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
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Filter className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Exibindo dados de: <strong className="text-foreground">{dateRangeLabel}</strong>
              </span>
            </div>
          </div>
          
          <ReportsTab key={`${selectedClientId}-${dateRange}`} client={selectedClient!} dateRange={dateRange} />
        </div>
      )}
    </div>
  );
}
