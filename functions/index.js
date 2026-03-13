const functions = require("firebase-functions");

/**
 * Exchanges a short-lived Meta user access token for long-lived and permanent page tokens.
 * Usando 1st Gen para máxima compatibilidade com a URL do SDK.
 */
exports.metaTokenExchange = functions.region('us-central1').https.onCall(async (data, context) => {
  try {
    const { shortLivedToken } = data;

    if (!shortLivedToken) {
      throw new functions.https.HttpsError('invalid-argument', 'O token de curta duração (shortLivedToken) é obrigatório.');
    }

    // Tenta ler do process.env (suporte ao arquivo .env) ou config legado
    const clientId = process.env.META_CLIENT_ID || (functions.config().meta ? functions.config().meta.client_id : null);
    const clientSecret = process.env.META_CLIENT_SECRET || (functions.config().meta ? functions.config().meta.client_secret : null);

    if (!clientId || !clientSecret) {
      functions.logger.error('Credenciais da Meta não encontradas no ambiente.');
      throw new functions.https.HttpsError('failed-precondition', 'Configuração ausente: META_CLIENT_ID ou META_CLIENT_SECRET não definidos.');
    }

    functions.logger.info('Iniciando troca de token (1st Gen) para o App ID:', clientId.substring(0, 4) + '...');

    const { default: fetch } = await import('node-fetch');

    // 1. Troca User Token Curto por Longo (60 dias)
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`;
    
    const longLivedUserRes = await fetch(longLivedUrl);
    const longLivedUserData = await longLivedUserRes.json();

    if (longLivedUserData.error) {
      functions.logger.error('Erro Meta (User Token):', longLivedUserData.error);
      throw new functions.https.HttpsError('internal', `Erro Meta: ${longLivedUserData.error.message}`);
    }

    const longLivedUserToken = longLivedUserData.access_token;

    // 2. Busca Tokens de Páginas (Permanentes)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedUserToken}&limit=100`
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      functions.logger.error('Erro Meta (Páginas):', pagesData.error);
      throw new functions.https.HttpsError('internal', `Erro Meta (Páginas): ${pagesData.error.message}`);
    }

    return {
      data: pagesData.data || [],
      message: 'Tokens trocados com sucesso (1st Gen)'
    };

  } catch (error) {
    functions.logger.error('Erro fatal:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message || 'Erro interno no servidor');
  }
});
