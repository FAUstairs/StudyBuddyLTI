import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const publicKey = readPublicKey();
    const jwk = crypto.createPublicKey(publicKey).export({ format: 'jwk' });
    res.status(200).json({
      keys: [
        {
          ...jwk,
          kid: process.env.LTI_TOOL_KEY_ID ?? 'main',
          alg: 'RS256',
          use: 'sig',
        },
      ],
    });
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : 'Invalid public key configuration');
  }
}

function readPublicKey() {
  const configuredPath = process.env.LTI_TOOL_PUBLIC_KEY_PATH;
  if (configuredPath) {
    return fs.readFileSync(path.resolve(process.cwd(), configuredPath), 'utf8');
  }

  const keysDirs = [
    path.join(process.cwd(), 'packages/lti-application/keys'),
    path.join(process.cwd(), 'keys'),
  ];
  const candidates = ['lti-public.pem', 'public.pem', 'public.key'];

  for (const keysDir of keysDirs) {
    for (const fileName of candidates) {
      const keyPath = path.join(keysDir, fileName);

      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, 'utf8');
      }
    }
  }

  throw new Error('Missing public key in keys/');
}
