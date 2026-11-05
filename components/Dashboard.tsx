
import React, { useEffect, useState } from 'react';
import { MangaTitle, MangaStatus } from '../types';
import { CHAPTER_MARGIN, chapterLimit, NO_LIMIT } from '../lib/chapters';
import { Plus, Minus, BookOpen, CheckCircle, XCircle, Trash2, Star, Clock, Search, ChevronDown, Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import type { SyncState } from '../hooks/useLibrarySync';
import { Language } from '../lib/i18n';

interface DashboardProps {
  mangaList: MangaTitle[];
  updateProgress: (id: string, chapter: number) => void;
  updateStatus: (id: string, status: MangaStatus) => void;
  onRemove: (id: string) => void;
  onSelect: (manga: MangaTitle) => void;
  onDiscover: () => void;
  syncState: SyncState;
  language: Language;
  hideLabels?: boolean;
}

type Labels = {
  [K in 'reading' | 'finished' | 'plan' | 'dropped' | 'all' | 'remove' | 'ongoing' | 'chapterInput' | 'prevChapter' | 'latestHint' | 'unknownHint'
    | 'nextChapter' | 'status' | 'emptyTitle' | 'emptySub' | 'emptyFilter' | 'discover' | 'confirmRemove']: string;
};

const STATUS_ORDER = [MangaStatus.READING, MangaStatus.PLAN_TO_READ, MangaStatus.COMPLETED, MangaStatus.DROPPED];

const STATUS_STYLE: Record<MangaStatus, { icon: React.ReactNode; badge: string; bar: string; active: string }> = {
  [MangaStatus.READING]: { icon: <BookOpen size={12} />, badge: 'bg-emerald-500 text-white', bar: 'bg-emerald-500', active: 'bg-emerald-600 text-white' },
  [MangaStatus.PLAN_TO_READ]: { icon: <Clock size={12} />, badge: 'bg-amber-500 text-slate-950', bar: 'bg-amber-500', active: 'bg-amber-500 text-slate-950' },
  [MangaStatus.COMPLETED]: { icon: <CheckCircle size={12} />, badge: 'bg-indigo-500 text-white', bar: 'bg-indigo-500', active: 'bg-indigo-600 text-white' },
  [MangaStatus.DROPPED]: { icon: <XCircle size={12} />, badge: 'bg-rose-500 text-white', bar: 'bg-rose-500', active: 'bg-rose-600 text-white' },
};

/** Chapter field that can be cleared while typing; the value is applied on blur or Enter. */
const ChapterInput: React.FC<{ value: number; max: number; label: string; onCommit: (n: number) => void }> = ({ value, max, label, onCommit }) => {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = () => {
    const n = parseInt(text, 10);
    if (Number.isNaN(n)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(Math.max(n, 0), max);
    setText(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={text}
      onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, String(max).length || 5))}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      onFocus={(e) => e.target.select()}
      style={{ width: `${Math.max(text.length, 1) + 1}ch` }}
      className="min-w-[2.5ch] bg-transparent text-center text-sm sm:text-base font-bold text-white rounded-md focus:outline-none focus:bg-slate-800 tabular-nums"
    />
  );
};

