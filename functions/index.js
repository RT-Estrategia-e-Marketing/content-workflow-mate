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
  if (message.includes('whitelist') || message.includes('capability')) {
    return "Erro de Whitelist: Se seu App na Meta está em modo 'Live', ele bloqueia essa permissão até que você passe pelo App Review. Volte para modo 'Development' para testar.";
  }
  return message;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Função interna para disparar publicação "AGORA" (Facebook/Instagram).
 */
async function publishMedia(postData, clientData) {
  const { caption, image_url, video_url, images, type, platform } = postData;
  const { meta_access_token, meta_page_id, meta_ig_account_id } = clientData;
  const results = { fb: null, ig: null, errors: [] };

  const { default: fetch } = await import('node-fetch');

  functions.logger.info(`Iniciando publishMedia para plataforma: ${platform}`, { type, image_url, video_url });

  // 1. FACEBOOK
  if (platform === 'facebook' || platform === 'both') {
    try {
      let endpoint = `https://graph.facebook.com/v19.0/${meta_page_id}`;
      const params = new URLSearchParams({ access_token: meta_access_token });

      if (type === 'image') {
        endpoint += '/photos';
        params.append('url', image_url);
        params.append('caption', caption || '');
      } else if (video_url || type === 'reels') {
        endpoint += '/videos';
        params.append('file_url', video_url || image_url);
        params.append('description', caption || '');
      } else {
        endpoint += '/feed';
        params.append('message', caption || '');
      }

      const res = await fetch(endpoint, { method: 'POST', body: params });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      results.fb = data.id;
      functions.logger.info(`Facebook OK: ${data.id}`);
    } catch (e) {
      functions.logger.error(`Erro Facebook: ${e.message}`);
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
          const isVideo = url.includes('.mp4') || url.includes('.mov');
          const p = new URLSearchParams({ access_token: meta_access_token, is_carousel_item: 'true' });
          if (isVideo) {
            p.append('media_type', 'VIDEO');
            p.append('video_url', url);
          } else {
            p.append('image_url', url);
          }
          const r = await fetch(`https://graph.facebook.com/v19.0/${meta_ig_account_id}/media`, { method: 'POST', body: p });
          const d = await r.json();
          if (d.id) itemIds.push(d.id);
          else functions.logger.error(`Erro ao criar item do carrossel:`, d.error);
        }
        const cp = new URLSearchParams({ access_token: meta_access_token, caption: caption || '', media_type: 'CAROUSEL', children: itemIds.join(',') });
        const cr = await fetch(`https://graph.facebook.com/v19.0/${meta_ig_account_id}/media`, { method: 'POST', body: cp });
        const cd = await cr.json();
        creationId = cd.id;
        if (cd.error) throw new Error(cd.error.message);
      } else {
        const cp = new URLSearchParams({ access_token: meta_access_token, caption: caption || '' });
        if (type === 'reels') {
          cp.append('media_type', 'REELS');
          cp.append('video_url', video_url || image_url);
        } else {
          cp.append('image_url', image_url);
        }
        const cr = await fetch(`https://graph.facebook.com/v19.0/${meta_ig_account_id}/media`, { method: 'POST', body: cp });
        const cd = await cr.json();
        creationId = cd.id;
        if (cd.error) throw new Error(cd.error.message);
      }

      if (!creationId) throw new Error("Não foi possível criar o container de mídia no Instagram.");

      // Polling para processamento de vídeo (Instagram demora alguns segundos)
      let attempts = 0;
      let status = 'IN_PROGRESS';
      while (attempts < 15 && status !== 'FINISHED') {
        await sleep(5000 * (attempts + 1) / 2); // Espera crescente
        const sr = await fetch(`https://graph.facebook.com/v19.0/${creationId}?fields=status_code&access_token=${meta_access_token}`);
        const sd = await sr.json();
        status = sd.status_code;
        if (status === 'ERROR') throw new Error(`Processamento de vídeo no Instagram falhou: ${sd.status_message || 'Erro desconhecido'}`);
        attempts++;
        functions.logger.info(`Instagram status check (${attempts}): ${status}`);
      }

      if (status !== 'FINISHED' && (type === 'reels' || type === 'carousel')) {
        functions.logger.warn("Avisando: Tentando publicar mesmo sem status FINISHED confirmado.");
      }

      // Publish
      functions.logger.info(`Publicando container Instagram: ${creationId}`);
      const publishParams = new URLSearchParams({ access_token: meta_access_token, creation_id: creationId });
      const publishRes = await fetch(`https://graph.facebook.com/v19.0/${meta_ig_account_id}/media_publish`, { method: 'POST', body: publishParams });
      const publishData = await publishRes.json();
      if (publishData.error) throw new Error(publishData.error.message);
      results.ig = publishData.id;
      functions.logger.info(`Instagram OK: ${publishData.id}`);
    } catch (e) {
      functions.logger.error(`Erro Instagram: ${e.message}`);
      results.errors.push(`IG: ${translateMetaError(e.message)}`);
    }
  }

  return results;
}

