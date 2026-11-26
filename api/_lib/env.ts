export interface EnvConfig {
  privateBeta: boolean;
  allowedOrigins: string[];
  appCheckEnforce: boolean;
  useMemoryStore: boolean;
}

const DEFAULT_ORIGINS = [
  'https://vowlet.app',
  'https://www.vowlet.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

/**
 * Reads environment configuration dynamically so tests and serverless cold starts
 * always observe current process.env values.
 */
export function getEnvConfig(): EnvConfig {
  const privateBeta = process.env.PRIVATE_BETA === 'true';

  const rawOrigins = process.env.ALLOWED_ORIGINS;
  const configuredOrigins = rawOrigins
    ? rawOrigins
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o.length > 0)
    : [];

  const allowedOrigins = Array.from(new Set([...DEFAULT_ORIGINS, ...configuredOrigins]));

  const useMemoryStore =
    process.env.VOWLET_LOCAL_MEMORY === '1' ||
    (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.FIRESTORE_EMULATOR_HOST);

  let appCheckEnforce = false;
  if (process.env.APP_CHECK_ENFORCE === 'true') {
    appCheckEnforce = true;
  } else if (process.env.APP_CHECK_ENFORCE === 'false') {
    appCheckEnforce = false;
  } else {
    appCheckEnforce =
      process.env.NODE_ENV === 'production' &&
      !process.env.FIRESTORE_EMULATOR_HOST &&
      process.env.VOWLET_LOCAL_MEMORY !== '1';
  }

  return {
    privateBeta,
    allowedOrigins,
    appCheckEnforce,
    useMemoryStore,
  };
}
