import type { NextApiRequest, NextApiResponse } from 'next';
import { setUserActive } from '../../../../lib/study-buddy-store';
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

  const { active } = req.body;
  if (active === undefined) {
    res.status(400).send('Missing [active]');
    return;
  }

  try {
    const updated = await setUserActive(context.scope, Boolean(active));
    if (!updated) {
      res.status(404).send('Study Buddy profile not found');
      return;
    }

    await recordStudyBuddyChange(context.scope);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).send(getApiErrorResponse(error));
  }
}
