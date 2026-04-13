import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@/lib/types';
import { MetricCard } from './MetricCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Legend,
} from 'recharts';
import {
  Facebook, Instagram, TrendingUp, Users, Eye, MousePointer2,
  Download, Settings2, BarChart3, AlertCircle, RefreshCw,
  Heart, MessageCircle, Share2, DollarSign, Target, Zap,
  ExternalLink, Image, Film, Layers, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getPageInsights,
  getPageSummary,
  getFBRecentPosts,
  getInstagramInsights,
  getIGAccountDetails,
  getIGRecentMedia,
  getAdsInsights,
  getAdsCampaigns,
  DateRangeFilter,
} from '@/lib/meta-api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportsTabProps {
  client: Client;
  dateFilter?: DateRangeFilter;
  dateLabel?: string;
}

interface VisibleMetrics {
  // Facebook
  fb_reach: boolean;
  fb_impressions: boolean;
  fb_engagements: boolean;
  fb_reactions: boolean;
  fb_fans: boolean;
  fb_page_views: boolean;
  // Instagram
  ig_reach: boolean;
  ig_impressions: boolean;
  ig_interactions: boolean;
  ig_profile_views: boolean;
  ig_followers: boolean;
  // ADS
  ads_spend: boolean;
  ads_reach: boolean;
  ads_impressions: boolean;
  ads_clicks: boolean;
  ads_cpc: boolean;
  ads_ctr: boolean;
  ads_frequency: boolean;
}

const DEFAULT_METRICS: VisibleMetrics = {
  fb_reach: true,
  fb_impressions: true,
  fb_engagements: true,
  fb_reactions: true,
  fb_fans: true,
  fb_page_views: true,
  ig_reach: true,
  ig_impressions: true,
  ig_interactions: true,
  ig_profile_views: true,
  ig_followers: true,
  ads_spend: true,
  ads_reach: true,
  ads_impressions: true,
  ads_clicks: true,
  ads_cpc: true,
  ads_ctr: true,
  ads_frequency: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMetricValue(data: any[], metricName: string): number {
  if (!data || !Array.isArray(data)) return 0;
  const metric = data.find((m: any) => m.name === metricName);
  if (!metric || !metric.values || metric.values.length === 0) return 0;
  return metric.values.reduce((acc: number, curr: any) => acc + (Number(curr.value) || 0), 0);
}

function getMetricTimeSeries(data: any[], metricName: string): { date: string; value: number }[] {
  if (!data || !Array.isArray(data)) return [];
  const metric = data.find((m: any) => m.name === metricName);
  if (!metric || !metric.values) return [];
  return metric.values.map((v: any) => ({
    date: v.end_time ? format(new Date(v.end_time), 'dd/MM', { locale: ptBR }) : '',
    value: Number(v.value) || 0,
  }));
}

function getAdsMetric(data: any[], field: string): number {
  if (!data || !Array.isArray(data) || data.length === 0) return 0;
  return Number(data[0][field]) || 0;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('pt-BR');
}

function fmtCurrency(n: number): string {
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

function fmtPercent(n: number): string {
  return `${n.toFixed(2)}%`;
}

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  facebook: '#1877F2',
  instagram: '#E1306C',
  ads: '#FF6B35',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-none shadow-sm bg-card/50">
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-16" /></CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-none shadow-sm bg-card/50">
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-[280px] w-full" /></CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center bg-muted/20 rounded-xl border border-dashed border-border">
      <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">{desc}</p>
    </div>
  );
}

