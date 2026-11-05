
import React, { useEffect, useState } from 'react';
import { X, Lock, Mail, User as UserIcon, ShieldCheck, ArrowRight, Eye, EyeOff, Loader2, AlertCircle, Info } from 'lucide-react';
import { User } from '../types';
import {
  AuthError,
  AuthErrorCode,
  FieldErrors,
  login,
  PASSWORD_MAX,
  PASSWORD_MIN,
  register,
  USERNAME_MAX,
  USERNAME_MIN,
  validateLogin,
  validateRegistration,
} from '../lib/auth';

interface AuthProps {
  onClose: () => void;
  onLogin: (user: User, isNewAccount: boolean) => void;
  language: 'en' | 'ru';
}

const errorText: Record<'en' | 'ru', Record<AuthErrorCode, string>> = {
  en: {
    usernameRequired: 'Enter a username',
    usernameLength: `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters`,
    usernameChars: 'Use only Latin letters, digits, and . _ -',
    emailRequired: 'Enter your email',
    emailInvalid: 'Enter a valid email, e.g. name@example.com',
    passwordRequired: 'Enter a password',
    passwordLength: `Password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters`,
    passwordWeak: 'Password must contain at least one letter and one digit',
    passwordMismatch: 'Passwords do not match',
    identifierRequired: 'Enter your username or email',
    usernameTaken: 'This username is already taken',
    emailTaken: 'An account with this email already exists',
    invalidCredentials: 'Wrong username/email or password',
    cryptoUnavailable: 'Your browser blocks secure crypto here. Open the site over https.',
  },
  ru: {
    usernameRequired: 'Введите имя пользователя',
    usernameLength: `Имя должно быть от ${USERNAME_MIN} до ${USERNAME_MAX} символов`,
    usernameChars: 'Только латинские буквы, цифры и . _ -',
    emailRequired: 'Введите email',
    emailInvalid: 'Введите корректный email, например name@example.com',
    passwordRequired: 'Введите пароль',
    passwordLength: `Пароль должен быть от ${PASSWORD_MIN} до ${PASSWORD_MAX} символов`,
    passwordWeak: 'Пароль должен содержать хотя бы одну букву и одну цифру',
    passwordMismatch: 'Пароли не совпадают',
    identifierRequired: 'Введите имя пользователя или email',
    usernameTaken: 'Это имя пользователя уже занято',
    emailTaken: 'Аккаунт с таким email уже существует',
    invalidCredentials: 'Неверный логин/email или пароль',
    cryptoUnavailable: 'Браузер блокирует шифрование на этой странице. Откройте сайт по https.',
  },
};

const emptyForm = { identifier: '', username: '', email: '', password: '', confirm: '' };

