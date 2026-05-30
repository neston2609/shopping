// Generic OAuth2 authorization-code helpers shared by OneDrive + Google Drive.
const prisma = require('../prisma');
const { encrypt, decrypt } = require('../crypto');
const env = require('../../config/env');

const PROVIDERS = {
  onedrive: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope: 'offline_access Files.Read User.Read',
    accountFetch: async (accessToken) => {
      const r = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!r.ok) return null;
      const me = await r.json();
      return me.userPrincipalName || me.mail || me.displayName || '';
    },
  },
  googledrive: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email',
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    accountFetch: async (accessToken) => {
      const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!r.ok) return null;
      const me = await r.json();
      return me.email || me.name || '';
    },
  },
};

function redirectUri() {
  // Public route — no auth header; authenticated via signed state JWT.
  return `${env.publicUrl.replace(/\/$/, '')}/api/sources/oauth/callback`;
}

function providerFor(protocol) {
  const p = PROVIDERS[protocol];
  if (!p) throw new Error(`Unsupported OAuth provider: ${protocol}`);
  return p;
}

// Build the auth URL the admin should be redirected to.
function buildAuthUrl(source, state) {
  const p = providerFor(source.protocol);
  const params = new URLSearchParams({
    client_id: source.oauthClientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: p.scope,
    state,
    ...(p.extraAuthParams || {}),
  });
  return `${p.authUrl}?${params.toString()}`;
}

// Exchange the auth code for tokens; persists refresh + access tokens on the source.
async function exchangeCode(source, code) {
  const p = providerFor(source.protocol);
  const params = new URLSearchParams({
    client_id: source.oauthClientId,
    client_secret: decrypt(source.oauthClientSecretEnc),
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(),
  });
  const r = await fetch(p.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const tok = await r.json();
  if (!r.ok) throw new Error(tok.error_description || tok.error || 'Token exchange failed');
  const account = await p.accountFetch(tok.access_token).catch(() => '');
  await prisma.downloadSource.update({
    where: { id: source.id },
    data: {
      oauthRefreshTokenEnc: tok.refresh_token ? encrypt(tok.refresh_token) : source.oauthRefreshTokenEnc,
      oauthAccessTokenEnc: encrypt(tok.access_token),
      oauthExpiresAt: new Date(Date.now() + (tok.expires_in || 3600) * 1000),
      oauthAccount: account || source.oauthAccount,
    },
  });
}

// Get a valid access token, refreshing if expired.
async function getAccessToken(source) {
  if (!source.oauthRefreshTokenEnc) throw new Error(`Source "${source.name}" is not connected — finish the OAuth flow first.`);
  if (source.oauthAccessTokenEnc && source.oauthExpiresAt && new Date(source.oauthExpiresAt) > new Date(Date.now() + 60 * 1000)) {
    return decrypt(source.oauthAccessTokenEnc);
  }
  const p = providerFor(source.protocol);
  const params = new URLSearchParams({
    client_id: source.oauthClientId,
    client_secret: decrypt(source.oauthClientSecretEnc),
    refresh_token: decrypt(source.oauthRefreshTokenEnc),
    grant_type: 'refresh_token',
  });
  const r = await fetch(p.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const tok = await r.json();
  if (!r.ok) throw new Error(tok.error_description || tok.error || 'Token refresh failed');
  await prisma.downloadSource.update({
    where: { id: source.id },
    data: {
      oauthAccessTokenEnc: encrypt(tok.access_token),
      oauthExpiresAt: new Date(Date.now() + (tok.expires_in || 3600) * 1000),
      ...(tok.refresh_token ? { oauthRefreshTokenEnc: encrypt(tok.refresh_token) } : {}),
    },
  });
  return tok.access_token;
}

module.exports = { buildAuthUrl, exchangeCode, getAccessToken, redirectUri, PROVIDERS };
