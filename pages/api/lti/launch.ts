import type { NextApiRequest, NextApiResponse } from 'next';
import { getLaunchDetails } from '../../../lib/lti';
import { setLtiLaunchSessionCookie } from '../../../lib/lti-session';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).send('Method not allowed');
    return;
  }

  const idToken = typeof req.body.id_token === 'string' ? req.body.id_token : '';

  if (!idToken) {
    res.status(400).send('Missing id_token');
    return;
  }

  try {
    const payload = decodeJwtPayload(idToken);
    const launchDetails = getLaunchDetails(payload);
    setLtiLaunchSessionCookie(res, launchDetails);
    const query = new URLSearchParams({
      courseId: launchDetails.courseId,
      institutionId: launchDetails.institutionId,
      instanceId: launchDetails.instanceId,
    });

    res.redirect(303, `/study-buddy?${query}`);
  } catch (error) {
    res.status(400).send(error instanceof Error ? error.message : 'Invalid id_token');
  }
}

function decodeJwtPayload(idToken: string) {
  const parts = idToken.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid JWT');
  }

  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;
}
