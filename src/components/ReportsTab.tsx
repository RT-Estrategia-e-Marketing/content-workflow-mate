import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@/lib/types';
import { MetricCard } from './MetricCard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  Facebook, Instagram, TrendingUp, Users, Eye, MousePointer2, 
  Download, Filter, Settings2, BarChart3, AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getPageInsights, getInstagramInsights, getAdsInsights } from '@/lib/meta-api';
import { toast } from 'sonner';

interface ReportsTabProps {
  client: Client;
  dateRange?: string;
}

export default function ReportsTab({ client, dateRange = 'last_30d' }: ReportsTabProps) {
  const [loading, setLoading] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [fbData, setFbData] = useState<any>(null);
  const [igData, setIgData] = useState<any>(null);
  const [adsData, setAdsData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [visibleSections, setVisibleSections] = useState({
    facebook: true,
    instagram: true,
    ads: true
  });

  const hasMeta = !!client.meta_access_token;
  const navigate = useNavigate();

  useEffect(() => {
    if (hasMeta) {
      fetchInsights();
    }
  }, [client, dateRange]);

  const fetchInsights = async () => {
    if (!client.meta_access_token) return;

    setLoading(true);
    try {
      let apiDateRange = dateRange;
      if (dateRange === 'today') apiDateRange = 'today';
      if (dateRange === 'yesterday') apiDateRange = 'yesterday';
      if (dateRange === 'last_7d') apiDateRange = 'last_7d';
      if (dateRange === 'last_30d') apiDateRange = 'last_30d';
      if (dateRange === 'this_month') apiDateRange = 'this_month';

      // Fetch all enabled insights in parallel without breaking if one fails
      const promises = [];
      
    const handleError = (e: any) => {
      console.error('Meta API specific error:', e);
      if (e.message?.includes('access token') || e.message?.includes('Session') || e.message?.includes('expirou')) {
        setTokenError(true);
      }
    };

    if (client.meta_page_id && visibleSections.facebook) {
      promises.push(getPageInsights(client.meta_page_id, client.meta_access_token, apiDateRange).then(setFbData).catch(handleError));
    }
    
    if (client.meta_ig_account_id && visibleSections.instagram) {
      promises.push(getInstagramInsights(client.meta_ig_account_id, client.meta_access_token).then(setIgData).catch(handleError));
    }

    if (client.meta_ads_account_id && visibleSections.ads) {
      promises.push(getAdsInsights(client.meta_ads_account_id, client.meta_access_token, apiDateRange).then(setAdsData).catch(handleError));
    }

    await Promise.all(promises);
  } catch (error: any) {
    console.error('Error fetching insights overall:', error);
  } finally {
    setLoading(false);
  }
};

  const getMetricValue = (data: any, metricName: string) => {
    if (!data || !Array.isArray(data)) return 0;
    const metric = data.find((m: any) => m.name === metricName);
    if (!metric || !metric.values || metric.values.length === 0) return 0;
    return metric.values[metric.values.length - 1].value || 0;
  };

  const getAdsMetric = (data: any, field: string) => {
    if (!data || !Array.isArray(data) || data.length === 0) return 0;
    return data[0][field] || 0;
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  if (tokenError) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-xl font-bold font-display mb-2 text-destructive">Conexão Expirada</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Sua conexão com o Meta expirou por segurança. Precisamos que você reconecte para acessar os relatórios deste cliente.
          </p>
          <Button onClick={() => navigate(`/clients/${client.id}`)} variant="default">
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
          Conecte a conta do Facebook e Instagram deste cliente para gerar relatórios automáticos.
        </p>
      </div>
    );
  }

  // Mock data for charts if real data is day-based and small
  const chartData = [
    { name: 'Seg', reach: 4000, engagements: 2400 },
    { name: 'Ter', reach: 3000, engagements: 1398 },
    { name: 'Qua', reach: 2000, engagements: 9800 },
    { name: 'Qui', reach: 2780, engagements: 3908 },
    { name: 'Sex', reach: 1890, engagements: 4800 },
    { name: 'Sab', reach: 2390, engagements: 3800 },
    { name: 'Dom', reach: 3490, engagements: 4300 },
  ];

  return (
    <div className={`space-y-6 animate-slide-in ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Print-only Header */}
      <div className="hidden print:block mb-8 border-b pb-6">
        <div className="flex items-center justify-between">
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
              <p className="text-muted-foreground">{client.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Período: {dateRange}</p>
            <p className="text-[10px] text-muted-foreground uppercase mt-1">Gerado por PostFlow</p>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchInsights} disabled={loading}>
            <TrendingUp className="w-4 h-4 mr-2" />
            {loading ? 'Atualizando...' : 'Atualizar Dados'}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="w-4 h-4 mr-2" />
                Personalizar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-4">
                <h4 className="font-medium leading-none">Métricas Visíveis</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fb-toggle"
                      checked={visibleSections.facebook}
                      onCheckedChange={(checked) => setVisibleSections(prev => ({ ...prev, facebook: checked === true }))}
                    />
                    <Label htmlFor="fb-toggle">Facebook Insights</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ig-toggle"
                      checked={visibleSections.instagram}
                      onCheckedChange={(checked) => setVisibleSections(prev => ({ ...prev, instagram: checked === true }))}
                    />
                    <Label htmlFor="ig-toggle">Instagram Insights</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ads-toggle"
                      checked={visibleSections.ads}
                      onCheckedChange={(checked) => setVisibleSections(prev => ({ ...prev, ads: checked === true }))}
                    />
                    <Label htmlFor="ads-toggle">Ads (Tráfego Pago)</Label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button size="sm" onClick={handleDownloadPdf}>
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Alcance Total" 
          value={loading ? "..." : (
            getMetricValue(fbData, 'page_impressions_unique') + 
            getMetricValue(igData, 'reach') + 
            getAdsMetric(adsData, 'reach')
          ).toLocaleString()} 
          change={loading ? undefined : 12.5} 
          icon={Users} 
          description="vs. último período"
        />
        {visibleSections.facebook && (
          <MetricCard 
            title="Facebook Eng." 
            value={loading ? "..." : getMetricValue(fbData, 'page_post_engagements').toLocaleString()} 
            change={loading ? undefined : -2.4} 
            icon={Facebook} 
            description="Interações na página"
          />
        )}
        {visibleSections.instagram && (
          <MetricCard 
            title="IG Novos Seguidores" 
            value={loading ? "..." : getMetricValue(igData, 'follower_count').toLocaleString()} 
            change={loading ? undefined : 5.1} 
            icon={Instagram} 
            description="No período selecionado"
          />
        )}
        {visibleSections.ads && (
          <MetricCard 
            title="Investimento Ads" 
            value={loading ? "..." : `R$ ${Number(getAdsMetric(adsData, 'spend')).toFixed(2)}`} 
            change={loading ? undefined : 0} 
            icon={BarChart3} 
            description="Gasto no período"
          />
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 print:hidden">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          {visibleSections.facebook && <TabsTrigger value="facebook">Facebook</TabsTrigger>}
          {visibleSections.instagram && <TabsTrigger value="instagram">Instagram</TabsTrigger>}
          {visibleSections.ads && <TabsTrigger value="ads">Anúncios (ADS)</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Crescimento e Alcance
              </CardTitle>
              <CardDescription>Visualização combinada dos últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="reach" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorReach)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-md font-bold">Resumo por Canal</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Facebook', value: 1200 },
                    { name: 'Instagram', value: 3400 },
                    { name: 'Ads', value: 800 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-md font-bold">Melhores Postagens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-12 h-12 rounded bg-muted flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Postagem de exemplo #{i}</p>
                        <p className="text-xs text-muted-foreground">Instagram • 2.4k Alcance</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">124</p>
                        <p className="text-[10px] text-muted-foreground text-xs uppercase">Interações</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="facebook" className="mt-6">
          <div className="p-8 text-center text-muted-foreground bg-card/30 rounded-lg border border-border">
            Dados detalhados do Facebook aparecerão aqui.
          </div>
        </TabsContent>
        {/* Adicionar outros conteúdos conforme necessário */}
      </Tabs>

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            padding: 20px;
          }
          .animate-slide-in {
            animation: none !important;
            transform: none !important;
          }
          .card {
            border: 1px solid #eee !important;
            box-shadow: none !important;
          }
          button {
            display: none !important;
          }
          header, nav, .print-hidden {
            display: none !important;
          }
        }
      ` }} />
    </div>
  );
}
