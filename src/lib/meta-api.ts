/**
 * Utilitários para Integração com a Graph API da Meta
 * Documentação: https://developers.facebook.com/docs/graph-api
 */

interface MetaPublishParams {
    pageId: string;
    igAccountId?: string;
    accessToken: string;
    caption: string;
    imageUrl?: string;
    videoUrl?: string;
    images?: string[]; // Para Carrossel
    type?: 'image' | 'reels' | 'carousel' | 'story';
    videoThumbnailUrl?: string;
    scheduledPublishTime?: number; // Unix timestamp em segundos
}

export interface DateRangeFilter {
    preset?: string;   // e.g. 'last_30d', 'last_7d', 'this_month', 'today', 'yesterday'
    since?: number;    // Unix timestamp (seconds) — used for specific months
    until?: number;    // Unix timestamp (seconds) — used for specific months
}

/**
 * Traduz erros da Meta para mensagens amigáveis em português
 */
function translateMetaError(error: any): string {
    const message = error?.message || (typeof error === 'string' ? error : 'Erro desconhecido');

    if (message.includes('access token') || message.includes('Session has expired')) {
        return "Sua conexão com o Meta expirou. Por favor, vá nas configurações do cliente e clique em 'Reconectar com Meta' para continuar publicando.";
    }

    if (message.includes('permissions') || message.includes('permission')) {
        return "Erro de permissão: o token atual não possui as autorizações necessárias. Vá em Configurações do Cliente → Reconectar com Meta para gerar um novo token com todas as permissões.";
    }

    if (message.includes('whitelist') || message.includes('capability')) {
        return "Erro de Whitelist: Se seu App na Meta está em modo 'Live', ele bloqueia essa permissão até que você passe pelo App Review oficial. Mude para modo 'Development' no painel da Meta para testar livremente.";
    }

    if (message.includes('scheduled_publish_time')) {
        return "Erro no agendamento. O horário deve ser pelo menos 20 minutos no futuro e no máximo 75 dias.";
    }

    return message;
}

/**
 * Publicar no Facebook
 */
export async function publishToFacebook({ pageId, accessToken, caption, imageUrl, videoUrl, scheduledPublishTime }: MetaPublishParams): Promise<{ id: string } | null> {
    let endpoint = `https://graph.facebook.com/v19.0/${pageId}`;
    const formData = new URLSearchParams();
    formData.append('access_token', accessToken);
    if (imageUrl) {
        endpoint += '/photos';
        formData.append('url', imageUrl);
        formData.append('caption', caption);
    } else if (videoUrl) {
        endpoint += '/videos';
        formData.append('file_url', videoUrl);
        formData.append('description', caption);
    } else {
        endpoint += '/feed';
        formData.append('message', caption);
    }

    if (scheduledPublishTime) {
        formData.append('scheduled_publish_time', scheduledPublishTime.toString());
        formData.append('published', 'false');
    }

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data;
    } catch (err: any) {
        console.error('Erro ao publicar no Facebook:', err);
        throw new Error(translateMetaError(err));
    }
}

/**
 * Publicar no Instagram (Suporta Image, Reels, Story, Carousel)
 */
