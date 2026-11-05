
import React, { useEffect, useState } from 'react';
import { X, Lock, Mail, User as UserIcon, ShieldCheck, ArrowRight, Eye, EyeOff, Loader2, AlertCircle, MailCheck } from 'lucide-react';
import { User } from '../types';
import {
  AuthError,
  AuthErrorCode,
  FieldErrors,
  FormField,
  login,
  PASSWORD_MAX,
  PASSWORD_MIN,
  register,
  requestPasswordReset,
  resendConfirmation,
  updatePassword,
  USERNAME_MAX,
  USERNAME_MIN,
  validateLogin,
  validatePasswordUpdate,
  validateRegistration,
  validateResetRequest,
} from '../lib/auth';
import { Language } from '../lib/i18n';

export type AuthMode = 'login' | 'register' | 'forgot' | 'recovery';

interface AuthProps {
  initialMode?: AuthMode;
  onClose: () => void;
  onLogin: (user: User, isNewAccount: boolean) => void;
  onPasswordUpdated: () => void;
  language: Language;
}

const errorText: Record<Language, Record<AuthErrorCode, string>> = {
  en: {
    usernameRequired: 'Enter a username',
    usernameLength: `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters`,
    usernameChars: 'Use only Latin letters, digits, and . _ -',
    emailRequired: 'Enter your email',
    emailInvalid: 'Enter a valid email, e.g. name@example.com',
    passwordRequired: 'Enter a password',
    passwordLength: `Password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters`,
    passwordWeak: 'Password is too weak: use at least one letter and one digit',
    passwordMismatch: 'Passwords do not match',
    emailTaken: 'An account with this email already exists',
    invalidCredentials: 'Wrong email or password',
    emailNotConfirmed: 'Confirm your email first — check your inbox for the link',
    rateLimited: 'Too many attempts. Please wait a minute and try again',
    samePassword: 'The new password must be different from the old one',
    network: 'No connection to the server. Check your internet and try again',
    notConfigured: 'Sign-in is not configured on this site yet (Supabase keys are missing)',
    unknown: 'Something went wrong. Please try again',
  },
  ru: {
    usernameRequired: 'Введите имя пользователя',
    usernameLength: `Имя должно быть от ${USERNAME_MIN} до ${USERNAME_MAX} символов`,
    usernameChars: 'Только латинские буквы, цифры и . _ -',
    emailRequired: 'Введите email',
    emailInvalid: 'Введите корректный email, например name@example.com',
    passwordRequired: 'Введите пароль',
    passwordLength: `Пароль должен быть от ${PASSWORD_MIN} до ${PASSWORD_MAX} символов`,
    passwordWeak: 'Слишком простой пароль: нужна хотя бы одна буква и одна цифра',
    passwordMismatch: 'Пароли не совпадают',
    emailTaken: 'Аккаунт с таким email уже существует',
    invalidCredentials: 'Неверный email или пароль',
    emailNotConfirmed: 'Сначала подтвердите email — ссылка пришла вам на почту',
    rateLimited: 'Слишком много попыток. Подождите минуту и попробуйте снова',
    samePassword: 'Новый пароль должен отличаться от старого',
    network: 'Нет связи с сервером. Проверьте интернет и попробуйте снова',
    notConfigured: 'Вход на сайте ещё не настроен (нет ключей Supabase)',
    unknown: 'Что-то пошло не так. Попробуйте ещё раз',
  },
  kk: {
    usernameRequired: 'Пайдаланушы атын енгізіңіз',
    usernameLength: `Аты ${USERNAME_MIN}–${USERNAME_MAX} таңбадан тұруы керек`,
    usernameChars: 'Тек латын әріптері, сандар және . _ -',
    emailRequired: 'Email енгізіңіз',
    emailInvalid: 'Дұрыс email енгізіңіз, мысалы name@example.com',
    passwordRequired: 'Құпиясөзді енгізіңіз',
    passwordLength: `Құпиясөз ${PASSWORD_MIN}–${PASSWORD_MAX} таңбадан тұруы керек`,
    passwordWeak: 'Құпиясөз тым қарапайым: кемінде бір әріп және бір сан болуы керек',
    passwordMismatch: 'Құпиясөздер сәйкес келмейді',
    emailTaken: 'Бұл email-мен аккаунт бұрыннан бар',
    invalidCredentials: 'Email немесе құпиясөз қате',
    emailNotConfirmed: 'Алдымен email-ді растаңыз — сілтеме поштаңызға жіберілді',
    rateLimited: 'Әрекет тым көп. Бір минут күтіп, қайталап көріңіз',
    samePassword: 'Жаңа құпиясөз ескісінен өзгеше болуы керек',
    network: 'Сервермен байланыс жоқ. Интернетті тексеріп, қайталап көріңіз',
    notConfigured: 'Сайтта кіру әлі бапталмаған (Supabase кілттері жоқ)',
    unknown: 'Бірдеңе дұрыс болмады. Қайталап көріңіз',
  },
};

const emptyForm = { username: '', email: '', password: '', confirm: '' };

