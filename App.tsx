
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Menu,
  ChevronLeft,
  Eye,
  EyeOff,
  BookOpen,
  Search,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Layout,
  X,
  User as UserIcon,
  LogOut,
  Languages,
  Ghost,
  Loader2
} from 'lucide-react';
import { MangaStatus, MangaTitle, User } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SearchTitle from './components/SearchTitle';
import MangaModal from './components/MangaModal';
import Auth, { AuthMode } from './components/Auth';
import { logout, onAuthChange } from './lib/auth';
import { loadLibrary, saveLibrary } from './lib/library';
import { readJson, writeJson } from './lib/storage';
import { clampChapter, needsLatestChapterCheck } from './lib/chapters';
import { fetchLatestChapter } from './lib/latestChapter';

export type Language = 'en' | 'ru';

const PREFS_KEY = 'mml.prefs';
interface Prefs {
  language: Language;
  includeAdult: boolean;
  hideLabels: boolean;
}

const translations = {
  en: {
    library: 'My Library',
    discover: 'Discover',
    tracking: 'Tracking progress',
    findNew: 'Find new series',
    alertsOn: 'Alerts On',
    alertsOff: 'Alerts Off',
    nsfwOn: 'NSFW ON',
    sfwOnly: 'SFW ONLY',
    statusUpdated: 'Status updated to',
    moved: 'Moved',
    added: 'Added to library',
    removed: 'Removed from library',
    notifEnabled: 'Notifications enabled',
    notifDisabled: 'Notifications disabled',
    nsfwVisible: 'NSFW Content Visible',
    safeSearch: 'Safe Search Active',
    langChanged: 'Language changed to English',
    hideLabels: 'Hide Titles',
    showLabels: 'Show Titles',
    backToMenu: 'Menu',
    welcome: 'Welcome Back',
    explore: 'Explore the world of Manga',
    login: 'Login / Register',
    logout: 'Logout',
    welcomeUser: 'Welcome back, {name}!',
    accountCreated: 'Account created. Welcome, {name}!',
    loggedOut: 'You have been logged out',
    statusNames: { READING: 'Reading', PLAN_TO_READ: 'Plan to read', COMPLETED: 'Completed', DROPPED: 'Dropped' },
    signInForLibrary: 'Sign in to keep your own library',
    signInForLibrarySub: 'Each account has its own list of titles and progress.',
    spotlight: 'Spotlight',
    heroText: 'Track your reading history, find the latest hits, and manage your progress in style.',
    trending: 'Trending',
    trendingText: 'Popular titles from the AniList database.',
    smartProgress: 'Smart Progress',
    smartProgressText: 'One-tap chapter logging with intelligent limits.',
    privateLibrary: 'Personal Library',
    privateLibraryText: 'Sign in with your account. Your list is kept per account on this device.',
    passwordUpdated: 'Password updated',
    authLinkError: 'The link is invalid or has expired. Request a new one.'
  },
  ru: {
    library: 'Библиотека',
    discover: 'Поиск',
    tracking: 'Отслеживание',
    findNew: 'Новинки',
    alertsOn: 'Увед. ВКЛ',
    alertsOff: 'Увед. ВЫКЛ',
    nsfwOn: '18+ ВКЛ',
    sfwOnly: 'БЕЗОПАСНО',
    statusUpdated: 'Статус изменен на',
    moved: 'Перемещено',
    added: 'Добавлено',
    removed: 'Удалено',
    notifEnabled: 'Уведомления включены',
    notifDisabled: 'Уведомления отключены',
    nsfwVisible: 'Контент 18+ виден',
    safeSearch: 'Безопасный поиск',
    langChanged: 'Язык: Русский',
    hideLabels: 'Скрыть названия',
    showLabels: 'Показать названия',
    backToMenu: 'Меню',
    welcome: 'С возвращением',
    explore: 'Мир манги ждет',
    login: 'Войти / Регистрация',
    logout: 'Выйти',
    welcomeUser: 'С возвращением, {name}!',
    accountCreated: 'Аккаунт создан. Добро пожаловать, {name}!',
    loggedOut: 'Вы вышли из аккаунта',
    statusNames: { READING: 'Читаю', PLAN_TO_READ: 'В планах', COMPLETED: 'Прочитано', DROPPED: 'Брошено' },
    signInForLibrary: 'Войдите, чтобы вести свою библиотеку',
    signInForLibrarySub: 'У каждого аккаунта свой список тайтлов и прогресс.',
    spotlight: 'В центре внимания',
    heroText: 'Отмечайте прочитанные главы, находите популярные тайтлы и следите за прогрессом.',
    trending: 'Популярное',
    trendingText: 'Популярные тайтлы из базы AniList.',
    smartProgress: 'Умный прогресс',
    smartProgressText: 'Отметка главы в одно нажатие с проверкой лимитов.',
    privateLibrary: 'Личная библиотека',
    privateLibraryText: 'Входите в свой аккаунт. Список хранится отдельно для каждого аккаунта на этом устройстве.',
    passwordUpdated: 'Пароль обновлён',
    authLinkError: 'Ссылка недействительна или устарела. Запросите новую.'
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'search' | 'home'>('home');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mangaList, setMangaList] = useState<MangaTitle[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [prefs] = useState(() => readJson<Partial<Prefs>>(PREFS_KEY, {}));
  const [includeAdult, setIncludeAdult] = useState(prefs.includeAdult === true);
  const [language, setLanguage] = useState<Language>(
    prefs.language === 'en' || prefs.language === 'ru' ? prefs.language : navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en'
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [hideLabels, setHideLabels] = useState(prefs.hideLabels === true);
  const [selectedManga, setSelectedManga] = useState<MangaTitle | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const t = useMemo(() => translations[language], [language]);

  useEffect(() => {
    if (user) saveLibrary(user.id, mangaList);
  }, [user, mangaList]);

  // Ongoing series have no chapter count on AniList: look up the latest
  // released chapter (via /api/latest-chapter) one title at a time, at most
  // once a day per title. Failed lookups are retried on the next page load.
  const mangaListRef = useRef(mangaList);
  mangaListRef.current = mangaList;
  const failedLookups = useRef(new Set<string>());
  const pendingLookups = mangaList
    .filter(m => needsLatestChapterCheck(m) && !failedLookups.current.has(m.id))
    .map(m => m.id)
    .join(',');
  useEffect(() => {
    if (!user || !pendingLookups) return;
    const controller = new AbortController();
    (async () => {
      for (const id of pendingLookups.split(',')) {
        const manga = mangaListRef.current.find(m => m.id === id);
        if (!manga) continue;
        const info = await fetchLatestChapter(manga, controller.signal);
        if (controller.signal.aborted) return;
        if (!info) {
          failedLookups.current.add(id);
          continue;
        }
        setMangaList(prev => prev.map(m => m.id === id
          ? { ...m, latestChapter: info.latestChapter, latestChapterUrl: info.url, latestChapterCheckedAt: Date.now() }
          : m));
      }
    })();
    return () => controller.abort();
  }, [user, pendingLookups]);

  useEffect(() => {
    writeJson(PREFS_KEY, { language, includeAdult, hideLabels } satisfies Prefs);
    document.documentElement.lang = language;
  }, [language, includeAdult, hideLabels]);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Session comes from Supabase asynchronously (restored from storage, or from
  // the link in a confirmation / password-reset email).
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    return onAuthChange((nextUser, event) => {
      const nextId = nextUser?.id ?? null;
      if (nextId !== userIdRef.current) {
        userIdRef.current = nextId;
        setUser(nextUser);
        setMangaList(nextUser ? loadLibrary(nextUser.id) : []);
      } else if (nextUser) {
        setUser(nextUser); // e.g. metadata changed
      }
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('recovery');
        setShowAuth(true);
      }
      setAuthReady(true);
    });
  }, []);

  // Expired/invalid email links come back as #error=...&error_code=...
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get('error') || hash.get('error_code')) {
      showToast(t.authLinkError, 'error');
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAuth = (mode: AuthMode = 'login') => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  const handleTabChange = (tab: 'dashboard' | 'search' | 'home') => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const toggleLanguage = () => {
    setLanguage(prev => {
      const next = prev === 'en' ? 'ru' : 'en';
      showToast(translations[next].langChanged);
      return next;
    });
  };

  const toggleNSFW = () => {
    setIncludeAdult(prev => {
      const next = !prev;
      showToast(next ? t.nsfwVisible : t.safeSearch, next ? 'error' : 'success');
      return next;
    });
  };

  const handleLogin = (newUser: User, isNewAccount: boolean) => {
    if (userIdRef.current !== newUser.id) {
      userIdRef.current = newUser.id;
      setUser(newUser);
      setMangaList(loadLibrary(newUser.id));
    }
    setShowAuth(false);
    showToast((isNewAccount ? t.accountCreated : t.welcomeUser).replace('{name}', newUser.username));
  };

  const handleLogout = async () => {
    await logout();
    userIdRef.current = null;
    setUser(null);
    setMangaList([]);
    setSelectedManga(null);
    setActiveTab('home');
    showToast(t.loggedOut);
  };

  const closeAuth = useCallback(() => setShowAuth(false), []);
  const handlePasswordUpdated = () => {
    setShowAuth(false);
    showToast(t.passwordUpdated);
  };

  const updateProgress = (id: string, chapter: number) => {
    setMangaList(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, currentChapter: clampChapter(m, chapter) };
      }
      return m;
    }));
  };

  const updateStatus = (id: string, status: MangaStatus) => {
    setMangaList(prev => prev.map(m => {
      if (m.id === id) {
        const newChapter = status === MangaStatus.COMPLETED && m.totalChapters > 0 ? m.totalChapters : m.currentChapter;
        return { ...m, status, currentChapter: newChapter };
      }
      return m;
    }));
    showToast(`${t.statusUpdated}: ${t.statusNames[status]}`);
  };

  const addOrUpdateTitle = (manga: MangaTitle) => {
    if (!user) {
      openAuth();
      return;
    }
    setMangaList(prev => {
      const exists = prev.find(m => m.id === manga.id);
      if (exists) {
        showToast(`${t.moved}: ${manga.title}`);
        return prev.map(m => m.id === manga.id ? { ...m, status: manga.status } : m);
      }
      showToast(`${t.added}: ${manga.title}`);
      return [...prev, manga];
    });
  };

  const removeFromLibrary = (id: string) => {
    setMangaList(prev => prev.filter(m => m.id !== id));
    showToast(t.removed, "error");
  };

  return (
      <div className="flex h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 overflow-hidden font-['Inter']">
        {isSidebarOpen && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}

        <Sidebar
            activeTab={activeTab === 'home' ? 'dashboard' : activeTab as any}
            setActiveTab={handleTabChange as any}
            language={language}
            t={t}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            onClose={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto relative transition-all duration-300 ease-in-out scroll-smooth custom-scrollbar">
          {toast && (
              <div className="fixed top-6 right-6 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl ${
                    toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {toast.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  <span className="text-sm font-bold">{toast.message}</span>
                </div>
              </div>
          )}

          {activeTab === 'home' ? (
              <div className="min-h-full flex flex-col">
                <div className="relative min-h-[70vh] md:min-h-[85vh] w-full overflow-hidden flex flex-col justify-end">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10" />
                  <img
                      src="https://images.unsplash.com/photo-1614583225154-5feaba1bd5dd?q=80&w=2000&auto=format&fit=crop"
                      className="absolute inset-0 w-full h-full object-cover scale-105 animate-pulse-slow brightness-[0.6]"
                      alt="hero"
                  />

                  <div className="absolute top-6 right-6 md:top-12 md:right-12 z-30 flex flex-wrap justify-end gap-3">
                    <button onClick={toggleLanguage} className="p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl hover:bg-white/10 text-white transition-all">
                      <Languages size={18} />
                    </button>
                    <button
                        onClick={toggleNSFW}
                        className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${
                            includeAdult ? 'bg-rose-600/20 border-rose-500/40 text-rose-400' : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                    >
                      <Ghost size={16} /> {includeAdult ? t.nsfwOn : t.sfwOnly}
                    </button>
                    {user ? (
                        <>
                        <span className="hidden sm:flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-white">
                          <UserIcon size={16} /> {user.username}
                        </span>
                        <button onClick={handleLogout} className="flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-rose-600/20 transition-all text-sm font-black uppercase tracking-widest text-white">
                          <LogOut size={16} /> {t.logout}
                        </button>
                        </>
                    ) : (
                        <button onClick={() => openAuth()} className="flex items-center gap-3 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 rounded-2xl transition-all text-sm font-black uppercase tracking-widest text-white">
                          <UserIcon size={16} /> {t.login}
                        </button>
                    )}
                  </div>

                  <div className="relative p-6 md:p-20 z-20 space-y-6 max-w-5xl pb-12 md:pb-24">
                    <div className="flex items-center gap-2 text-indigo-400 font-black uppercase tracking-[0.4em] text-[10px] md:text-[11px]">
                      <Sparkles size={18} /> {t.spotlight}
                    </div>
                    <h1 className="text-5xl md:text-9xl font-black text-white uppercase tracking-tighter leading-[0.85] italic">
                      MYMANGA<br/>LIST
                    </h1>
                    <p className="text-slate-300 text-sm md:text-xl font-medium max-w-xl leading-relaxed opacity-90 drop-shadow-lg">
                      {t.explore}. {t.heroText}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <button onClick={() => handleTabChange('search')} className="w-full sm:w-auto px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-full hover:scale-105 transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95">
                        <Search size={18} /> {t.discover}
                      </button>
                      <button onClick={() => handleTabChange('dashboard')} className="w-full sm:w-auto px-10 py-5 bg-slate-900/40 backdrop-blur-xl text-white font-black uppercase tracking-widest text-[11px] rounded-full hover:bg-slate-800 transition-all border border-white/10 flex items-center justify-center gap-3 active:scale-95">
                        <BookOpen size={18} /> {t.library}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-6 md:px-20 mt-0 md:-mt-16 relative z-30 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-20">
                  <div className="p-8 bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 space-y-4 hover:border-indigo-500/40 transition-all">
                    <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400"><TrendingUp size={24} /></div>
                    <h3 className="text-xl font-black uppercase text-white">{t.trending}</h3>
                    <p className="text-slate-500 text-sm font-semibold">{t.trendingText}</p>
                  </div>
                  <div className="p-8 bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 space-y-4 hover:border-emerald-500/40 transition-all">
                    <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center text-emerald-400"><Layout size={24} /></div>
                    <h3 className="text-xl font-black uppercase text-white">{t.smartProgress}</h3>
                    <p className="text-slate-500 text-sm font-semibold">{t.smartProgressText}</p>
                  </div>
                  <div className="p-8 bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 space-y-4 hover:border-purple-500/40 transition-all">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-400"><ShieldCheck size={24} /></div>
                    <h3 className="text-xl font-black uppercase text-white">{t.privateLibrary}</h3>
                    <p className="text-slate-500 text-sm font-semibold">{t.privateLibraryText}</p>
                  </div>
                </div>
              </div>
          ) : (
              <div className="p-4 md:p-10">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                  <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                    <button onClick={() => handleTabChange('home')} className="p-4 bg-slate-900 hover:bg-slate-800 rounded-2xl border border-slate-800 text-slate-400 transition-all"><ArrowLeft size={18} /></button>
                    <h1 className="text-xl md:text-5xl font-black bg-gradient-to-br from-white to-indigo-500 bg-clip-text text-transparent tracking-tighter uppercase truncate">
                      {activeTab === 'dashboard' ? t.library : t.discover}
                    </h1>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button
                        onClick={() => setHideLabels(!hideLabels)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${
                            hideLabels ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                    >
                      {hideLabels ? <EyeOff size={16} /> : <Eye size={16} />}
                      <span className="hidden sm:inline">{hideLabels ? t.showLabels : t.hideLabels}</span>
                    </button>

                    <button
                        onClick={toggleNSFW}
                        className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${
                            includeAdult ? 'bg-rose-600/20 border-rose-500/40 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                    >
                      <Ghost size={16} /> {includeAdult ? t.nsfwOn : t.sfwOnly}
                    </button>

                    <button onClick={toggleLanguage} className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-slate-400 transition-all">
                      <Languages size={18} />
                    </button>
                  </div>
                </header>

                <div className="relative z-10">
                  {activeTab === 'dashboard' && !user && !authReady && (
                      <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>
                  )}
                  {activeTab === 'dashboard' && !user && authReady && (
                      <div className="max-w-xl mx-auto text-center py-20 space-y-4">
                        <BookOpen size={40} className="mx-auto text-slate-600" />
                        <p className="text-xl font-black text-white">{t.signInForLibrary}</p>
                        <p className="text-slate-500 text-sm">{t.signInForLibrarySub}</p>
                        <button onClick={() => openAuth()} className="inline-flex items-center gap-3 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-sm font-black uppercase tracking-widest text-white">
                          <UserIcon size={16} /> {t.login}
                        </button>
                      </div>
                  )}
                  {activeTab === 'dashboard' && user && <Dashboard mangaList={mangaList} updateProgress={updateProgress} updateStatus={updateStatus} onRemove={removeFromLibrary} onSelect={setSelectedManga} onDiscover={() => handleTabChange('search')} language={language} hideLabels={hideLabels} />}
                  {activeTab === 'search' && <SearchTitle onAdd={addOrUpdateTitle} mangaList={mangaList} includeAdult={includeAdult} onSelect={setSelectedManga} language={language} hideLabels={hideLabels} />}
                </div>
              </div>
          )}
        </main>

        {showAuth && <Auth key={authMode} initialMode={authMode} onClose={closeAuth} onLogin={handleLogin} onPasswordUpdated={handlePasswordUpdated} language={language} />}
        {selectedManga && <MangaModal manga={selectedManga} onClose={() => setSelectedManga(null)} language={language} />}
      </div>
  );
};

export default App;
