import type { NextApiRequest, NextApiResponse } from 'next';
import { removeConnection } from '../../../../lib/study-buddy-store';
import { recordStudyBuddyChange } from '../../../../lib/study-buddy-store';
import {
  checkIfPostOrSetError,
  getApiErrorResponse,
  getLtiStudyBuddyScope,
} from '../../../../lib/study-buddy-api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const context = getLtiStudyBuddyScope(req, res);
  if (!context) return;

  const receiverId = req.body?.receiverId;
  if (!receiverId) {
    res.status(400).json({ message: 'receiverId not found' });
    return;
  }

  try {
    await removeConnection(context.scope, String(receiverId));
    await recordStudyBuddyChange(context.scope);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).send(getApiErrorResponse(error));
  }
}