const Auth: React.FC<AuthProps> = ({ initialMode = 'login', onClose, onLogin, onPasswordUpdated, language }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<AuthErrorCode | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Shown instead of the form after sign-up / reset request.
  const [sentTo, setSentTo] = useState<{ email: string; kind: 'confirm' | 'reset' } | null>(null);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const errors = errorText[language];
  const allTitles: Record<Language, Record<AuthMode, [string, string]>> = { en: {
    login: ['Sign In', 'Welcome back to your collection'],
    register: ['Create Account', 'Start your manga journey today'],
    forgot: ['Reset Password', "We'll email you a link to set a new password"],
    recovery: ['New Password', 'Choose a new password for your account'],
  }, ru: {
    login: ['Вход', 'С возвращением в библиотеку'],
    register: ['Регистрация', 'Начните вести свой список манги'],
    forgot: ['Сброс пароля', 'Пришлём ссылку для нового пароля на почту'],
    recovery: ['Новый пароль', 'Придумайте новый пароль для аккаунта'],
  }, kk: {
    login: ['Кіру', 'Кітапханаңызға қайта оралуыңызбен'],
    register: ['Тіркелу', 'Манга тізіміңізді жүргізуді бастаңыз'],
    forgot: ['Құпиясөзді қалпына келтіру', 'Жаңа құпиясөз орнату үшін поштаңызға сілтеме жібереміз'],
    recovery: ['Жаңа құпиясөз', 'Аккаунтыңызға жаңа құпиясөз ойлап табыңыз'],
  } };
  const titles = allTitles[language];
  const buttons = ({
    en: { login: 'Sign In', register: 'Create Account', forgot: 'Send Link', recovery: 'Save Password' },
    ru: { login: 'Войти', register: 'Создать аккаунт', forgot: 'Отправить ссылку', recovery: 'Сохранить пароль' },
    kk: { login: 'Кіру', register: 'Аккаунт ашу', forgot: 'Сілтеме жіберу', recovery: 'Құпиясөзді сақтау' },
  } satisfies Record<Language, Record<AuthMode, string>>)[language];
  const labels = ({ en: {
    user: 'Username',
    mail: 'Email',
    pass: mode === 'recovery' ? 'New Password' : 'Password',
    confirm: 'Repeat Password',
    passHint: `At least ${PASSWORD_MIN} characters, a letter and a digit`,
    noAccount: "Don't have an account?",
    haveAccount: 'Already a member?',
    register: 'Register',
    signIn: 'Sign In',
    forgot: 'Forgot password?',
    backToLogin: 'Back to sign in',
    show: 'Show password',
    hide: 'Hide password',
    close: 'Close',
    checkMail: 'Check your email',
    confirmSent: 'We sent a confirmation link to {email}. Open it to activate your account, then sign in.',
    resetSent: 'If an account with {email} exists, we sent a link to reset the password.',
    resend: 'Resend email',
    resentOk: 'Sent again',
  }, ru: {
    user: 'Имя пользователя',
    mail: 'Email',
    pass: mode === 'recovery' ? 'Новый пароль' : 'Пароль',
    confirm: 'Повторите пароль',
    passHint: `Минимум ${PASSWORD_MIN} символов, буква и цифра`,
    noAccount: 'Нет аккаунта?',
    haveAccount: 'Уже есть аккаунт?',
    register: 'Регистрация',
    signIn: 'Войти',
    forgot: 'Забыли пароль?',
    backToLogin: 'Вернуться ко входу',
    show: 'Показать пароль',
    hide: 'Скрыть пароль',
    close: 'Закрыть',
    checkMail: 'Проверьте почту',
    confirmSent: 'Мы отправили ссылку для подтверждения на {email}. Перейдите по ней, чтобы активировать аккаунт, затем войдите.',
    resetSent: 'Если аккаунт с адресом {email} существует, мы отправили на него ссылку для сброса пароля.',
    resend: 'Отправить ещё раз',
    resentOk: 'Отправлено повторно',
  }, kk: {
    user: 'Пайдаланушы аты',
    mail: 'Email',
    pass: mode === 'recovery' ? 'Жаңа құпиясөз' : 'Құпиясөз',
    confirm: 'Құпиясөзді қайталаңыз',
    passHint: `Кемінде ${PASSWORD_MIN} таңба, әріп және сан`,
    noAccount: 'Аккаунтыңыз жоқ па?',
    haveAccount: 'Аккаунтыңыз бар ма?',
    register: 'Тіркелу',
    signIn: 'Кіру',
    forgot: 'Құпиясөзді ұмыттыңыз ба?',
    backToLogin: 'Кіруге оралу',
    show: 'Құпиясөзді көрсету',
    hide: 'Құпиясөзді жасыру',
    close: 'Жабу',
    checkMail: 'Поштаңызды тексеріңіз',
    confirmSent: 'Растау сілтемесін {email} адресіне жібердік. Аккаунтты іске қосу үшін сілтемені ашыңыз, содан кейін кіріңіз.',
    resetSent: 'Егер {email} адресімен аккаунт болса, оған құпиясөзді қалпына келтіру сілтемесін жібердік.',
    resend: 'Қайта жіберу',
    resentOk: 'Қайта жіберілді',
  } })[language];

  const update = (field: FormField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFieldErrors((errs) => ({ ...errs, [field]: undefined }));
    setFormError(null);
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setForm((f) => ({ ...emptyForm, email: f.email }));
    setFieldErrors({});
    setFormError(null);
    setSentTo(null);
  };

  const validate = (): FieldErrors => {
    switch (mode) {
      case 'login': return validateLogin(form);
      case 'register': return validateRegistration(form);
      case 'forgot': return validateResetRequest(form.email);
      case 'recovery': return validatePasswordUpdate(form.password, form.confirm);
    }
  };

  const handleError = (err: unknown) => {
    if (err instanceof AuthError) {
      if (err.field) setFieldErrors({ [err.field]: err.code });
      else setFormError(err.code);
    } else {
      console.error(err);
      setFormError('unknown');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validation = validate();
    setFieldErrors(validation);
    setFormError(null);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      if (mode === 'login') {
        onLogin(await login(form), false);
      } else if (mode === 'register') {
        const result = await register(form);
        if (result.needsEmailConfirmation) setSentTo({ email: form.email.trim(), kind: 'confirm' });
        else onLogin(result.user, true);
      } else if (mode === 'forgot') {
        await requestPasswordReset(form.email);
        setSentTo({ email: form.email.trim(), kind: 'reset' });
      } else {
        await updatePassword(form.password, form.confirm);
        onPasswordUpdated();
      }
    } catch (err) {
      handleError(err);
      setForm((f) => ({ ...f, password: '', confirm: '' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!sentTo || submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (sentTo.kind === 'confirm') await resendConfirmation(sentTo.email);
      else await requestPasswordReset(sentTo.email);
      setResent(true);
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full bg-slate-950 border rounded-2xl py-4 pl-12 pr-6 outline-none focus:ring-2 text-white transition-all ${
      hasError ? 'border-rose-500/60 focus:ring-rose-500/40' : 'border-slate-800 focus:ring-indigo-500/50'
    }`;

  const renderField = (field: FormField, label: string, icon: React.ReactNode, type: string, autoComplete: string, hint?: string) => {
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
          {field === 'password' && (
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

  const linkClass = 'text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest text-[10px] font-black';
  const isNewPassword = mode === 'register' || mode === 'recovery';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[95vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-[0_0_100px_rgba(99,102,241,0.2)]">
        <button onClick={onClose} aria-label={labels.close} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        {sentTo ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto border border-emerald-500/20">
              <MailCheck size={32} />
            </div>
            <h2 id="auth-title" className="text-2xl font-black text-white uppercase tracking-tight">{labels.checkMail}</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              {(sentTo.kind === 'confirm' ? labels.confirmSent : labels.resetSent).replace('{email}', sentTo.email)}
            </p>
            {formError && <p role="alert" className="text-sm font-semibold text-rose-400">{errors[formError]}</p>}
            <div className="flex flex-col items-center gap-3 pt-2">
              <button type="button" onClick={handleResend} disabled={submitting || resent} className={`${linkClass} disabled:opacity-50`}>
                {resent ? labels.resentOk : labels.resend}
              </button>
              <button type="button" onClick={() => switchMode('login')} className={linkClass}>{labels.backToLogin}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-8 space-y-2">
              <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto mb-4 border border-indigo-500/20">
                <ShieldCheck size={32} />
              </div>
              <h2 id="auth-title" className="text-3xl font-black text-white uppercase tracking-tight">{titles[mode][0]}</h2>
              <p className="text-slate-500 text-sm font-medium">{titles[mode][1]}</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {mode === 'register' && renderField('username', labels.user, <UserIcon size={18} />, 'text', 'nickname')}
              {mode !== 'recovery' && renderField('email', labels.mail, <Mail size={18} />, 'email', 'email')}
              {mode !== 'forgot' && renderField('password', labels.pass, <Lock size={18} />, 'password', isNewPassword ? 'new-password' : 'current-password', isNewPassword ? labels.passHint : undefined)}
              {isNewPassword && renderField('confirm', labels.confirm, <Lock size={18} />, 'password', 'new-password')}

              {mode === 'login' && (
                <div className="text-right">
                  <button type="button" onClick={() => switchMode('forgot')} className={linkClass}>{labels.forgot}</button>
                </div>
              )}

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
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <>{buttons[mode]} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
              </button>
            </form>

            {mode !== 'recovery' && (
              <div className="mt-8 text-center pt-6 border-t border-slate-800">
                <p className="text-xs text-slate-500 font-bold">
                  {mode === 'forgot' ? (
                    <button type="button" onClick={() => switchMode('login')} className={linkClass}>{labels.backToLogin}</button>
                  ) : (
                    <>
                      {mode === 'login' ? labels.noAccount : labels.haveAccount}
                      <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className={`ml-2 ${linkClass}`}>
                        {mode === 'login' ? labels.register : labels.signIn}
                      </button>
                    </>
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;