export async function publishToInstagram({ igAccountId, accessToken, caption, imageUrl, videoUrl, images, type = 'image', videoThumbnailUrl, scheduledPublishTime }: MetaPublishParams): Promise<{ id: string } | null> {
    if (!igAccountId) throw new Error('Conta IG não configurada.');

    try {
        let creationId = '';

        if (type === 'carousel' && images && images.length > 0) {
            const itemIds = [];
            for (const img of images) {
                const itemParams = new URLSearchParams();
                itemParams.append('access_token', accessToken);
                itemParams.append('image_url', img);
                itemParams.append('is_carousel_item', 'true');

                const itemRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media`, { method: 'POST', body: itemParams });
                const itemData = await itemRes.json();
                if (itemData.error) throw new Error(`Erro em item do carrossel: ${itemData.error.message}`);
                itemIds.push(itemData.id);
            }

            const containerParams = new URLSearchParams();
            containerParams.append('access_token', accessToken);
            containerParams.append('caption', caption);
            containerParams.append('media_type', 'CAROUSEL');
            containerParams.append('children', itemIds.join(','));
            if (scheduledPublishTime) {
                containerParams.append('scheduled_publish_time', scheduledPublishTime.toString());
                containerParams.append('published', 'false');
            }

            const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media`, { method: 'POST', body: containerParams });
            const containerData = await containerRes.json();
            if (containerData.error) throw new Error(containerData.error.message);
            creationId = containerData.id;

        } else {
            const containerParams = new URLSearchParams();
            containerParams.append('access_token', accessToken);
            containerParams.append('caption', caption);

            if (type === 'reels') {
                containerParams.append('media_type', 'REELS');
                containerParams.append('video_url', videoUrl || '');
                if (videoThumbnailUrl) containerParams.append('cover_url', videoThumbnailUrl);
            } else if (type === 'story') {
                containerParams.append('media_type', 'STORIES');
                if (imageUrl) containerParams.append('image_url', imageUrl);
                else if (videoUrl) containerParams.append('video_url', videoUrl);
            } else {
                containerParams.append('image_url', imageUrl || '');
            }

            if (scheduledPublishTime) {
                containerParams.append('scheduled_publish_time', scheduledPublishTime.toString());
                containerParams.append('published', 'false');
            }

            const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media`, { method: 'POST', body: containerParams });
            const containerData = await containerRes.json();
            if (containerData.error) throw new Error(containerData.error.message);

            creationId = containerData.id;
            if (!creationId) throw new Error('Não foi possível gerar o ID do container de mídia (creationId vazio).');
        }

        if (scheduledPublishTime) {
            return { id: creationId };
        }

        const publishParams = new URLSearchParams();
        publishParams.append('access_token', accessToken);
        publishParams.append('creation_id', creationId);

        const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media_publish`, { method: 'POST', body: publishParams });
        const publishData = await publishRes.json();
        if (publishData.error) throw new Error(publishData.error.message);

        return publishData;
    } catch (err: any) {
        console.error('Erro ao publicar no Instagram:', err);
        throw new Error(translateMetaError(err));
    }
}

// ─── INSIGHTS ────────────────────────────────────────────────────────────────

/**
 * Converte um preset de data (ex: 'last_30d') para timestamps Unix since/until.
 * Necessário para chamadas metric_type=total_value que não suportam date_preset.
 */
function presetToSinceUntil(preset: string): { since: number; until: number } {
    const now = new Date();
    const until = Math.floor(now.getTime() / 1000);
    switch (preset) {
        case 'today': {
            const start = new Date(now); start.setHours(0, 0, 0, 0);
            return { since: Math.floor(start.getTime() / 1000), until };
        }
        case 'yesterday': {
            const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
            const end = new Date(start); end.setHours(23, 59, 59, 0);
            return { since: Math.floor(start.getTime() / 1000), until: Math.floor(end.getTime() / 1000) };
        }
        case 'last_7d': {
            const start = new Date(now); start.setDate(start.getDate() - 7);
            return { since: Math.floor(start.getTime() / 1000), until };
        }
        case 'this_month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            return { since: Math.floor(start.getTime() / 1000), until };
        }
        default: { // last_30d and specific months (already have since/until from caller)
            const start = new Date(now); start.setDate(start.getDate() - 30);
            return { since: Math.floor(start.getTime() / 1000), until };
        }
    }
}

/**
 * Resolve os parâmetros de data para a URL da API Meta.
 * Suporta preset (last_30d, this_month, etc.) ou since/until (timestamps Unix).
 */
function buildDateParams(filter: DateRangeFilter): string {
    if (filter.since && filter.until) {
        return `&since=${filter.since}&until=${filter.until}`;
    }
    const preset = filter.preset || 'last_30d';
    return `&date_preset=${preset}`;
}

/**
 * Retorna always since/until como string de parâmetros.
 * Usado para endpoints que não suportam date_preset (ex: metric_type=total_value).
 */
function buildSinceUntilParams(filter: DateRangeFilter): string {
    if (filter.since && filter.until) {
        return `&since=${filter.since}&until=${filter.until}`;
    }
    const { since, until } = presetToSinceUntil(filter.preset || 'last_30d');
    return `&since=${since}&until=${until}`;
}

/**
 * Buscar Insights da Página do Facebook (Orgânico)
 * Retorna métricas por dia para gráficos temporais.
 */
