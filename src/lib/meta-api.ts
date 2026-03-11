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
    // TODO: Adicionar agendamento futuro (scheduled_publish_time) quando o MVP estiver redondo.
}

export async function publishToFacebook({ pageId, accessToken, caption, imageUrl, videoUrl }: MetaPublishParams): Promise<{ id: string } | null> {
    let endpoint = `https://graph.facebook.com/v19.0/${pageId}`;
    const formData = new URLSearchParams();
    formData.append('access_token', accessToken);
    formData.append('message', caption);

    if (imageUrl) {
        endpoint += '/photos';
        formData.append('url', imageUrl);
    } else if (videoUrl) {
        endpoint += '/videos';
        formData.append('file_url', videoUrl);
        formData.append('description', caption); // Videos use description instead of message
    } else {
        endpoint += '/feed'; // Text only
    }

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const data = await res.json();

        if (data.error) {
            console.error('Erro Meta (Facebook):', data.error);
            throw new Error(data.error.message);
        }

        return data;
    } catch (err) {
        console.error('Erro ao publicar no Facebook:', err);
        throw err;
    }
}

export async function publishToInstagram({ igAccountId, accessToken, caption, imageUrl, videoUrl }: MetaPublishParams): Promise<{ id: string } | null> {
    if (!igAccountId || (!imageUrl && !videoUrl)) {
        throw new Error('A publicação no Instagram requer uma Conta IG válida e pelo menos uma imagem ou vídeo.');
    }

    try {
        // Passo 1: Criar o Container de Mídia
        const containerParams = new URLSearchParams();
        containerParams.append('access_token', accessToken);
        containerParams.append('caption', caption);

        if (imageUrl) {
            containerParams.append('image_url', imageUrl);
        } else if (videoUrl) {
            containerParams.append('media_type', 'REELS');
            containerParams.append('video_url', videoUrl);
        }

        const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media`, {
            method: 'POST',
            body: containerParams
        });
        const containerData = await containerRes.json();

        if (containerData.error) {
            console.error('Erro Meta (IG Container):', containerData.error);
            throw new Error(containerData.error.message);
        }

        const creationId = containerData.id;

        // Passo 2: Publicar o Container
        const publishParams = new URLSearchParams();
        publishParams.append('access_token', accessToken);
        publishParams.append('creation_id', creationId);

        const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media_publish`, {
            method: 'POST',
            body: publishParams
        });
        const publishData = await publishRes.json();

        if (publishData.error) {
            console.error('Erro Meta (IG Publish):', publishData.error);
            throw new Error(publishData.error.message);
        }

        return publishData;
    } catch (err) {
        console.error('Erro ao publicar no Instagram:', err);
        throw err;
    }
}
