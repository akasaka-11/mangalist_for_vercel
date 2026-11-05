// Authentication via Supabase Auth (email + password).
// Validation helpers are pure; the rest talks to Supabase and maps its errors
// to our own codes so the UI can show translated messages.

import type { AuthError as SupabaseAuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '../types';
import { removeKey } from './storage';
import { supabase } from './supabase';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt (used by Supabase) ignores bytes beyond 72

// Keys used by the previous browser-only implementation; cleaned up on start.
const LEGACY_KEYS = ['user', 'mml.users', 'mml.session'];

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
  | 'emailTaken'
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'rateLimited'
  | 'samePassword'
  | 'network'
  | 'notConfigured'
  | 'unknown';

export type FormField = 'username' | 'email' | 'password' | 'confirm';
export type FieldErrors = Partial<Record<FormField, AuthErrorCode>>;

export class AuthError extends Error {
  constructor(public code: AuthErrorCode, public field?: FormField) {
    super(code);
  }
}

// ---------- validation (pure) ----------

const USERNAME_RE = /^[A-Za-z0-9_.-]+$/;
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
  if (value.length < PASSWORD_MIN || new TextEncoder().encode(value).length > PASSWORD_MAX) return 'passwordLength';
  if (!/[A-Za-zА-Яа-яЁё]/.test(value) || !/\d/.test(value)) return 'passwordWeak';
  return undefined;
}

function validateNewPassword(password: string, confirm: string): FieldErrors {
  const p = validatePassword(password);
  if (p) return { password: p };
  if (password !== confirm) return { confirm: 'passwordMismatch' };
  return {};
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
  return { ...errors, ...validateNewPassword(input.password, input.confirm) };
}

export interface LoginInput {
  email: string;
  password: string;
}

export function validateLogin(input: LoginInput): FieldErrors {
  const errors: FieldErrors = {};
  const e = validateEmail(input.email);
  if (e) errors.email = e;
  if (!input.password) errors.password = 'passwordRequired';
  return errors;
}

export function validateResetRequest(email: string): FieldErrors {
  const e = validateEmail(email);
  return e ? { email: e } : {};
}

export function validatePasswordUpdate(password: string, confirm: string): FieldErrors {
  return validateNewPassword(password, confirm);
}

function throwFirst(errors: FieldErrors): void {
  const field = Object.keys(errors)[0] as FormField | undefined;
  if (field) throw new AuthError(errors[field]!, field);
}

// ---------- Supabase ----------

function client() {
  if (!supabase) throw new AuthError('notConfigured');
  return supabase;
}

export const isAuthConfigured = () => supabase !== null;

function mapError(error: SupabaseAuthError): AuthError {
  switch (error.code) {
    case 'invalid_credentials':
      return new AuthError('invalidCredentials');
    case 'email_not_confirmed':
      return new AuthError('emailNotConfirmed');
    case 'user_already_exists':
    case 'email_exists':
      return new AuthError('emailTaken', 'email');
    case 'weak_password':
      return new AuthError('passwordWeak', 'password');
    case 'same_password':
      return new AuthError('samePassword', 'password');
    case 'email_address_invalid':
      return new AuthError('emailInvalid', 'email');
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return new AuthError('rateLimited');
  }
  if (error.status === 429) return new AuthError('rateLimited');
  if (!error.status || error.name === 'AuthRetryableFetchError') return new AuthError('network');
  console.error('Unhandled Supabase auth error', error);
  return new AuthError('unknown');
}

export function toAppUser(user: SupabaseUser): User {
  const meta = user.user_metadata as { username?: unknown } | undefined;
  const email = user.email ?? '';
  return {
    id: user.id,
    email,
    username: typeof meta?.username === 'string' && meta.username ? meta.username : email.split('@')[0],
  };
}

/** Subscribes to sign-in/sign-out. The callback fires once right away with the restored session (or null). */
export function onAuthChange(
  callback: (user: User | null, event: 'INITIAL' | 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | 'OTHER') => void,
): () => void {
  LEGACY_KEYS.forEach(removeKey);
  if (!supabase) {
    callback(null, 'INITIAL');
    return () => {};
  }
  const { data } = supabase.auth.onAuthStateChange((event, session: Session | null) => {
    const user = session?.user ? toAppUser(session.user) : null;
    const mapped =
      event === 'INITIAL_SESSION' ? 'INITIAL'
      : event === 'SIGNED_IN' ? 'SIGNED_IN'
      : event === 'SIGNED_OUT' ? 'SIGNED_OUT'
      : event === 'PASSWORD_RECOVERY' ? 'PASSWORD_RECOVERY'
      : 'OTHER';
    // Supabase recommends not awaiting other Supabase calls inside this
    // callback; defer so React state updates happen outside it.
    setTimeout(() => callback(user, mapped), 0);
  });
  return () => data.subscription.unsubscribe();
}

export type RegisterResult = { user: User; needsEmailConfirmation: false } | { user: null; needsEmailConfirmation: true };

export async function register(input: RegisterInput): Promise<RegisterResult> {
  throwFirst(validateRegistration(input));
  const { data, error } = await client().auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: { username: input.username.trim() },
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw mapError(error);
  // With "Confirm email" enabled Supabase returns no session until the link in
  // the email is clicked (and, to avoid leaking which emails exist, it answers
  // the same way for an already registered email).
  if (!data.session || !data.user) return { user: null, needsEmailConfirmation: true };
  return { user: toAppUser(data.user), needsEmailConfirmation: false };
}

export async function login(input: LoginInput): Promise<User> {
  throwFirst(validateLogin(input));
  const { data, error } = await client().auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  });
  if (error) throw mapError(error);
  return toAppUser(data.user);
}

export async function requestPasswordReset(email: string): Promise<void> {
  throwFirst(validateResetRequest(email));
  const { error } = await client().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
  if (error) throw mapError(error);
}

export async function updatePassword(password: string, confirm: string): Promise<void> {
  throwFirst(validatePasswordUpdate(password, confirm));
  const { error } = await client().auth.updateUser({ password });
  if (error) throw mapError(error);
}

export async function resendConfirmation(email: string): Promise<void> {
  throwFirst(validateResetRequest(email));
  const { error } = await client().auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw mapError(error);
}

export async function logout(): Promise<void> {
  if (!supabase) return;
  // 'local' signs out this browser even if the network request fails.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) console.error('Sign-out error', error);
}