export async function getPageInsights(pageId: string, accessToken: string, filter: DateRangeFilter | string = 'last_30d') {
    const dateFilter: DateRangeFilter = typeof filter === 'string' ? { preset: filter } : filter;
    const dateParams = buildDateParams(dateFilter);

    // Fetch each metric individually so a single invalid/deprecated metric
    // does not kill the entire batch (error #100 rejects the whole request).
    const metricList = [
        'page_impressions',
        'page_impressions_unique',
        'page_post_engagements',
        'page_fan_adds',
        'page_views_total',
    ];

    const results = await Promise.allSettled(
        metricList.map(metric =>
            fetch(
                `https://graph.facebook.com/v19.0/${pageId}/insights?metric=${metric}&period=day${dateParams}&access_token=${accessToken}`
            )
                .then(r => r.json())
                .then(data => {
                    if (data.error) throw new Error(`[${metric}] ${data.error.message}`);
                    return data.data || [];
                })
        )
    );

    const combined: any[] = [];
    results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
            combined.push(...result.value);
        } else {
            console.warn(`FB Insights: métrica '${metricList[i]}' ignorada —`, (result as PromiseRejectedResult).reason?.message);
        }
    });

    if (combined.length === 0) {
        throw new Error('Nenhuma métrica do Facebook Insights pôde ser carregada.');
    }

    return combined;
}

/**
 * Buscar métricas totais da Página do Facebook (lifetime/summary)
 * Inclui fans totais (seguirdores actuais).
 */
export async function getPageSummary(pageId: string, accessToken: string) {
    try {
        const fields = 'fan_count,followers_count,name,picture';
        const url = `https://graph.facebook.com/v19.0/${pageId}?fields=${fields}&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data;
    } catch (err: any) {
        console.error('Erro ao buscar summary do Facebook:', err);
        throw new Error(translateMetaError(err));
    }
}

/**
 * Buscar Posts Recentes do Facebook com métricas por post
 */
export async function getFBRecentPosts(pageId: string, accessToken: string, limit = 10) {
    try {
        // Basic fields available with pages_read_engagement.
        // likes.summary / reactions.summary require a fresh token with pages_read_user_content.
        // If the client has reconnected Meta after the app was published, the full fields below work.
        const fields = 'id,message,story,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares,reactions.summary(true)';
        const url = `https://graph.facebook.com/v19.0/${pageId}/posts?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            // If permission error, fall back to basic fields
            if (data.error.code === 200 || data.error.code === 10 ||
                (data.error.message || '').toLowerCase().includes('permission')) {
                const basicFields = 'id,message,story,created_time,full_picture,permalink_url';
                const fallbackUrl = `https://graph.facebook.com/v19.0/${pageId}/posts?fields=${basicFields}&limit=${limit}&access_token=${accessToken}`;
                const fbRes = await fetch(fallbackUrl);
                const fbData = await fbRes.json();
                if (fbData.error) throw new Error(fbData.error.message);
                return fbData.data || [];
            }
            throw new Error(data.error.message);
        }
        return data.data || [];
    } catch (err: any) {
        console.error('Erro ao buscar posts do Facebook:', err);
        throw new Error(translateMetaError(err));
    }
}

/**
 * Buscar Insights do Instagram Business Account
 * Suporta filtro por data (preset ou since/until)
 */
export async function getInstagramInsights(igAccountId: string, accessToken: string, filter: DateRangeFilter | string = 'last_30d') {
    const dateFilter: DateRangeFilter = typeof filter === 'string' ? { preset: filter } : filter;
    const base = `https://graph.facebook.com/v19.0/${igAccountId}/insights`;

    // The IG Insights API has two incompatible metric types:
    // 1. period=day + date_preset  → time-series (values[])  for: reach, follower_count
    // 2. metric_type=total_value   → aggregate total          for all other metrics
    //    IMPORTANT: metric_type=total_value does NOT accept date_preset — must use since/until.
    const timeSeriesMetrics = 'reach,follower_count';
    const totalValueMetrics = [
        'profile_views', 'accounts_engaged', 'total_interactions',
        'likes', 'comments', 'saves', 'shares', 'follows_and_unfollows',
    ].join(',');

    const dateParams = buildDateParams(dateFilter);          // for time-series (supports date_preset)
    const sinceUntilParams = buildSinceUntilParams(dateFilter); // for total_value (requires since/until)

    try {
        const [tsRes, tvRes] = await Promise.all([
            fetch(`${base}?metric=${timeSeriesMetrics}&period=day${dateParams}&access_token=${accessToken}`).then(r => r.json()),
            fetch(`${base}?metric=${totalValueMetrics}&metric_type=total_value&period=day${sinceUntilParams}&access_token=${accessToken}`).then(r => r.json()),
        ]);

        if (tsRes.error) {
            console.error('Meta API Error (IG Insights time-series):', tsRes.error);
            throw new Error(tsRes.error.message);
        }
        if (tvRes.error) {
            console.error('Meta API Error (IG Insights total_value):', tvRes.error);
            throw new Error(tvRes.error.message);
        }

        // Normalize total_value metrics into values[] format so existing helpers (getMetricValue) work
        const normalizedTv = (tvRes.data || []).map((m: any) => ({
            ...m,
            values: [{ value: m.total_value?.value ?? 0, end_time: '' }],
        }));

        return [...(tsRes.data || []), ...normalizedTv];
    } catch (err: any) {
        console.error('Erro ao buscar insights do Instagram:', err);
        throw new Error(translateMetaError(err));
    }
}

