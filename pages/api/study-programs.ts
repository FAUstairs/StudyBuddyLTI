import type { NextApiRequest, NextApiResponse } from 'next';
import { getStudyPrograms } from '../../lib/study-programs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ message: 'Only GET requests allowed' });
    return;
  }

  try {
    res.status(200).json(await getStudyPrograms());
  } catch (error) {
    console.error(error);
    res.status(502).json({ message: 'Could not load study programs.' });
  }
}
