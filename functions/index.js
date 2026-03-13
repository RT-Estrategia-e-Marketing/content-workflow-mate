const functions = require("firebase-functions");
const admin = require("firebase-admin");
try { admin.initializeApp(); } catch (e) {}

const db = admin.firestore();

/**
 * Tradutor de erros da Meta para mensagens amigáveis.
 */
function translateMetaError(message) {
  if (!message) return "Erro desconhecido na Meta.";
  if (message.includes('access token') || message.includes('permission')) return "Erro de permissão/token expirado.";
  if (message.includes('whitelist') || message.includes('capability')) return "Funcionalidade restrita pela Meta.";
  return message;
}

/**
 * Função interna para disparar publicação "AGORA" (Facebook/Instagram).
 */
async function publishMedia(postData, clientData) {
  const { default: fetch } = await import('node-fetch');
  const results = { fb: null, ig: null, errors: [] };

  const { meta_access_token, meta_page_id, meta_ig_account_id } = clientData;
  const { caption, image_url, images, video_url, type, platform } = postData;

  // 1. FACEBOOK
  if (platform === 'facebook' || platform === 'both') {
    try {
      let endpoint = `https://graph.facebook.com/v19.0/${meta_page_id}`;
      const params = new URLSearchParams();
      params.append('access_token', meta_access_token);

      if (image_url && type !== 'reels') {
        endpoint += '/photos';
        params.append('url', image_url);
        params.append('caption', caption);
      } else if (video_url || type === 'reels') {
        endpoint += '/videos';
        params.append('file_url', video_url || image_url);
        params.append('description', caption);
      } else {
        endpoint += '/feed';
        params.append('message', caption);
      }

      const res = await fetch(endpoint, { method: 'POST', body: params });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      results.fb = data.id;
    } catch (e) {
      results.errors.push(`FB: ${translateMetaError(e.message)}`);
    }
  }

  // 2. INSTAGRAM
  if (platform === 'instagram' || platform === 'both') {
    try {
      let creationId = null;

      if (type === 'carousel') {
        const itemIds = [];
        for (const url of images || []) {
          const p = new URLSearchParams({ access_token: meta_access_token, is_carousel_item: 'true', image_url: url });
          const r = await fetch(`https://graph.facebook.com/v19.0/${meta_ig_account_id}/media`, { method: 'POST', body: p });
          const d = await r.json();
          if (d.id) itemIds.push(d.id);
        }
        const cp = new URLSearchParams({ access_token: meta_access_token, caption, media_type: 'CAROUSEL', children: itemIds.join(',') });
        const cr = await fetch(`https://graph.facebook.com/v19.0/${meta_ig_account_id}/media`, { method: 'POST', body: cp });
        const cd = await cr.json();
        creationId = cd.id;
      } else {
        const cp = new URLSearchParams({ access_token: meta_access_token, caption });
        if (type === 'reels') {
          cp.append('media_type', 'REELS');
          cp.append('video_url', video_url || image_url);
        } else {
          cp.append('image_url', image_url);
        }
        const cr = await fetch(`https://graph.facebook.com/v19.0/${meta_ig_account_id}/media`, { method: 'POST', body: cp });
        const cd = await cr.json();
        creationId = cd.id;
      }

      if (!creationId) throw new Error("Não foi possível criar o container de mídia.");

      // Publish
      const publishParams = new URLSearchParams({ access_token: meta_access_token, creation_id: creationId });
      const publishRes = await fetch(`https://graph.facebook.com/v19.0/${meta_ig_account_id}/media_publish`, { method: 'POST', body: publishParams });
      const publishData = await publishRes.json();
      if (publishData.error) throw new Error(publishData.error.message);
      results.ig = publishData.id;
    } catch (e) {
      results.errors.push(`IG: ${translateMetaError(e.message)}`);
    }
  }

  return results;
}

/**
 * Worker agendado que roda a cada 5 minutos.
 * Busca posts 'scheduled' que já passaram do horário e publica.
 */
exports.processScheduledPosts = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  const nowUnix = Math.floor(Date.now() / 1000);
  
  const snapshot = await db.collection('posts')
    .where('stage', '==', 'scheduled')
    .where('scheduled_unix', '<=', nowUnix)
    .limit(10) // Processa em lotes pequenos
    .get();

  if (snapshot.empty) return null;

  functions.logger.info(`Processando ${snapshot.size} posts agendados.`);

  const clientsCache = {};

  for (const doc of snapshot.docs) {
    const post = doc.data();
    const postId = doc.id;

    try {
      // Busca dados do cliente (para tokens)
      if (!clientsCache[post.client_id]) {
        const clientDoc = await db.collection('clients').doc(post.client_id).get();
        clientsCache[post.client_id] = clientDoc.data();
      }
      const client = clientsCache[post.client_id];

      if (!client || !client.meta_access_token) {
        throw new Error("Cliente sem token/integração.");
      }

      const results = await publishMedia(post, client);

      if (results.errors.length > 0 && !results.fb && !results.ig) {
        await doc.ref.update({ 
          stage: 'adjustments', 
          publishing_error: results.errors.join(' | ') 
        });
        functions.logger.error(`Falha no post ${postId}:`, results.errors);
      } else {
        await doc.ref.update({ 
          stage: 'approved', 
          published_at: admin.firestore.FieldValue.serverTimestamp(),
          meta_ids: { fb: results.fb, ig: results.ig }
        });
        functions.logger.info(`Post ${postId} publicado com sucesso.`);
      }
    } catch (err) {
      functions.logger.error(`Erro crítico no post ${postId}:`, err);
      await doc.ref.update({ stage: 'adjustments', publishing_error: err.message });
    }
  }

  return null;
});

/**
 * Troca Token (Mantida com novo nome para compatibilidade)
 */
exports.exchangeMetaToken = functions.region('us-central1').https.onCall(async (data, context) => {
  const { shortLivedToken } = data;
  const clientId = process.env.META_CLIENT_ID || (functions.config().meta ? functions.config().meta.client_id : null);
  const clientSecret = process.env.META_CLIENT_SECRET || (functions.config().meta ? functions.config().meta.client_secret : null);

  const { default: fetch } = await import('node-fetch');
  const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`;
  
  const res = await fetch(longLivedUrl);
  const userData = await res.json();
  const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userData.access_token}&limit=100`);
  const pagesData = await pagesRes.json();

  return { data: pagesData.data || [] };
});
