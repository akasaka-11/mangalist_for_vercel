// Local (browser-only) accounts.
//
// IMPORTANT: there is no server yet, so this is NOT real security. Accounts live
// in this browser's localStorage: anyone with access to the device/DevTools can
// read or edit them, and accounts do not exist on other devices. What it does
// guarantee: you can only sign in with an account that was registered here and
// with the correct password, and the password itself is never stored — only a
// salted PBKDF2 hash. Replace with a real auth backend (e.g. Supabase Auth)
// before storing anything that matters.

import { User } from '../types';
import { readJson, removeKey, writeJson } from './storage';

const USERS_KEY = 'mml.users';
const SESSION_KEY = 'mml.session';
const LEGACY_USER_KEY = 'user';

const PBKDF2_ITERATIONS = 210_000;

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

interface StoredUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // hex
  salt: string; // hex
  iterations: number;
  createdAt: string;
}

interface Session {
  userId: string;
}

export type AuthErrorCode =
  | 'usernameRequired'
  | 'usernameLength'
  | 'usernameChars'
  | 'emailRequired'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'passwordLength'
  | 'passwordWeak'
  | 'passwordMismatch'
  | 'identifierRequired'
  | 'usernameTaken'
  | 'emailTaken'
  | 'invalidCredentials'
  | 'cryptoUnavailable';

export type FieldErrors = Partial<Record<'username' | 'email' | 'password' | 'confirm' | 'identifier', AuthErrorCode>>;

export class AuthError extends Error {
  constructor(public code: AuthErrorCode, public field?: keyof FieldErrors) {
    super(code);
  }
}

// ---------- validation (pure) ----------

const USERNAME_RE = /^[A-Za-z0-9_.-]+$/;
// Pragmatic email check: something@something.tld, no spaces.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateUsername(value: string): AuthErrorCode | undefined {
  const v = value.trim();
  if (!v) return 'usernameRequired';
  if (v.length < USERNAME_MIN || v.length > USERNAME_MAX) return 'usernameLength';
  if (!USERNAME_RE.test(v)) return 'usernameChars';
  return undefined;
}

export function validateEmail(value: string): AuthErrorCode | undefined {
  const v = value.trim();
  if (!v) return 'emailRequired';
  if (!EMAIL_RE.test(v) || v.length > 254) return 'emailInvalid';
  return undefined;
}

export function validatePassword(value: string): AuthErrorCode | undefined {
  if (!value) return 'passwordRequired';
  if (value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) return 'passwordLength';
  if (!/[A-Za-zА-Яа-яЁё]/.test(value) || !/\d/.test(value)) return 'passwordWeak';
  return undefined;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  confirm: string;
}

export function validateRegistration(input: RegisterInput): FieldErrors {
  const errors: FieldErrors = {};
  const u = validateUsername(input.username);
  if (u) errors.username = u;
  const e = validateEmail(input.email);
  if (e) errors.email = e;
  const p = validatePassword(input.password);
  if (p) errors.password = p;
  else if (input.password !== input.confirm) errors.confirm = 'passwordMismatch';
  return errors;
}

export interface LoginInput {
  identifier: string; // username or email
  password: string;
}

export function validateLogin(input: LoginInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.identifier.trim()) errors.identifier = 'identifierRequired';
  if (!input.password) errors.password = 'passwordRequired';
  return errors;
}

// ---------- crypto ----------

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function getSubtle(): SubtleCrypto {
  // crypto.subtle exists only in secure contexts (https or localhost).
  if (!globalThis.crypto?.subtle) throw new AuthError('cryptoUnavailable');
  return globalThis.crypto.subtle;
}

async function hashPassword(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const subtle = getSubtle();
  const key = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- storage ----------

function loadUsers(): StoredUser[] {
  const users = readJson<unknown>(USERS_KEY, []);
  return Array.isArray(users) ? (users as StoredUser[]) : [];
}

function toPublicUser(u: StoredUser): User {
  return { id: u.id, username: u.username, email: u.email };
}

function startSession(userId: string): void {
  writeJson(SESSION_KEY, { userId } satisfies Session);
}

/** Returns the signed-in user, or null if the session is missing or points to a deleted account. */
export function getCurrentUser(): User | null {
  // The old app stored a fake user object under "user" — never trust it.
  removeKey(LEGACY_USER_KEY);
  const session = readJson<Session | null>(SESSION_KEY, null);
  if (!session?.userId) return null;
  const user = loadUsers().find((u) => u.id === session.userId);
  if (!user) {
    removeKey(SESSION_KEY);
    return null;
  }
  return toPublicUser(user);
}

export async function register(input: RegisterInput): Promise<User> {
  const errors = validateRegistration(input);
  const firstField = Object.keys(errors)[0] as keyof FieldErrors | undefined;
  if (firstField) throw new AuthError(errors[firstField]!, firstField);

  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  const users = loadUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new AuthError('usernameTaken', 'username');
  }
  if (users.some((u) => u.email === email)) {
    throw new AuthError('emailTaken', 'email');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await hashPassword(input.password, salt, PBKDF2_ITERATIONS);
  const stored: StoredUser = {
    id: crypto.randomUUID(),
    username,
    email,
    passwordHash,
    salt: toHex(salt),
    iterations: PBKDF2_ITERATIONS,
    createdAt: new Date().toISOString(),
  };
  writeJson(USERS_KEY, [...users, stored]);
  startSession(stored.id);
  return toPublicUser(stored);
}

export async function login(input: LoginInput): Promise<User> {
  const errors = validateLogin(input);
  const firstField = Object.keys(errors)[0] as keyof FieldErrors | undefined;
  if (firstField) throw new AuthError(errors[firstField]!, firstField);

  const id = input.identifier.trim().toLowerCase();
  const user = loadUsers().find((u) => u.username.toLowerCase() === id || u.email === id);
  // Hash even when the user is unknown so both cases take similar time, and
  // return the same generic error so we don't reveal which accounts exist.
  const salt = user ? fromHex(user.salt) : new Uint8Array(16);
  const hash = await hashPassword(input.password, salt, user?.iterations ?? PBKDF2_ITERATIONS);
  if (!user || !safeEqual(hash, user.passwordHash)) {
    throw new AuthError('invalidCredentials');
  }
  startSession(user.id);
  return toPublicUser(user);
}

export function logout(): void {
  removeKey(SESSION_KEY);
}
