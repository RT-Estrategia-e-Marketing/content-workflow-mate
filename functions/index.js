const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { defineString } = require('firebase-functions/params');

// Define secrets/parameters
const metaClientId = defineString('META_CLIENT_ID');
const metaClientSecret = defineString('META_CLIENT_SECRET');

/**
 * Exchanges a short-lived Meta user access token for long-lived and permanent page tokens.
 */
exports.metaTokenExchange = onCall({ cors: true }, async (request) => {
  try {
    const { shortLivedToken } = request.data;

    if (!shortLivedToken) {
      throw new HttpsError('invalid-argument', 'O token de curta duração (shortLivedToken) é obrigatório.');
    }

    let clientId, clientSecret;
    try {
      // Tenta ler dos Params ou do process.env (suporte ao arquivo .env)
      clientId = process.env.META_CLIENT_ID || (metaClientId.value ? metaClientId.value() : null);
      clientSecret = process.env.META_CLIENT_SECRET || (metaClientSecret.value ? metaClientSecret.value() : null);
      
      logger.info('Tentando usar App ID:', clientId ? clientId.substring(0, 4) + '...' : 'Nulo');
    } catch (e) {
      logger.error('Erro ao ler segredos da Meta:', e);
    }

    if (!clientId || !clientSecret) {
      logger.error('Meta App credentials are not configured in Firebase');
      throw new HttpsError('failed-precondition', 'Credenciais da Meta não encontradas no ambiente do Firebase.');
    }

    logger.info('Iniciando troca de token para o App ID:', clientId);

    // Dynamic import for node-fetch as it is an ESM module
    const { default: fetch } = await import('node-fetch');

    // 1. Exchange short-lived User Token for a long-lived User Token (60 days)
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`;
    
    const longLivedUserRes = await fetch(longLivedUrl);
    const longLivedUserData = await longLivedUserRes.json();

    if (longLivedUserData.error) {
      logger.error('Meta API (User Token) Error:', longLivedUserData.error);
      throw new HttpsError('internal', `Erro Meta (User Token): ${longLivedUserData.error.message} (Tipo: ${longLivedUserData.error.type})`);
    }

    const longLivedUserToken = longLivedUserData.access_token;
    if (!longLivedUserToken) {
      throw new HttpsError('internal', 'Meta não retornou um access_token de longa duração.');
    }

    // 2. Use long-lived User Token to get Page Access Tokens (these are usually permanent)
    logger.info('Buscando contas/páginas vinculadas...');
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedUserToken}&limit=100`
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      logger.error('Meta API (Pages) Error:', pagesData.error);
      throw new HttpsError('internal', `Erro Meta (Páginas): ${pagesData.error.message}`);
    }

    // Return the list of pages with their long-lived/permanent access tokens
    return {
      data: pagesData.data || [],
      message: 'Tokens trocados com sucesso'
    };

  } catch (error) {
    logger.error('Erro fatal em metaTokenExchange:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', `Erro Interno: ${error.message || 'Falha desconhecida no servidor'}`);
  }
});