/**
 * Publicar Agora (Https Call)
 * Permite que o frontend dispare uma publicação imediata usando a lógica do servidor.
 */
exports.publishPostNow = functions.region('us-central1').https.onCall(async (data, context) => {
  try {
    const { postId } = data;
    if (!postId) throw new Error("postId é obrigatório.");

    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) throw new Error("Post não encontrado.");
    const post = postDoc.data();

    const clientDoc = await db.collection('clients').doc(post.client_id).get();
    if (!clientDoc.exists) throw new Error("Cliente não encontrado.");
    const client = clientDoc.data();

    if (!client.meta_access_token) throw new Error("Integração Meta não configurada.");

    const results = await publishMedia(post, client);

    if (results.errors.length > 0) {
      // Se era para postar em ambos e um deu certo, consideramos sucesso parcial
      const isBoth = post.platform === 'both';
      if (isBoth && (results.fb || results.ig)) {
        // Sucesso parcial - logamos mas retornamos sucesso
      } else if (!results.fb && !results.ig) {
        throw new Error(results.errors.join(' | '));
      }
    }

    // Atualiza status no banco
    await postDoc.ref.update({
      stage: 'approved',
      published_at: admin.firestore.FieldValue.serverTimestamp(),
      meta_ids: { fb: results.fb, ig: results.ig }
    });

    return { success: true, results };
  } catch (e) {
    functions.logger.error("Erro em publishPostNow:", e);
    throw new functions.https.HttpsError('internal', e.message);
  }
});

/**
 * Worker agendado que roda a cada 5 minutos.
 */
exports.processScheduledPosts = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  const nowUnix = Math.floor(Date.now() / 1000);
  functions.logger.info(`Cronjob iniciado em ${new Date().toISOString()}. Buscando posts <= ${nowUnix}`);

  const snapshot = await db.collection('posts')
    .where('stage', '==', 'scheduled')
    .where('scheduled_unix', '<=', nowUnix)
    .get();

  if (snapshot.empty) {
    functions.logger.info("Nenhum post para processar.");
    return null;
  }

  functions.logger.info(`Processando ${snapshot.size} posts agendados.`);
  const clientsCache = {};

  for (const doc of snapshot.docs) {
    const post = doc.data();
    const postId = doc.id;

    try {
      if (!clientsCache[post.client_id]) {
        const clientDoc = await db.collection('clients').doc(post.client_id).get();
        clientsCache[post.client_id] = clientDoc.data();
      }
      const client = clientsCache[post.client_id];

      if (!client || !client.meta_access_token) {
        throw new Error("Integração Meta não configurada para este cliente.");
      }

      const results = await publishMedia(post, client);

      // Se todas as plataformas solicitadas falharam
      if (results.errors.length > 0) {
        // Se falhou tudo ou se era 'both' e um deles falhou, movemos para ajustes para o usuário ver
        const isBoth = post.platform === 'both';
        const totalFailed = (isBoth && (!results.fb || !results.ig)) || (!isBoth && results.errors.length > 0);
        
        if (totalFailed) {
          await doc.ref.update({ 
            stage: 'adjustments', 
            publishing_error: results.errors.join(' | ') 
          });
          functions.logger.error(`Falha parcial ou total no post ${postId}`);
          continue;
        }
      }

      // Sucesso (ou pelo menos as plataformas principais foram)
      await doc.ref.update({ 
        stage: 'approved', 
        published_at: admin.firestore.FieldValue.serverTimestamp(),
        meta_ids: { fb: results.fb, ig: results.ig }
      });
      functions.logger.info(`Sucesso final no post ${postId}`);

    } catch (err) {
      functions.logger.error(`Erro crítico no post ${postId}:`, err);
      await doc.ref.update({ stage: 'adjustments', publishing_error: err.message });
    }
  }

  return null;
});

/**
 * Troca Token (Https Call)
 */
exports.exchangeMetaToken = functions.region('us-central1').https.onCall(async (data, context) => {
  try {
    const { shortLivedToken } = data;
    const clientId = process.env.META_CLIENT_ID || (functions.config().meta ? functions.config().meta.client_id : null);
    const clientSecret = process.env.META_CLIENT_SECRET || (functions.config().meta ? functions.config().meta.client_secret : null);

    const { default: fetch } = await import('node-fetch');
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`;
    
    const r1 = await fetch(longLivedUrl);
    const d1 = await r1.json();
    if (d1.error) throw new Error(d1.error.message);

    const r2 = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${d1.access_token}&limit=100`);
    const d2 = await r2.json();

    return { data: d2.data || [], message: 'OK' };
  } catch (e) {
    throw new functions.https.HttpsError('internal', e.message);
  }
});
