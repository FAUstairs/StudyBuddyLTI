import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { setOidcLoginState } from '../../../lib/lti-session';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).send('Method not allowed');
    return;
  }

  const params = req.method === 'POST' ? req.body : req.query;
  const { iss, login_hint, lti_message_hint } = params;
  const authorizationEndpoint = process.env.LTI_PLATFORM_AUTHORIZATION_ENDPOINT;
  const resolvedClientId = process.env.LTI_CLIENT_ID ?? '';
  const platformIssuer = process.env.LTI_PLATFORM_ISSUER ?? 'http://localhost';

  if (!authorizationEndpoint) {
    res.status(500).send('Missing LTI_PLATFORM_AUTHORIZATION_ENDPOINT');
    return;
  }

  if (!resolvedClientId) {
    res.status(500).send('Missing LTI_CLIENT_ID');
    return;
  }

  if (!login_hint) {
    res.status(400).send('Missing login_hint');
    return;
  }

  if (iss && String(iss) !== platformIssuer) {
    res.status(403).send('Unknown LTI platform issuer');
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  setOidcLoginState(res, state, nonce);
  const redirectUri = getRedirectUri(req);
  const url = new URL(authorizationEndpoint);

  url.searchParams.set('scope', 'openid');
  url.searchParams.set('response_type', 'id_token');
  url.searchParams.set('response_mode', 'form_post');
  url.searchParams.set('prompt', 'none');
  url.searchParams.set('client_id', resolvedClientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('login_hint', String(login_hint));
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);

  if (lti_message_hint) {
    url.searchParams.set('lti_message_hint', String(lti_message_hint));
  }

  res.redirect(302, url.toString());
}

function getRedirectUri(req: NextApiRequest) {
  const configuredUri = process.env.LTI_REDIRECT_URI ?? `${getBaseUrl(req)}/api/lti/launch`;
  const redirectUri = new URL(configuredUri);

  if (!redirectUri.pathname.startsWith('/StudyBuddy/')) {
    redirectUri.pathname = `/StudyBuddy${redirectUri.pathname.startsWith('/') ? '' : '/'}${redirectUri.pathname}`;
  }

  return redirectUri.toString();
}

function getBaseUrl(req: NextApiRequest) {
  if (process.env.LTI_TOOL_BASE_URL) {
    return process.env.LTI_TOOL_BASE_URL.replace(/\/+$/, '');
  }

  const proto = req.headers['x-forwarded-proto'] ?? 'http';
  return `${String(proto).split(',')[0]}://${req.headers.host}`;
}