const Auth: React.FC<AuthProps> = ({ onClose, onLogin, language }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<AuthErrorCode | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const errors = errorText[language];
  const labels = language === 'en' ? {
    title: isLogin ? 'Sign In' : 'Create Account',
    sub: isLogin ? 'Welcome back to your collection' : 'Start your manga journey today',
    identifier: 'Username or Email',
    user: 'Username',
    mail: 'Email Address',
    pass: 'Password',
    confirm: 'Repeat Password',
    passHint: `At least ${PASSWORD_MIN} characters, a letter and a digit`,
    btn: isLogin ? 'Sign In' : 'Create Account',
    switch: isLogin ? "Don't have an account?" : 'Already a member?',
    switchBtn: isLogin ? 'Register' : 'Sign In',
    show: 'Show password',
    hide: 'Hide password',
    close: 'Close',
    localNote: 'Accounts are stored only in this browser for now. Use a password you don\'t use anywhere else.',
  } : {
    title: isLogin ? 'Вход' : 'Регистрация',
    sub: isLogin ? 'С возвращением в библиотеку' : 'Начните вести свой список манги',
    identifier: 'Имя пользователя или email',
    user: 'Имя пользователя',
    mail: 'Email',
    pass: 'Пароль',
    confirm: 'Повторите пароль',
    passHint: `Минимум ${PASSWORD_MIN} символов, буква и цифра`,
    btn: isLogin ? 'Войти' : 'Создать аккаунт',
    switch: isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?',
    switchBtn: isLogin ? 'Регистрация' : 'Войти',
    show: 'Показать пароль',
    hide: 'Скрыть пароль',
    close: 'Закрыть',
    localNote: 'Пока аккаунты хранятся только в этом браузере. Не используйте пароль от других сайтов.',
  };

  const update = (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFieldErrors((errs) => ({ ...errs, [field]: undefined }));
    setFormError(null);
  };

  const switchMode = () => {
    setIsLogin((v) => !v);
    setForm((f) => ({ ...emptyForm, identifier: f.identifier || f.username }));
    setFieldErrors({});
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validation = isLogin
      ? validateLogin({ identifier: form.identifier, password: form.password })
      : validateRegistration(form);
    setFieldErrors(validation);
    setFormError(null);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      const user = isLogin
        ? await login({ identifier: form.identifier, password: form.password })
        : await register(form);
      onLogin(user, !isLogin);
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.field) setFieldErrors({ [err.field]: err.code });
        else setFormError(err.code);
      } else {
        console.error(err);
        setFormError('cryptoUnavailable');
      }
      setForm((f) => ({ ...f, password: '', confirm: '' }));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full bg-slate-950 border rounded-2xl py-4 pl-12 pr-6 outline-none focus:ring-2 text-white transition-all ${
      hasError ? 'border-rose-500/60 focus:ring-rose-500/40' : 'border-slate-800 focus:ring-indigo-500/50'
    }`;

  const renderField = (
    field: keyof typeof emptyForm,
    label: string,
    icon: React.ReactNode,
    type: string,
    autoComplete: string,
    hint?: string,
  ) => {
    const error = fieldErrors[field];
    const isPassword = type === 'password';
    const id = `auth-${field}`;
    return (
      <div className="space-y-2">
        <label htmlFor={id} className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
        <div className="relative">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>
          <input
            id={id}
            type={isPassword && showPassword ? 'text' : type}
            autoComplete={autoComplete}
            className={`${inputClass(!!error)} ${isPassword ? 'pr-14' : ''}`}
            value={form[field]}
            onChange={update(field)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            maxLength={isPassword ? PASSWORD_MAX : 254}
          />
          {isPassword && field === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white"
              aria-label={showPassword ? labels.hide : labels.show}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error ? (
          <p id={`${id}-error`} className="text-xs font-semibold text-rose-400 ml-4">{errors[error]}</p>
        ) : hint ? (
          <p id={`${id}-hint`} className="text-xs text-slate-500 ml-4">{hint}</p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[95vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-[0_0_100px_rgba(99,102,241,0.2)]">
        <button onClick={onClose} aria-label={labels.close} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="text-center mb-8 space-y-2">
          <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto mb-4 border border-indigo-500/20">
            <ShieldCheck size={32} />
          </div>
          <h2 id="auth-title" className="text-3xl font-black text-white uppercase tracking-tight">{labels.title}</h2>
          <p className="text-slate-500 text-sm font-medium">{labels.sub}</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {isLogin ? (
            renderField('identifier', labels.identifier, <UserIcon size={18} />, 'text', 'username')
          ) : (
            <>
              {renderField('username', labels.user, <UserIcon size={18} />, 'text', 'username')}
              {renderField('email', labels.mail, <Mail size={18} />, 'email', 'email')}
            </>
          )}
          {renderField('password', labels.pass, <Lock size={18} />, 'password', isLogin ? 'current-password' : 'new-password', isLogin ? undefined : labels.passHint)}
          {!isLogin && renderField('confirm', labels.confirm, <Lock size={18} />, 'password', 'new-password')}

          {formError && (
            <div role="alert" className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-semibold">
              <AlertCircle size={18} className="shrink-0" /> {errors[formError]}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-wait text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 mt-4 active:scale-95 group"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <>{labels.btn} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
          </button>
        </form>

        <p className="mt-6 flex gap-2 text-[11px] leading-relaxed text-slate-500">
          <Info size={14} className="shrink-0 mt-0.5" /> {labels.localNote}
        </p>

        <div className="mt-6 text-center pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-500 font-bold">
            {labels.switch}
            <button type="button" onClick={switchMode} className="ml-2 text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest text-[10px] font-black">
              {labels.switchBtn}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