/**
 * Buscar detalhes da conta do Instagram (seguidores, nome, foto)
 */
export async function getIGAccountDetails(igAccountId: string, accessToken: string) {
    try {
        const fields = 'name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website';
        const url = `https://graph.facebook.com/v19.0/${igAccountId}?fields=${fields}&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data;
    } catch (err: any) {
        console.error('Erro ao buscar account details do Instagram:', err);
        throw new Error(translateMetaError(err));
    }
}

/**
 * Buscar Posts Recentes do Instagram com métricas por post
 */
export async function getIGRecentMedia(igAccountId: string, accessToken: string, limit = 10) {
    try {
        // Métricas válidas para media insights: reach, impressions, saved, video_views,
        // total_interactions, plays. 'engagement' e 'engagement_rate' foram deprecados.
        const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,insights.metric(reach,impressions,saved,total_interactions,plays)';
        const url = `https://graph.facebook.com/v19.0/${igAccountId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.data || [];
    } catch (err: any) {
        console.error('Erro ao buscar mídia do Instagram:', err);
        throw new Error(translateMetaError(err));
    }
}

/**
 * Buscar Insights de Anúncios (Ads)
 * Suporta filtro por data (preset ou since/until)
 */
export async function getAdsInsights(adAccountId: string, accessToken: string, filter: DateRangeFilter | string = 'last_30d') {
    const dateFilter: DateRangeFilter = typeof filter === 'string' ? { preset: filter } : filter;

    const fields = [
        'spend',
        'impressions',
        'clicks',
        'cpc',
        'ctr',
        'reach',
        'frequency',
        'cost_per_result',
        'actions',
        'video_30_sec_watched_actions',
    ].join(',');

    try {
        const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
        const dateParams = buildDateParams(dateFilter);
        const url = `https://graph.facebook.com/v19.0/${id}/insights?fields=${fields}${dateParams}&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.data;
    } catch (err: any) {
        console.error('Erro ao buscar insights de Ads:', err);
        throw new Error(translateMetaError(err));
    }
}

/**
 * Buscar Campanhas de Ads (Ativas e Inativas) expandido com Insights de Performance
 */
export async function getAdsCampaigns(adAccountId: string, accessToken: string, filter: DateRangeFilter | string = 'last_30d') {
    try {
        const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
        const dateFilter: DateRangeFilter = typeof filter === 'string' ? { preset: filter } : filter;
        const dateParams = buildDateParams(dateFilter);
        
        // Passando 'dateParams' (ex: date_preset=last_30d) dentro do nó insights para retornar 
        // os resultados limitados ao período selecionado no painel.
        // Trazendo métricas críticas para analisar "se foi bem ou não":
        const insightsFields = 'spend,reach,impressions,clicks,cpc,ctr,cost_per_result,actions';
        const fields = `id,name,status,objective,spend_cap,effective_status,insights.limit(1){${insightsFields}}`;
        
        const url = `https://graph.facebook.com/v19.0/${id}/campaigns?fields=${fields}&limit=50${dateParams}&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error.message);
        return data.data || [];
    } catch (err: any) {
        console.error('Erro ao buscar campanhas de Ads:', err);
        throw new Error(translateMetaError(err));
    }
}
