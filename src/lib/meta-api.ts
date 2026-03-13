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
        return "Erro de permissão no Instagram: Esta funcionalidade de agendamento pode exigir que seu App na Meta esteja em modo 'Live' ou que você seja administrador do App.";
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
        formData.append('caption', caption); // Photos use 'caption'
    } else if (videoUrl) {
        endpoint += '/videos';
        formData.append('file_url', videoUrl);
        formData.append('description', caption); // Videos use 'description'
    } else {
        endpoint += '/feed';
        formData.append('message', caption); // Feed uses 'message'
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
            // 1. Criar itens do carrossel
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

            // 2. Criar container do carrossel
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
            // Simple Image, Reels, or Story
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
                // Default image
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
