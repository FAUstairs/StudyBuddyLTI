import type { NextApiRequest, NextApiResponse } from 'next';
import type { StudyBuddy } from '../../../../lib/study-buddy';
import { saveUser } from '../../../../lib/study-buddy-store';
import {
  checkIfPostOrSetError,
  getApiErrorResponse,
  getLtiStudyBuddyScope,
} from '../../../../lib/study-buddy-api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const context = getLtiStudyBuddyScope(req, res);
  if (!context) return;

  try {
    saveUser(context.scope, {
      ...(req.body as StudyBuddy),
      userId: context.scope.userId,
      userName: context.session.user.name,
      courseId: context.scope.courseId,
    });

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).send(getApiErrorResponse(error));
  }
}
