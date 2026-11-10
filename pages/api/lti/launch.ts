import type { NextApiRequest, NextApiResponse } from 'next';
import { getLaunchDetails } from '../../../lib/lti';
import {
  consumeOidcLoginState,
  setLtiLaunchSessionCookie,
} from '../../../lib/lti-session';
import { jwtVerify, createRemoteJWKSet } from 'jose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).send('Method not allowed');
    return;
  }

  const idToken = typeof req.body.id_token === 'string' ? req.body.id_token : '';
  const state = typeof req.body.state === 'string' ? req.body.state : '';

  if (!idToken) {
    res.status(400).send('Missing id_token');
    return;
  }

  try {
    const loginState = consumeOidcLoginState(req, res, state);
    if (!loginState) {
      res.status(403).send('Invalid OIDC state');
      return;
    }

    const issuer = process.env.LTI_PLATFORM_ISSUER ?? 'http://localhost';
    const clientId = process.env.LTI_CLIENT_ID;
    const jwksUrl = process.env.LTI_PLATFORM_JWKS_URL;
    if (!clientId || !jwksUrl) {
      res.status(500).send('Missing LTI_CLIENT_ID or LTI_PLATFORM_JWKS_URL');
      return;
    }

    const keySet = createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jwtVerify(idToken, keySet, {
      algorithms: ['RS256'],
      audience: clientId,
      issuer,
      requiredClaims: ['iss', 'sub', 'aud', 'exp', 'iat', 'nonce'],
    });
    if (payload.nonce !== loginState.nonce) {
      res.status(403).send('Invalid OIDC nonce');
      return;
    }

    const launchDetails = getLaunchDetails(payload);
    setLtiLaunchSessionCookie(res, launchDetails);
    const query = new URLSearchParams({
      courseId: launchDetails.courseId,
      institutionId: launchDetails.institutionId,
      instanceId: launchDetails.instanceId,
    });

    res.redirect(303, `/StudyBuddy/study-buddy?${query}`);
  } catch (error) {
    res.status(403).send(error instanceof Error ? error.message : 'Launch validation failed');
  }
}
