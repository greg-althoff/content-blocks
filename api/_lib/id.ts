import { randomBytes } from 'crypto';
import { SHARE_ID_LENGTH, SHARE_ID_PATTERN } from '../../shared/limits';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export { SHARE_ID_PATTERN };

export function generateShareId(length = SHARE_ID_LENGTH): string {
  const bytes = randomBytes(length);
  let id = '';
  for (let i = 0; i < length; i += 1) {
    id += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return id;
}

export function isValidShareId(id: string): boolean {
  return SHARE_ID_PATTERN.test(id);
}
