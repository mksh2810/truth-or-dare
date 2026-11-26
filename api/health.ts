import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface HealthResponse {
  ok: true;
  service: 'vowlet-api';
  privateBeta: boolean;
}

/** Builds the health-check payload without side effects for unit testing. */
export function getHealthPayload(): HealthResponse {
  return {
    ok: true,
    service: 'vowlet-api',
    privateBeta: process.env.PRIVATE_BETA === 'true',
  };
}

/** Vercel serverless handler for GET /api/health. */
export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'GET') {
    res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
      },
    });
    return;
  }

  res.status(200).json(getHealthPayload());
}