function PostMediaIcon({ type }: { type?: string }) {
  if (type === 'VIDEO' || type === 'REELS') return <Film className="w-4 h-4" />;
  if (type === 'CAROUSEL_ALBUM') return <Layers className="w-4 h-4" />;
  return <Image className="w-4 h-4" />;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ReportsTab({ client, dateFilter = { preset: 'last_30d' }, dateLabel }: ReportsTabProps) {
  const [loading, setLoading] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const navigate = useNavigate();

  // Raw API data
  const [fbInsights, setFbInsights] = useState<any[]>([]);
  const [fbSummary, setFbSummary] = useState<any>(null);
  const [fbPosts, setFbPosts] = useState<any[]>([]);
  const [igInsights, setIgInsights] = useState<any[]>([]);
  const [igDetails, setIgDetails] = useState<any>(null);
  const [igMedia, setIgMedia] = useState<any[]>([]);
  const [adsInsights, setAdsInsights] = useState<any[]>([]);
  const [adsCampaigns, setAdsCampaigns] = useState<any[]>([]);

  // Visibility toggles per metric
  const [metrics, setMetrics] = useState<VisibleMetrics>(() => {
    try {
      const saved = localStorage.getItem(`report_metrics_${client.id}`);
      return saved ? { ...DEFAULT_METRICS, ...JSON.parse(saved) } : DEFAULT_METRICS;
    } catch {
      return DEFAULT_METRICS;
    }
  });

  const toggleMetric = (key: keyof VisibleMetrics) => {
    setMetrics(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(`report_metrics_${client.id}`, JSON.stringify(next));
      return next;
    });
  };

  const hasMeta = !!client.meta_access_token;
  const hasFB = !!(client.meta_page_id && client.meta_access_token);
  const hasIG = !!(client.meta_ig_account_id && client.meta_access_token);
  const hasAds = !!(client.meta_ads_account_id && client.meta_access_token);

  useEffect(() => {
    if (hasMeta) fetchAllInsights();
  }, [client, dateFilter]);

  const fetchAllInsights = async () => {
    setLoading(true);
    setTokenError(false);

    const handleError = (e: any, source: string) => {
      const msg = e.message || '';
      if (
        msg.includes('access token') ||
        msg.includes('Session has expired') ||
        msg.includes('expirou') ||
        msg.includes('invalid access token')
      ) {
        if (!msg.includes('permissions') && !msg.includes('permission')) {
          setTokenError(true);
        } else {
          toast.error(`Erro de permissão (${source}): ${msg}`);
        }
      } else {
        toast.error(`Erro ao carregar ${source}: ${msg}`);
      }
    };

    const tasks: Promise<void>[] = [];

    if (hasFB) {
      tasks.push(
        getPageInsights(client.meta_page_id!, client.meta_access_token!, dateFilter)
          .then(setFbInsights).catch(e => handleError(e, 'Facebook Insights')),
        getPageSummary(client.meta_page_id!, client.meta_access_token!)
          .then(setFbSummary).catch(e => handleError(e, 'Facebook Summary')),
        getFBRecentPosts(client.meta_page_id!, client.meta_access_token!)
          .then(setFbPosts).catch(e => handleError(e, 'Facebook Posts')),
      );
    }

    if (hasIG) {
      tasks.push(
        getInstagramInsights(client.meta_ig_account_id!, client.meta_access_token!, dateFilter)
          .then(setIgInsights).catch(e => handleError(e, 'Instagram Insights')),
        getIGAccountDetails(client.meta_ig_account_id!, client.meta_access_token!)
          .then(setIgDetails).catch(e => handleError(e, 'Instagram Details')),
        getIGRecentMedia(client.meta_ig_account_id!, client.meta_access_token!)
          .then(setIgMedia).catch(e => handleError(e, 'Instagram Mídia')),
      );
    }

    if (hasAds) {
      tasks.push(
        getAdsInsights(client.meta_ads_account_id!, client.meta_access_token!, dateFilter)
          .then(setAdsInsights).catch(e => handleError(e, 'Ads Insights')),
        getAdsCampaigns(client.meta_ads_account_id!, client.meta_access_token!, dateFilter)
          .then(setAdsCampaigns).catch(e => handleError(e, 'Campanhas')),
      );
    }

    await Promise.allSettled(tasks);
    setLoading(false);
  };

  // ── Derived values ──────────────────────────────────────────────────────────

  const fbTotalReach = getMetricValue(fbInsights, 'page_impressions_unique');
  const fbImpressions = getMetricValue(fbInsights, 'page_impressions');
  const fbEngagements = getMetricValue(fbInsights, 'page_post_engagements');
  const fbReactions = getMetricValue(fbInsights, 'page_actions_post_reactions_total');
  const fbFanAdds = getMetricValue(fbInsights, 'page_fan_adds');
  const fbPageViews = getMetricValue(fbInsights, 'page_views_total');
  const fbFans = fbSummary?.fan_count || 0;

  const igReach = getMetricValue(igInsights, 'reach');
  // NOTE: 'impressions' is not available via period=day on IG Insights endpoint — kept as 0.
  const igImpressions = 0;
  const igInteractions = getMetricValue(igInsights, 'total_interactions');
  const igProfileViews = getMetricValue(igInsights, 'profile_views');
  const igFollowers = igDetails?.followers_count || getMetricValue(igInsights, 'follower_count');
  const igAccountsEngaged = getMetricValue(igInsights, 'accounts_engaged');
  const igLikes = getMetricValue(igInsights, 'likes');
  const igComments = getMetricValue(igInsights, 'comments');
  const igSaves = getMetricValue(igInsights, 'saves');
  const igShares = getMetricValue(igInsights, 'shares');
  const igFollowsGained = getMetricValue(igInsights, 'follows_and_unfollows');

  const adsSpend = getAdsMetric(adsInsights, 'spend');
  const adsReach = getAdsMetric(adsInsights, 'reach');
  const adsImpressions = getAdsMetric(adsInsights, 'impressions');
  const adsClicks = getAdsMetric(adsInsights, 'clicks');
  const adsCPC = getAdsMetric(adsInsights, 'cpc');
  const adsCTR = getAdsMetric(adsInsights, 'ctr');
  const adsFrequency = getAdsMetric(adsInsights, 'frequency');

  // Chart series
  const reachTimeSeries = useMemo(() => {
    const fbSeries = getMetricTimeSeries(fbInsights, 'page_impressions_unique');
    const igSeries = getMetricTimeSeries(igInsights, 'reach');
    const merged: Record<string, { date: string; facebook: number; instagram: number }> = {};
    fbSeries.forEach(p => {
      merged[p.date] = { date: p.date, facebook: p.value, instagram: 0 };
    });
    igSeries.forEach(p => {
      if (merged[p.date]) merged[p.date].instagram = p.value;
      else merged[p.date] = { date: p.date, facebook: 0, instagram: p.value };
    });
    return Object.values(merged).slice(-30);
  }, [fbInsights, igInsights]);

  const channelSummaryData = [
    { name: 'FB Alcance', value: fbTotalReach, fill: CHART_COLORS.facebook },
    { name: 'IG Alcance', value: igReach, fill: CHART_COLORS.instagram },
    { name: 'ADS Alcance', value: adsReach, fill: CHART_COLORS.ads },
  ];

  // ── Error state ─────────────────────────────────────────────────────────────

  if (tokenError) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-xl font-bold font-display mb-2 text-destructive">Conexão Expirada</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Sua conexão com o Meta expirou por segurança. Reconecte para acessar os relatórios.
          </p>
          <Button onClick={() => navigate(`/clients/${client.id}`)}>
            Ir para Configurações do Cliente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!hasMeta) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/30 rounded-xl border-2 border-dashed border-border animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold font-display mb-2">Meta não conectado</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Conecte a conta do Facebook e Instagram deste cliente para gerar relatórios automáticos com dados reais.
        </p>
        <Button variant="outline" onClick={() => navigate(`/clients/${client.id}`)}>
          Conectar Meta <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${loading ? 'animate-pulse pointer-events-none' : 'animate-in fade-in duration-300'}`}>

      {/* Print header */}
      <div className="hidden print:flex items-center justify-between mb-8 border-b pb-6">
        <div className="flex items-center gap-4">
          {client.logo && client.logo.startsWith('http') ? (
            <img src={client.logo} alt="" className="w-12 h-12 object-contain" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
              {client.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold font-display">Relatório de Desempenho</h1>
            <p className="text-muted-foreground">{client.name} · {dateLabel}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground uppercase">Gerado por PostFlow</p>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" size="sm" onClick={fetchAllInsights} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Atualizando...' : 'Atualizar Dados'}
        </Button>

        <div className="flex items-center gap-2">
          {/* Metrics customizer */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="w-4 h-4 mr-2" />
                Personalizar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 max-h-[480px] overflow-y-auto" align="end">
              <h4 className="font-semibold text-sm mb-3">Métricas Visíveis</h4>

              {hasFB && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-[#1877F2] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Facebook className="w-3 h-3" /> Facebook Orgânico
                  </p>
                  <div className="space-y-2 pl-1">
                    {([
                      ['fb_reach', 'Alcance'],
                      ['fb_impressions', 'Impressões'],
                      ['fb_engagements', 'Engajamentos'],
                      ['fb_reactions', 'Reações'],
                      ['fb_fans', 'Seguidores (Fãs)'],
                      ['fb_page_views', 'Visualizações de Página'],
                    ] as [keyof VisibleMetrics, string][]).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox id={key} checked={metrics[key]} onCheckedChange={() => toggleMetric(key)} />
                        <Label htmlFor={key} className="text-sm cursor-pointer">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasIG && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-[#E1306C] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Instagram className="w-3 h-3" /> Instagram Orgânico
                  </p>
                  <div className="space-y-2 pl-1">
                    {([
                      ['ig_reach', 'Alcance'],
                      ['ig_interactions', 'Interações'],
                      ['ig_profile_views', 'Visitas ao Perfil'],
                      ['ig_followers', 'Seguidores'],
                    ] as [keyof VisibleMetrics, string][]).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox id={key} checked={metrics[key]} onCheckedChange={() => toggleMetric(key)} />
                        <Label htmlFor={key} className="text-sm cursor-pointer">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Always show Ads toggle customizing options */}
              <div>
                <p className="text-xs font-bold text-[#FF6B35] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Target className="w-3 h-3" /> Anúncios (ADS)
                </p>
                <div className="space-y-2 pl-1">
                  {([
                    ['ads_spend', 'Investimento'],
                    ['ads_reach', 'Alcance'],
                    ['ads_impressions', 'Impressões'],
                    ['ads_clicks', 'Cliques'],
                    ['ads_cpc', 'CPC'],
                    ['ads_ctr', 'CTR'],
                    ['ads_frequency', 'Frequência'],
                  ] as [keyof VisibleMetrics, string][]).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox id={key} checked={metrics[key]} onCheckedChange={() => toggleMetric(key)} />
                      <Label htmlFor={key} className="text-sm cursor-pointer">{label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button size="sm" onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted/50 p-1 print:hidden w-full md:w-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          {hasFB && <TabsTrigger value="facebook" className="gap-1.5"><Facebook className="w-3.5 h-3.5" />Facebook</TabsTrigger>}
          {hasIG && <TabsTrigger value="instagram" className="gap-1.5"><Instagram className="w-3.5 h-3.5" />Instagram</TabsTrigger>}
          <TabsTrigger value="ads" className="gap-1.5"><Target className="w-3.5 h-3.5" />Ads</TabsTrigger>
        </TabsList>

        {/* ══════════════════ VISÃO GERAL ══════════════════ */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {loading ? <LoadingSkeleton /> : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Alcance Total"
                  value={fmt(fbTotalReach + igReach + adsReach)}
                  icon={Users}
                  description="FB + IG + ADS"
                />
                <MetricCard
                  title="Impressões Totais"
                  value={fmt(fbImpressions + igImpressions + adsImpressions)}
                  icon={Eye}
                  description="Combinado de todos os canais"
                />
                <MetricCard
                  title="Engajamentos"
                  value={fmt(fbEngagements + igInteractions)}
                  icon={Heart}
                  description="Orgânico combinado"
                />
                {hasAds && (
                  <MetricCard
                    title="Investimento Ads"
                    value={fmtCurrency(adsSpend)}
                    icon={DollarSign}
                    description={`CTR: ${fmtPercent(adsCTR)}`}
                  />
                )}
              </div>

              {/* Reach over time chart */}
              {reachTimeSeries.length > 0 ? (
                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Evolução do Alcance — Facebook vs. Instagram
                    </CardTitle>
                    <CardDescription>Alcance diário orgânico por canal</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reachTimeSeries}>
                        <defs>
                          <linearGradient id="gradFB" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.facebook} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={CHART_COLORS.facebook} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradIG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.instagram} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={CHART_COLORS.instagram} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                        <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={fmt} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                          formatter={(v: number) => [fmt(v)]}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="facebook" name="Facebook" stroke={CHART_COLORS.facebook} fill="url(#gradFB)" strokeWidth={2} />
                        <Area type="monotone" dataKey="instagram" name="Instagram" stroke={CHART_COLORS.instagram} fill="url(#gradIG)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <EmptyState title="Sem dados de alcance" desc="Os dados de alcance aparecerão aqui após o carregamento da API." />
              )}

              {/* Channel summary + Top posts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Resumo por Canal</CardTitle>
                    <CardDescription>Alcance acumulado no período</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={channelSummaryData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmt} />
                        <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={80} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                          formatter={(v: number) => [fmt(v), 'Alcance']}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {channelSummaryData.map((entry, i) => (
                            <rect key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Recent IG posts preview */}
                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-[#E1306C]" />
                      Posts Recentes (IG)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {igMedia.length > 0 ? (
                      <div className="space-y-3">
                        {igMedia.slice(0, 5).map((post: any) => (
                          <div key={post.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors group">
                            <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                              {post.media_url ? (
                                <img src={post.thumbnail_url || post.media_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <PostMediaIcon type={post.media_type} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground truncate">{post.caption?.slice(0, 60) || 'Sem legenda'}…</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Heart className="w-3 h-3" />{post.like_count ?? '—'}</span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{post.comments_count ?? '—'}</span>
                              </div>
                            </div>
                            {post.permalink && (
                              <a href={post.permalink} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhum post encontrado</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ══════════════════ FACEBOOK ORGÂNICO ══════════════════ */}
        {hasFB && (
          <TabsContent value="facebook" className="space-y-6 mt-6">
            {loading ? <LoadingSkeleton /> : (
              <>
                {/* FB header */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20">
                  <div className="w-10 h-10 bg-[#1877F2] rounded-xl flex items-center justify-center">
                    <Facebook className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{fbSummary?.name || client.name}</p>
                    <p className="text-sm text-muted-foreground">{fmt(fbFans)} seguidores totais</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto bg-[#1877F2]/10 text-[#1877F2] border-0">Orgânico</Badge>
                </div>

                {/* FB metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {metrics.fb_reach && <MetricCard title="Alcance" value={fmt(fbTotalReach)} icon={Users} description="Pessoas únicas alcançadas" />}
                  {metrics.fb_impressions && <MetricCard title="Impressões" value={fmt(fbImpressions)} icon={Eye} description="Visualizações totais" />}
                  {metrics.fb_engagements && <MetricCard title="Engajamentos" value={fmt(fbEngagements)} icon={MousePointer2} description="Cliques + reações + comentários" />}
                  {metrics.fb_reactions && <MetricCard title="Reações" value={fmt(fbReactions)} icon={Heart} description="Curtidas e reações" />}
                  {metrics.fb_fans && <MetricCard title="Novos Seguidores" value={`+${fmt(fbFanAdds)}`} icon={Users} description="Novos fãs no período" />}
                  {metrics.fb_page_views && <MetricCard title="Views de Página" value={fmt(fbPageViews)} icon={Eye} description="Visitas à página" />}
                </div>

                {/* FB reach chart */}
                {getMetricTimeSeries(fbInsights, 'page_impressions_unique').length > 0 ? (
                  <Card className="border-none shadow-sm bg-card/50">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#1877F2]" />
                        Alcance Diário — Facebook
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getMetricTimeSeries(fbInsights, 'page_impressions_unique')}>
                          <defs>
                            <linearGradient id="gradFBDetail" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={CHART_COLORS.facebook} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={CHART_COLORS.facebook} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmt} />
                          <Tooltip formatter={(v: number) => [fmt(v), 'Alcance']} contentStyle={{ borderRadius: '8px', backgroundColor: 'hsl(var(--card))' }} />
                          <Area type="monotone" dataKey="value" stroke={CHART_COLORS.facebook} fill="url(#gradFBDetail)" strokeWidth={2} name="Alcance" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ) : (
                  <EmptyState title="Dados insuficientes" desc="Datas específicas de alcance não disponíveis para este período." />
                )}

                {/* FB recent posts */}
                <Card className="border-none shadow-sm bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Posts Recentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {fbPosts.length > 0 ? (
                      <div className="space-y-3">
                        {fbPosts.slice(0, 8).map((post: any) => (
                          <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors group">
                            {post.full_picture && (
                              <img src={post.full_picture} alt="" className="w-14 h-14 object-cover rounded-md shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{post.message || post.story || 'Sem texto'}</p>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {post.created_time ? format(new Date(post.created_time), "dd MMM yyyy", { locale: ptBR }) : ''}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3" />{post.reactions?.summary?.total_count ?? '—'}</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.comments?.summary?.total_count ?? '—'}</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Share2 className="w-3 h-3" />{post.shares?.count ?? '—'}</span>
                              </div>
                            </div>
                            {post.permalink_url && (
                              <a href={post.permalink_url} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState title="Nenhum post encontrado" desc="Não encontramos posts recentes para esta página." />
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}

        {/* ══════════════════ INSTAGRAM ORGÂNICO ══════════════════ */}
        {hasIG && (
          <TabsContent value="instagram" className="space-y-6 mt-6">
            {loading ? <LoadingSkeleton /> : (
              <>
                {/* IG header */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#E1306C]/10 border border-[#E1306C]/20">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] rounded-xl flex items-center justify-center">
                    <Instagram className="w-5 h-5 text-white" />
                  </div>
                  {igDetails?.profile_picture_url && (
                    <img src={igDetails.profile_picture_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  )}
                  <div>
                    <p className="font-semibold">@{igDetails?.username || igDetails?.name || client.name}</p>
                    <p className="text-sm text-muted-foreground">{fmt(igFollowers)} seguidores · {igDetails?.media_count ?? '—'} publicações</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto bg-[#E1306C]/10 text-[#E1306C] border-0">Orgânico</Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {metrics.ig_reach && <MetricCard title="Alcance" value={fmt(igReach)} icon={Users} description="Contas únicas alcançadas" />}
                  {metrics.ig_interactions && <MetricCard title="Interações" value={fmt(igInteractions)} icon={Heart} description="Total de engajamentos" />}
                  {metrics.ig_profile_views && <MetricCard title="Visitas ao Perfil" value={fmt(igProfileViews)} icon={Eye} description="Acessos ao perfil" />}
                  {metrics.ig_followers && <MetricCard title="Seguidores" value={fmt(igFollowers)} icon={Users} description="Total atual" />}
                  <MetricCard title="Curtidas" value={fmt(igLikes)} icon={Heart} description="No período" />
                  <MetricCard title="Comentários" value={fmt(igComments)} icon={MessageCircle} description="No período" />
                  <MetricCard title="Saves" value={fmt(igSaves)} icon={Zap} description="Salvamentos" />
                  <MetricCard title="Compartilhamentos" value={fmt(igShares)} icon={Share2} description="No período" />
                  <MetricCard title="Contas Engajadas" value={fmt(igAccountsEngaged)} icon={Zap} description="Que interagiram com o conteúdo" />
                  {igFollowsGained !== 0 && <MetricCard title="Novos Seguidores" value={fmt(igFollowsGained)} icon={Users} description="Ganhos no período" />}
                </div>

                {/* IG reach chart */}
                {getMetricTimeSeries(igInsights, 'reach').length > 0 ? (
                  <Card className="border-none shadow-sm bg-card/50">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#E1306C]" />
                        Alcance Diário — Instagram
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getMetricTimeSeries(igInsights, 'reach')}>
                          <defs>
                            <linearGradient id="gradIGDetail" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={CHART_COLORS.instagram} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={CHART_COLORS.instagram} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmt} />
                          <Tooltip formatter={(v: number) => [fmt(v), 'Alcance']} contentStyle={{ borderRadius: '8px', backgroundColor: 'hsl(var(--card))' }} />
                          <Area type="monotone" dataKey="value" stroke={CHART_COLORS.instagram} fill="url(#gradIGDetail)" strokeWidth={2} name="Alcance" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ) : (
                  <EmptyState title="Dados insuficientes" desc="O alcance diário do Instagram não está disponível para este período." />
                )}

                {/* IG recent media grid */}
                <Card className="border-none shadow-sm bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Posts Recentes</CardTitle>
                    <CardDescription>Últimas publicações com métricas individuais</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {igMedia.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {igMedia.slice(0, 10).map((post: any) => {
                          const reach = post.insights?.data?.find((m: any) => m.name === 'reach')?.values?.[0]?.value ?? '—';
                          const engagement = post.insights?.data?.find((m: any) => m.name === 'engagement')?.values?.[0]?.value ?? '—';
                          return (
                            <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors group">
                              <div className="w-16 h-16 rounded-md bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                                {post.media_url ? (
                                  <img src={post.thumbnail_url || post.media_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <PostMediaIcon type={post.media_type} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-1">
                                  <PostMediaIcon type={post.media_type} />
                                  <span className="text-[10px] text-muted-foreground uppercase">{post.media_type?.toLowerCase()?.replace('_', ' ')}</span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">{post.caption?.slice(0, 80) || 'Sem legenda'}</p>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><Heart className="w-3 h-3" />{post.like_count ?? '—'}</span>
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{post.comments_count ?? '—'}</span>
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><Eye className="w-3 h-3" />{fmt(Number(reach) || 0)}</span>
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><Zap className="w-3 h-3" />{engagement}</span>
                                </div>
                              </div>
                              {post.permalink && (
                                <a href={post.permalink} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState title="Nenhum post encontrado" desc="Não encontramos publicações recentes para esta conta." />
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}

        {/* ══════════════════ ANÚNCIOS (ADS) ══════════════════ */}
        <TabsContent value="ads" className="space-y-6 mt-6">
          {!hasAds ? (
            <div className="bg-card/50 border-2 border-dashed border-[#FF6B35]/30 rounded-xl p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-[#FF6B35]" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground mb-2">Conecte sua conta de Anúncios</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                Para ver o histórico e a performance das suas campanhas de Ads (tráfego pago), preencha o ID Numérico da conta de anúncios deste cliente.
              </p>
              <div className="text-sm border border-border p-3 rounded-lg bg-background inline-block">
                Configuração » Ícone do Meta Lupa (⬛) » ID Conta de Anúncios
              </div>
            </div>
          ) : loading ? (
            <LoadingSkeleton />
          ) : (
            <>
                {/* ADS header */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FF6B35]/10 border border-[#FF6B35]/20">
                  <div className="w-10 h-10 bg-[#FF6B35] rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Tráfego Pago</p>
                    <p className="text-sm text-muted-foreground">
                      Conta: {client.meta_ads_account_id?.replace('act_', '') || '—'} · {adsCampaigns.length} campanhas
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto bg-[#FF6B35]/10 text-[#FF6B35] border-0">Pago</Badge>
                </div>

                {adsInsights.length > 0 ? (
                  <>
                    {/* ADS metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {metrics.ads_spend && (
                        <MetricCard
                          title="Investimento"
                          value={fmtCurrency(adsSpend)}
                          icon={DollarSign}
                          description="Total gasto no período"
                        />
                      )}
                      {metrics.ads_reach && (
                        <MetricCard
                          title="Alcance"
                          value={fmt(adsReach)}
                          icon={Users}
                          description="Pessoas únicas alcançadas"
                        />
                      )}
                      {metrics.ads_impressions && (
                        <MetricCard
                          title="Impressões"
                          value={fmt(adsImpressions)}
                          icon={Eye}
                          description="Total de exibições"
                        />
                      )}
                      {metrics.ads_clicks && (
                        <MetricCard
                          title="Cliques"
                          value={fmt(adsClicks)}
                          icon={MousePointer2}
                          description="Total de cliques no anúncio"
                        />
                      )}
                      {metrics.ads_cpc && (
                        <MetricCard
                          title="CPC"
                          value={fmtCurrency(adsCPC)}
                          icon={DollarSign}
                          description="Custo por clique médio"
                        />
                      )}
                      {metrics.ads_ctr && (
                        <MetricCard
                          title="CTR"
                          value={fmtPercent(adsCTR)}
                          icon={TrendingUp}
                          description="Taxa de cliques"
                        />
                      )}
                      {metrics.ads_frequency && (
                        <MetricCard
                          title="Frequência"
                          value={adsFrequency.toFixed(2)}
                          icon={Zap}
                          description="Impressões por pessoa"
                        />
                      )}
                      <MetricCard
                        title="CPM"
                        value={adsImpressions > 0 ? fmtCurrency((adsSpend / adsImpressions) * 1000) : '—'}
                        icon={BarChart3}
                        description="Custo por mil impressões"
                      />
                    </div>

                    {/* Spend vs Clicks chart */}
                    <Card className="border-none shadow-sm bg-card/50">
                      <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-[#FF6B35]" />
                          Performance de Anúncios
                        </CardTitle>
                        <CardDescription>Visão consolidada de alcance, cliques e investimento</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-4 rounded-xl bg-[#FF6B35]/10 text-center">
                            <p className="text-2xl font-bold text-[#FF6B35]">{fmtCurrency(adsSpend)}</p>
                            <p className="text-xs text-muted-foreground mt-1">Investimento Total</p>
                          </div>
                          <div className="p-4 rounded-xl bg-primary/10 text-center">
                            <p className="text-2xl font-bold text-primary">{fmt(adsReach)}</p>
                            <p className="text-xs text-muted-foreground mt-1">Pessoas Alcançadas</p>
                          </div>
                          <div className="p-4 rounded-xl bg-emerald-500/10 text-center">
                            <p className="text-2xl font-bold text-emerald-500">{fmt(adsClicks)}</p>
                            <p className="text-xs text-muted-foreground mt-1">Cliques Totais</p>
                          </div>
                        </div>

                        {/* CPR breakdown */}
                        {adsClicks > 0 && adsSpend > 0 && (
                          <div className="mt-4 p-3 rounded-lg bg-muted/30 flex items-center gap-3">
                            <Target className="w-5 h-5 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-sm font-semibold">Custo por Clique: {fmtCurrency(adsSpend / adsClicks)}</p>
                              <p className="text-xs text-muted-foreground">Baseado em {fmt(adsClicks)} cliques e {fmtCurrency(adsSpend)} investidos</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <EmptyState
                    title="Sem dados de anúncios"
                    desc="Nenhum dado de ADS encontrado para este período. Verifique se há campanhas ativas e se o token tem permissão 'ads_read'."
                  />
                )}

                {/* Campaigns Detailed Analysis */}
                {adsCampaigns.length > 0 && (
                  <Card className="border-none shadow-sm bg-card/50 overflow-hidden">
                    <CardHeader className="pb-3 border-b border-border/50">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#FF6B35]" />
                        Análise de Campanhas
                      </CardTitle>
                      <CardDescription>Desempenho detalhado por campanha (ativas e inativas) no período selecionado</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/50 bg-muted/20">
                              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Campanha</th>
                              <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Gasto</th>
                              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Cliques</th>
                              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Custo/Res</th>
                              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Performance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {adsCampaigns.map((c: any) => {
                              const insights = c.insights?.data?.[0];
                              const spent = parseFloat(insights?.spend || '0');
                              const clicks = parseInt(insights?.clicks || '0', 10);
                              const cpr = parseFloat(insights?.cost_per_result || '0');
                              const cpc = parseFloat(insights?.cpc || '0');
                              const isActive = c.effective_status === 'ACTIVE';
                              
                              // Simplified analysis based on generic metrics
                              const roas = insights?.actions?.find((a: any) => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value;
                              let performanceLabel = 'Bom';
                              let performanceColor = 'text-emerald-500 bg-emerald-500/10';
                              
                              if (spent > 0 && clicks === 0) {
                                performanceLabel = 'Ruim (Sem cliques)';
                                performanceColor = 'text-destructive bg-destructive/10';
                              } else if (cpc > 5) { // Arbitrary high CPC example
                                performanceLabel = 'Alto Custo (CPC)';
                                performanceColor = 'text-orange-500 bg-orange-500/10';
                              } else if (spent === 0 && isActive) {
                                performanceLabel = 'Sem Gasto';
                                performanceColor = 'text-muted-foreground bg-muted';
                              } else if (!isActive && spent > 0) {
                                performanceLabel = 'Concluído';
                                performanceColor = 'text-blue-500 bg-blue-500/10';
                              }

                              return (
                                <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                                  <td className="px-4 py-3">
                                    <p className="font-medium max-w-[200px] md:max-w-[300px] truncate" title={c.name}>{c.name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">{c.objective}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge
                                      variant={isActive ? 'default' : 'secondary'}
                                      className={isActive ? 'bg-emerald-500/20 text-emerald-600 border-0 shadow-none' : 'shadow-none'}
                                    >
                                      {isActive ? 'Ativa' : c.effective_status?.toLowerCase()}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap font-medium">
                                    {spent > 0 ? fmtCurrency(spent) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {clicks > 0 ? fmt(clicks) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {cpr > 0 ? fmtCurrency(cpr) : (cpc > 0 ? `${fmtCurrency(cpc)}/clique` : '—')}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${performanceColor}`}>
                                      {performanceLabel}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-3 text-xs bg-muted/20 text-muted-foreground text-center border-t border-border/50">
                        A análise de performance é uma referência baseada no CPC/Ações. Campanhas Otimizadas mostrarão relatórios mais precisos.
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; padding: 20px; }
          button, nav, header { display: none !important; }
          .card { border: 1px solid #eee !important; box-shadow: none !important; }
        }
      ` }} />
    </div>
  );
}