const Dashboard: React.FC<DashboardProps> = ({ mangaList, updateProgress, updateStatus, onRemove, onSelect, onDiscover, syncState, language, hideLabels }) => {
  const [filter, setFilter] = useState<MangaStatus | 'ALL'>('ALL');

  const labels: Labels = ({ en: {
    reading: 'Reading', finished: 'Completed', plan: 'Plan to read', dropped: 'Dropped', all: 'All',
    remove: 'Remove from library', ongoing: 'Ongoing', chapterInput: 'Current chapter',
    latestHint: 'Latest known chapter: {latest} (MangaUpdates). You can mark up to {limit}.',
    unknownHint: 'Number of chapters is unknown',
    prevChapter: 'Previous chapter', nextChapter: 'Next chapter', status: 'Status',
    emptyTitle: 'Your library is empty', emptySub: 'Find a series in Discover and add it to your list.',
    emptyFilter: 'No titles with this status yet', discover: 'Discover', confirmRemove: 'Remove "{title}" from your library?'
  }, ru: {
    reading: 'Читаю', finished: 'Прочитано', plan: 'В планах', dropped: 'Брошено', all: 'Все',
    remove: 'Удалить из библиотеки', ongoing: 'Выходит', chapterInput: 'Текущая глава',
    latestHint: 'Последняя известная глава: {latest} (MangaUpdates). Можно отметить до {limit}.',
    unknownHint: 'Число глав неизвестно',
    prevChapter: 'Предыдущая глава', nextChapter: 'Следующая глава', status: 'Статус',
    emptyTitle: 'Библиотека пуста', emptySub: 'Найдите тайтл в поиске и добавьте его в список.',
    emptyFilter: 'Пока нет тайтлов с этим статусом', discover: 'Поиск', confirmRemove: 'Удалить «{title}» из библиотеки?'
  }, kk: {
    reading: 'Оқып жүрмін', finished: 'Оқып шықтым', plan: 'Жоспарда', dropped: 'Тастадым', all: 'Барлығы',
    remove: 'Кітапханадан өшіру', ongoing: 'Шығып жатыр', chapterInput: 'Ағымдағы тарау',
    latestHint: 'Белгілі соңғы тарау: {latest} (MangaUpdates). {limit}-ге дейін белгілеуге болады.',
    unknownHint: 'Тараулар саны белгісіз',
    prevChapter: 'Алдыңғы тарау', nextChapter: 'Келесі тарау', status: 'Күйі',
    emptyTitle: 'Кітапхана бос', emptySub: 'Іздеу арқылы тайтл тауып, тізімге қосыңыз.',
    emptyFilter: 'Бұл күйде әзірге тайтл жоқ', discover: 'Іздеу', confirmRemove: '«{title}» кітапханадан өшірілсін бе?'
  } } satisfies Record<Language, Labels>)[language];

  const syncText: Record<Exclude<SyncState, 'disabled'>, string> = ({ en: {
    syncing: 'Syncing…',
    synced: 'Synced with your account',
    offline: 'Offline — changes are saved on this device and will sync later',
    notSetUp: 'Sync is not set up yet — the list is stored on this device only',
    error: "Couldn't sync — will retry automatically",
  }, ru: {
    syncing: 'Синхронизация…',
    synced: 'Синхронизировано с аккаунтом',
    offline: 'Нет сети — изменения сохранены на устройстве и синхронизируются позже',
    notSetUp: 'Синхронизация ещё не настроена — список хранится только на этом устройстве',
    error: 'Не удалось синхронизировать — повторим автоматически',
  }, kk: {
    syncing: 'Синхрондау…',
    synced: 'Аккаунтпен синхрондалды',
    offline: 'Желі жоқ — өзгерістер құрылғыда сақталды, кейін синхрондалады',
    notSetUp: 'Синхрондау әлі бапталмаған — тізім тек осы құрылғыда сақталады',
    error: 'Синхрондау мүмкін болмады — автоматты түрде қайталаймыз',
  } })[language];
  const syncIndicator = syncState === 'disabled' ? null : (
      <p role="status" className={`flex items-center gap-2 text-xs ${
          syncState === 'synced' ? 'text-slate-500' : syncState === 'syncing' ? 'text-slate-400' : 'text-amber-400'
      }`}>
        {syncState === 'synced' && <Cloud size={14} />}
        {syncState === 'syncing' && <RefreshCw size={14} className="animate-spin" />}
        {syncState === 'offline' && <CloudOff size={14} />}
        {(syncState === 'notSetUp' || syncState === 'error') && <AlertTriangle size={14} />}
        {syncText[syncState]}
      </p>
  );

  const statusLabel: Record<MangaStatus, string> = {
    [MangaStatus.READING]: labels.reading,
    [MangaStatus.PLAN_TO_READ]: labels.plan,
    [MangaStatus.COMPLETED]: labels.finished,
    [MangaStatus.DROPPED]: labels.dropped,
  };

  const getDisplayTitle = (m: MangaTitle) => {
    if (language === 'ru' && m.titles.russian) return m.titles.russian;
    return m.titles.english || m.titles.romaji || m.title;
  };

  const handleIncrement = (m: MangaTitle) => {
    const nextChapter = m.currentChapter + 1;
    if (m.totalChapters > 0 && nextChapter >= m.totalChapters) {
      if (m.status !== MangaStatus.COMPLETED) updateStatus(m.id, MangaStatus.COMPLETED);
      else updateProgress(m.id, m.totalChapters);
    } else {
      updateProgress(m.id, nextChapter);
    }
  };

  const handleRemove = (m: MangaTitle) => {
    if (window.confirm(labels.confirmRemove.replace('{title}', getDisplayTitle(m)))) onRemove(m.id);
  };

  if (mangaList.length === 0 && syncState === 'syncing') {
    return <div className="flex justify-center py-20">{syncIndicator}</div>;
  }

  if (mangaList.length === 0) {
    return (
        <div className="max-w-xl mx-auto text-center py-20 space-y-4">
          <BookOpen size={40} className="mx-auto text-slate-600" />
          <p className="text-xl font-black text-white">{labels.emptyTitle}</p>
          <p className="text-slate-500 text-sm">{labels.emptySub}</p>
          {syncState === 'syncing' || syncState === 'synced' ? null : <div className="flex justify-center">{syncIndicator}</div>}
          <button onClick={onDiscover} className="inline-flex items-center gap-3 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-sm font-black uppercase tracking-widest text-white">
            <Search size={16} /> {labels.discover}
          </button>
        </div>
    );
  }

  const filteredList = filter === 'ALL' ? mangaList : mangaList.filter(m => m.status === filter);

  const filterButton = (value: MangaStatus | 'ALL', text: string, count: number, icon?: React.ReactNode) => {
    const isActive = filter === value;
    const activeClass = value === 'ALL' ? 'bg-white text-slate-950' : STATUS_STYLE[value].active;
    return (
        <button
            key={value}
            onClick={() => setFilter(value)}
            aria-pressed={isActive}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                isActive ? activeClass : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
        >
          {icon} {text}
          <span className={`text-xs tabular-nums ${isActive ? 'opacity-80' : 'text-slate-500'}`}>{count}</span>
        </button>
    );
  };

  return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {syncIndicator}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {filterButton('ALL', labels.all, mangaList.length)}
          {STATUS_ORDER.map(status =>
              filterButton(status, statusLabel[status], mangaList.filter(m => m.status === status).length, STATUS_STYLE[status].icon)
          )}
        </div>

        {filteredList.length === 0 ? (
            <p className="text-center py-16 text-slate-500 font-semibold">{labels.emptyFilter}</p>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(225px,1fr))] gap-3 sm:gap-5">
              {filteredList.map((manga) => {
                const style = STATUS_STYLE[manga.status];
                const displayTitle = getDisplayTitle(manga);
                const hasTotal = manga.totalChapters > 0;
                const latest = !hasTotal && manga.latestChapter ? Math.floor(manga.latestChapter) : null;
                const limit = chapterLimit(manga);
                const progressBase = hasTotal ? manga.totalChapters : latest;
                const progressPercent = progressBase ? Math.min(100, (manga.currentChapter / progressBase) * 100) : 0;
                const isAtMax = limit !== NO_LIMIT && manga.currentChapter >= limit;
                const totalText = hasTotal ? String(manga.totalChapters) : latest ? `~${latest}` : '?';
                const totalHint = hasTotal ? undefined
                  : latest ? labels.latestHint.replace('{latest}', String(latest)).replace('{limit}', String(latest + CHAPTER_MARGIN))
                  : labels.unknownHint;

                return (
                    <article key={manga.id} className="group flex flex-col bg-slate-900 rounded-2xl border border-slate-800 hover:border-slate-700 overflow-hidden transition-colors">
                      {/* Cover */}
                      <div className="relative aspect-[2/3] bg-slate-800">
                        <button
                            type="button"
                            onClick={() => onSelect({ ...manga, title: displayTitle })}
                            className="absolute inset-0 w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            aria-label={displayTitle}
                        >
                          <img src={manga.coverImage} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                        </button>

                        <span className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold shadow-lg pointer-events-none ${style.badge}`}>
                          {style.icon} {statusLabel[manga.status]}
                        </span>

                        <button
                            type="button"
                            onClick={() => handleRemove(manga)}
                            aria-label={labels.remove}
                            title={labels.remove}
                            className="absolute top-2 right-2 p-2 rounded-full bg-slate-950/70 backdrop-blur text-slate-300 hover:bg-rose-600 hover:text-white transition-all md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>

                        {progressBase && (
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-950/60">
                              <div className={`h-full ${style.bar} transition-all duration-500`} style={{ width: `${progressPercent}%` }} />
                            </div>
                        )}
                      </div>

                      {/* Info + controls */}
                      <div className="flex flex-col gap-3 p-3 flex-1">
                        {!hideLabels && (
                            <div className="space-y-1 min-h-[3.25rem]">
                              <h3
                                  className="text-sm font-semibold text-white leading-snug line-clamp-2 cursor-pointer hover:text-indigo-300"
                                  title={displayTitle}
                                  onClick={() => onSelect({ ...manga, title: displayTitle })}
                              >
                                {displayTitle}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                {manga.rating !== 'N/A' && (
                                    <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                                      <Star size={12} className="fill-amber-400" /> {manga.rating}
                                    </span>
                                )}
                                {!hasTotal && <span className="text-emerald-400/80">{labels.ongoing}</span>}
                              </div>
                            </div>
                        )}

                        <div className="mt-auto space-y-2">
                          <div className="flex items-center justify-between gap-0.5 bg-slate-950 rounded-xl p-1 border border-slate-800">
                            <button
                                type="button"
                                onClick={() => updateProgress(manga.id, manga.currentChapter - 1)}
                                disabled={manga.currentChapter <= 0}
                                aria-label={labels.prevChapter}
                                className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <Minus size={16} />
                            </button>

                            <div className="flex flex-1 items-baseline justify-center min-w-0 overflow-hidden whitespace-nowrap text-slate-500 text-xs">
                              <ChapterInput
                                  value={manga.currentChapter}
                                  max={limit}
                                  label={labels.chapterInput}
                                  onCommit={(n) => updateProgress(manga.id, n)}
                              />
                              <span className={`min-w-0 truncate tabular-nums ${totalHint ? 'cursor-help' : ''}`} title={totalHint}>/ {totalText}</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleIncrement(manga)}
                                disabled={isAtMax}
                                aria-label={labels.nextChapter}
                                className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 ${style.active} hover:brightness-110`}
                            >
                              <Plus size={16} />
                            </button>
                          </div>

                          <label className="relative block">
                            <span className="sr-only">{labels.status}</span>
                            <select
                                value={manga.status}
                                onChange={(e) => updateStatus(manga.id, e.target.value as MangaStatus)}
                                className="w-full appearance-none bg-slate-950 border border-slate-800 rounded-xl py-2 pl-3 pr-8 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer [color-scheme:dark]"
                            >
                              {STATUS_ORDER.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          </label>
                        </div>
                      </div>
                    </article>
                );
              })}
            </div>
        )}
      </div>
  );
};

export default Dashboard;
