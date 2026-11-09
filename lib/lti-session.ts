import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { LaunchDetails } from './lti';

const cookieName = 'alea_lti_launch';
const maxAgeSeconds = 60 * 60 * 4;
const oidcStateCookieName = 'alea_lti_oidc_state';

export type LtiLaunchSession = LaunchDetails & {
  userId: string;
  expiresAt: number;
};

export function createLtiUserId(details: LaunchDetails) {
  return details.user.email !== 'Not provided' ? details.user.email : details.user.id;
}

export function setLtiLaunchSessionCookie(res: NextApiResponse, details: LaunchDetails) {
  const session: LtiLaunchSession = {
    ...details,
    userId: createLtiUserId(details),
    expiresAt: Date.now() + maxAgeSeconds * 1000,
  };
  const value = signSession(session);

  const isHttps = process.env.LTI_REDIRECT_URI?.startsWith('https://') ?? false;
  const sameSite = isHttps ? 'None' : 'Lax';
  const secure = isHttps ? '; Secure' : '';
  appendSetCookie(
    res,
    `${cookieName}=${value}; Path=/; HttpOnly; SameSite=${sameSite}${secure}; Max-Age=${maxAgeSeconds}`,
  );
}

export function setOidcLoginState(res: NextApiResponse, state: string, nonce: string) {
  const payload = Buffer.from(JSON.stringify({ state, nonce })).toString('base64url');
  const value = `${payload}.${signPayload(payload)}`;
  appendSetCookie(
    res,
    `${oidcStateCookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
  );
}

export function consumeOidcLoginState(
  req: NextApiRequest,
  res: NextApiResponse,
  state: string,
) {
  const signedValue = parseCookies(req.headers.cookie ?? '')[oidcStateCookieName];
  if (!signedValue) return undefined;
  appendSetCookie(
    res,
    `${oidcStateCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );

  const [payload, signature] = signedValue.split('.');
  if (!payload || !signature || !timingSafeEqual(signature, signPayload(payload))) {
    return undefined;
  }
  const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    state: string;
    nonce: string;
  };
  return value.state === state ? value : undefined;
}

export function getLtiLaunchSession(req: NextApiRequest) {
  const signedValue = parseCookies(req.headers.cookie ?? '')[cookieName];
  if (!signedValue) return undefined;

  const [payload, signature] = signedValue.split('.');
  if (!payload || !signature) return undefined;

  const expectedSignature = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return undefined;
  }

  const session = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8')
  ) as LtiLaunchSession;

  if (session.expiresAt < Date.now()) return undefined;
  return session;
}

function signSession(session: LtiLaunchSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${signPayload(payload)}`;
}

function signPayload(payload: string) {
  return crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

function timingSafeEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function appendSetCookie(res: NextApiResponse, cookie: string) {
  const current = res.getHeader('Set-Cookie');
  const cookies = Array.isArray(current)
    ? current.map(String)
    : current
      ? [String(current)]
      : [];
  res.setHeader('Set-Cookie', [...cookies, cookie]);
}

function getSessionSecret() {
  const secret = process.env.FLASK_SECRET_KEY;
  if (!secret) {
    throw new Error('Environment variable FLASK_SECRET_KEY is not set.');
  }
  return secret;
}

function parseCookies(cookieHeader: string) {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separatorIndex = cookie.indexOf('=');
        if (separatorIndex === -1) return [cookie, ''];
        return [
          cookie.slice(0, separatorIndex),
          decodeURIComponent(cookie.slice(separatorIndex + 1)),
        ];
      })
  );
}
