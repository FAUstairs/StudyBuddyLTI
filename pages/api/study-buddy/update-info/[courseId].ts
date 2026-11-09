import type { NextApiRequest, NextApiResponse } from 'next';
import type { StudyBuddy } from '../../../../lib/study-buddy';
import { saveUser } from '../../../../lib/study-buddy-store';
import { recordStudyBuddyChange } from '../../../../lib/study-buddy-store';
import { getStudyPrograms } from '../../../../lib/study-programs';
import {
  checkIfPostOrSetError,
  getApiErrorResponse,
  getLtiStudyBuddyScope,
} from '../../../../lib/study-buddy-api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const context = getLtiStudyBuddyScope(req, res);
  if (!context) return;

  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!/^[^\s@]+@fau\.de$/i.test(email)) {
    res.status(400).json({ message: 'A valid FAU email address ending in @fau.de is required.' });
    return;
  }

  try {
    const studyPrograms = await getStudyPrograms();
    if (!studyPrograms.includes(req.body?.studyProgram)) {
      res.status(400).json({ message: 'Please select a valid study program.' });
      return;
    }

    await saveUser(context.scope, {
      ...(req.body as StudyBuddy),
      email,
      userId: context.scope.userId,
      userName: context.session.user.name,
      courseId: context.scope.courseId,
    });

    await recordStudyBuddyChange(context.scope);
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).send(getApiErrorResponse(error));
  }
}
