/**
 * Mock password hashing placeholder.
 * Never store plain-text passwords in state or localStorage.
 * Production authentication will use Supabase Auth (bcrypt/argon2 handled server-side).
 */

const MOCK_SALT = 'edura_multi_mock_salt_v1';

export function hashPassword(plainTextPassword: string): string {
  const input = `${MOCK_SALT}:${plainTextPassword}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + (i << 1);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `mock_hash$${part1}${part2}`;
}

export function verifyPassword(plainTextPassword: string, storedHash: string): boolean {
  if (!plainTextPassword || !storedHash) return false;
  return hashPassword(plainTextPassword) === storedHash;
}
