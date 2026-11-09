import type { NextApiRequest, NextApiResponse } from 'next';
import { getLtiStudyBuddyScope } from '../../../../lib/study-buddy-api';
import { getLatestStudyBuddyChange } from '../../../../lib/study-buddy-store';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Only GET requests allowed');
    return;
  }

  const context = getLtiStudyBuddyScope(req, res);
  if (!context) return;

  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('X-Accel-Buffering', 'no');
  res.socket?.setTimeout(0);
  res.flushHeaders?.();
  res.write(': connected\n\n');

  let closed = false;
  let lastChangeId = await getLatestStudyBuddyChange(context.scope);
  const checkForChanges = async () => {
    if (closed) return;
    try {
      const currentChangeId = await getLatestStudyBuddyChange(context.scope);
      if (currentChangeId > lastChangeId) {
        lastChangeId = currentChangeId;
        res.write('event: study-buddy-change\ndata: update\n\n');
      }
    } catch (error) {
      console.error(error);
    }
  };
  const changeCheck = setInterval(checkForChanges, 1000);
  const keepAlive = setInterval(() => {
    if (!closed) res.write(': keep-alive\n\n');
  }, 15000);

  req.on('close', () => {
    closed = true;
    clearInterval(changeCheck);
    clearInterval(keepAlive);
  });
}
