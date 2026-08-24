import { config } from 'dotenv';

config({ path: '.env.local' });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getTursoCredentials() {
  return {
    url: required('TURSO_DATABASE_URL'),
    authToken: required('TURSO_AUTH_TOKEN'),
  };
}

export function getShareAdminSecret(): string {
  return required('SHARE_ADMIN_SECRET');
}

export function getShareIpHashSalt(): string {
  return required('SHARE_IP_HASH_SALT');
}

export function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) return [];
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

export function getShareRateLimitMax(): number {
  const raw = process.env.SHARE_RATE_LIMIT_MAX;
  if (!raw) return 20;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 20;
}

export function getSharePutRateLimitMax(): number {
  const raw = process.env.SHARE_PUT_RATE_LIMIT_MAX;
  if (!raw) return 120;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 120;
}
