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

    if (message.includes('permissions')) {
        return "Erro de permissão. Certifique-se de que você concedeu todas as autorizações solicitadas durante o login com o Facebook.";
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
 * Buscar Insights da Página do Facebook (Orgânico)
 * Retorna métricas por dia para gráficos temporais.
 */
export async function getPageInsights(pageId: string, accessToken: string, filter: DateRangeFilter | string = 'last_30d') {
    const dateFilter: DateRangeFilter = typeof filter === 'string' ? { preset: filter } : filter;

    const metrics = [
        'page_impressions',
        'page_impressions_unique',
        'page_post_engagements',
        'page_fans',
        'page_fan_adds',
        'page_fan_removes',
        'page_views_total',
        'page_actions_post_reactions_total',
    ].join(',');

    try {
        const dateParams = buildDateParams(dateFilter);
        const url = `https://graph.facebook.com/v19.0/${pageId}/insights?metric=${metrics}&period=day${dateParams}&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            console.error('Meta API Error (Page Insights):', data.error);
            if (data.error.code === 10 || data.error.code === 200) {
                console.warn('Falta de permissão para métricas específicas do Facebook.');
            }
            throw new Error(data.error.message);
        }
        return data.data;
    } catch (err: any) {
        console.error('Erro ao buscar insights do Facebook:', err);
        throw new Error(translateMetaError(err));
    }
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
        const fields = 'id,message,story,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares,reactions.summary(true)';
        const url = `https://graph.facebook.com/v19.0/${pageId}/posts?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
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

    const metrics = [
        'reach',
        'impressions',
        'profile_views',
        'accounts_engaged',
        'total_interactions',
        'follower_count',
    ].join(',');

    try {
        const dateParams = buildDateParams(dateFilter);
        const url = `https://graph.facebook.com/v19.0/${igAccountId}/insights?metric=${metrics}&period=day${dateParams}&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            console.error('Meta API Error (IG Insights):', data.error);
            throw new Error(data.error.message);
        }
        return data.data;
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
        const fields = 'name,biography,followers_count,follows_count,media_count,profile_picture_url,website';
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
        const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,insights.metric(reach,impressions,engagement)';
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
 * Buscar Campanhas ativas da conta de Ads
 */
export async function getAdsCampaigns(adAccountId: string, accessToken: string) {
    try {
        const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
        const fields = 'id,name,status,objective,spend_cap,budget_remaining,effective_status';
        const url = `https://graph.facebook.com/v19.0/${id}/campaigns?fields=${fields}&limit=20&access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.data || [];
    } catch (err: any) {
        console.error('Erro ao buscar campanhas de Ads:', err);
        throw new Error(translateMetaError(err));
    }
}
