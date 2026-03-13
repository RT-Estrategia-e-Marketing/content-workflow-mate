const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { defineString } = require('firebase-functions/params');

// Define secrets/parameters
const metaClientId = defineString('META_CLIENT_ID');
const metaClientSecret = defineString('META_CLIENT_SECRET');

/**
 * Exchanges a short-lived Meta user access token for long-lived and permanent page tokens.
 */
exports.metaTokenExchange = onRequest({ cors: true }, async (req, res) => {
  try {
    const { shortLivedToken } = req.body;

    if (!shortLivedToken) {
      res.status(400).json({ error: 'shortLivedToken is required' });
      return;
    }

    const clientId = metaClientId.value();
    const clientSecret = metaClientSecret.value();

    if (!clientId || !clientSecret) {
      logger.error('Meta App credentials are not configured in Firebase');
      res.status(500).json({ error: 'Meta App credentials not configured' });
      return;
    }

    logger.info('Exchanging short-lived token for long-lived token...');

    // Dynamic import for node-fetch as it is an ESM module
    const { default: fetch } = await import('node-fetch');

    // 1. Exchange short-lived User Token for a long-lived User Token (60 days)
    const longLivedUserRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`
    );
    const longLivedUserData = await longLivedUserRes.json();

    if (longLivedUserData.error) {
      logger.error('Meta API (User Token) Error:', longLivedUserData.error);
      res.status(400).json({ error: `Meta API (User Token): ${longLivedUserData.error.message}` });
      return;
    }

    const longLivedUserToken = longLivedUserData.access_token;

    // 2. Use long-lived User Token to get Page Access Tokens (these are usually permanent)
    logger.info('Fetching Page Access Tokens...');
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedUserToken}&limit=100`
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      logger.error('Meta API (Pages) Error:', pagesData.error);
      res.status(400).json({ error: `Meta API (Pages): ${pagesData.error.message}` });
      return;
    }

    // Return the list of pages with their long-lived/permanent access tokens
    res.status(200).json({
      data: pagesData.data,
      message: 'Tokens exchanged successfully'
    });

  } catch (error) {
    logger.error('Error in metaTokenExchange:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});
