
import React, { useState } from 'react';
import { MangaTitle, MangaStatus } from '../types';
import { Plus, Minus, BookOpen, CheckCircle, XCircle, Trash2, Star, Clock, Search } from 'lucide-react';

interface DashboardProps {
  mangaList: MangaTitle[];
  updateProgress: (id: string, chapter: number) => void;
  updateStatus: (id: string, status: MangaStatus) => void;
  onRemove: (id: string) => void;
  onSelect: (manga: MangaTitle) => void;
  onDiscover: () => void;
  language: 'en' | 'ru';
  hideLabels?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ mangaList, updateProgress, updateStatus, onRemove, onSelect, onDiscover, language, hideLabels }) => {
  const [filter, setFilter] = useState<MangaStatus | 'ALL'>('ALL');

  const labels = language === 'en' ? {
    reading: 'Reading', finished: 'Done', plan: 'Plan', dropped: 'Dropped', all: 'All Titles',
    remove: 'Remove', progress: 'Progress', ch: 'Ch.', of: '/', ongoing: 'Ongoing',
    emptyTitle: 'Your library is empty', emptySub: 'Find a series in Discover and add it to your list.',
    emptyFilter: 'No titles with this status yet', discover: 'Discover', confirmRemove: 'Remove "{title}" from your library?'
  } : {
    reading: 'Читаю', finished: 'Прочитано', plan: 'Буду', dropped: 'Брошено', all: 'Весь список',
    remove: 'Удалить', progress: 'Прогресс', ch: 'Гл.', of: '/', ongoing: 'Выходит',
    emptyTitle: 'Библиотека пуста', emptySub: 'Найдите тайтл в поиске и добавьте его в список.',
    emptyFilter: 'Пока нет тайтлов с этим статусом', discover: 'Поиск', confirmRemove: 'Удалить «{title}» из библиотеки?'
  };

  const getDisplayTitle = (m: MangaTitle) => {
    if (language === 'ru' && m.titles.russian) return m.titles.russian;
    return m.titles.english || m.titles.romaji || m.title;
  };

  const getStatusConfig = (status: MangaStatus) => {
    switch(status) {
      case MangaStatus.READING: return { color: 'bg-emerald-500', icon: <BookOpen size={14} />, label: labels.reading, glow: 'shadow-emerald-500/20' };
      case MangaStatus.COMPLETED: return { color: 'bg-indigo-500', icon: <CheckCircle size={14} />, label: labels.finished, glow: 'shadow-indigo-500/20' };
      case MangaStatus.PLAN_TO_READ: return { color: 'bg-amber-500', icon: <Clock size={14} />, label: labels.plan, glow: 'shadow-amber-500/20' };
      case MangaStatus.DROPPED: return { color: 'bg-rose-500', icon: <XCircle size={14} />, label: labels.dropped, glow: 'shadow-rose-500/20' };
    }
  };

  const handleIncrement = (m: MangaTitle) => {
    const nextChapter = m.currentChapter + 1;
    if (m.totalChapters > 0 && nextChapter >= m.totalChapters) {
      updateProgress(m.id, m.totalChapters);
      if (m.status !== MangaStatus.COMPLETED) {
        updateStatus(m.id, MangaStatus.COMPLETED);
      }
    } else {
      updateProgress(m.id, nextChapter);
    }
  };

  const filteredList = filter === 'ALL' ? mangaList : mangaList.filter(m => m.status === filter);

  const handleRemove = (m: MangaTitle) => {
    if (window.confirm(labels.confirmRemove.replace('{title}', getDisplayTitle(m)))) onRemove(m.id);
  };

  if (mangaList.length === 0) {
    return (
        <div className="max-w-xl mx-auto text-center py-20 space-y-4">
          <BookOpen size={40} className="mx-auto text-slate-600" />
          <p className="text-xl font-black text-white">{labels.emptyTitle}</p>
          <p className="text-slate-500 text-sm">{labels.emptySub}</p>
          <button onClick={onDiscover} className="inline-flex items-center gap-3 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-sm font-black uppercase tracking-widest text-white">
            <Search size={16} /> {labels.discover}
          </button>
        </div>
    );
  }

  return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 p-1.5 md:p-2 bg-slate-900/50 backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-x-auto no-scrollbar">
          <button
              onClick={() => setFilter('ALL')}
              className={`flex-shrink-0 px-4 md:px-6 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === 'ALL' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
          >
            {labels.all} ({mangaList.length})
          </button>
          {Object.values(MangaStatus).map((status) => {
            const config = getStatusConfig(status);
            const count = mangaList.filter(m => m.status === status).length;
            return (
                <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                        filter === status ? `${config.color} text-white shadow-xl ${config.glow}` : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                >
                  {config.icon} {config.label} ({count})
                </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-8">
          {filteredList.map((manga) => {
            const config = getStatusConfig(manga.status);
            const displayTitle = getDisplayTitle(manga);
            const isOngoing = manga.totalChapters === 0 || !manga.totalChapters;
            const progressPercent = manga.totalChapters ? (manga.currentChapter / manga.totalChapters) * 100 : 100;
            const isAtMax = manga.totalChapters > 0 && manga.currentChapter >= manga.totalChapters;

            return (
                <div key={manga.id} className="group relative bg-slate-900 rounded-2xl md:rounded-[2.5rem] overflow-hidden border border-slate-800/50 hover:border-indigo-500/40 transition-all duration-500 shadow-2xl aspect-[2/3.3] sm:aspect-[2/3.2]">
                  <img
                      src={manga.coverImage}
                      alt={displayTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-pointer"
                      onClick={() => onSelect({...manga, title: displayTitle})}
                  />

                  {/* Overlay with Title for Zen Mode */}
                  {hideLabels && (
                      <div className="absolute inset-0 flex items-center justify-center p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                        <div className="bg-slate-950/90 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-500 text-center">
                          <h3 className="text-[10px] font-black text-white uppercase tracking-tight leading-tight">{displayTitle}</h3>
                          <div className="mt-2 flex items-center justify-center gap-1 text-[8px] font-black text-amber-400">
                            <Star size={8} className="fill-amber-400" /> {manga.rating}
                          </div>
                        </div>
                      </div>
                  )}

                  <div className="absolute top-2 left-2 right-2 flex justify-between items-start opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 z-10">
                    <div className={`${config.color} px-2 py-1 rounded-lg text-[6px] md:text-[7px] font-black text-white shadow-2xl flex items-center gap-1 uppercase tracking-wider border border-white/10`}>
                      {config.icon}
                    </div>
                    <button onClick={() => handleRemove(manga)} aria-label={labels.remove} title={labels.remove} className="p-1.5 bg-rose-600/80 backdrop-blur-md text-white rounded-lg hover:bg-rose-500 shadow-xl border border-white/10 pointer-events-auto transition-transform active:scale-90">
                      <Trash2 size={10} className="md:size-[12px]" />
                    </button>
                  </div>

                  {/* Bottom UI - Hidden in Zen Mode unless hovered */}
                  <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent p-3 pt-8 flex flex-col justify-end items-start transition-all duration-500 ${hideLabels ? 'opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0' : 'opacity-100'}`}>
                    <div className="w-full space-y-2 pointer-events-auto">
                      <div className="space-y-0.5">
                        <h3 className="text-[9px] md:text-[10px] font-black text-white leading-[1.2] line-clamp-1 md:line-clamp-2 drop-shadow-lg uppercase tracking-tight cursor-pointer hover:text-indigo-300 transition-colors" onClick={() => onSelect({...manga, title: displayTitle})}>
                          {displayTitle}
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5 text-[7px] md:text-[8px] font-black text-amber-400">
                            <Star size={8} className="fill-amber-400" /> {manga.rating}
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-950/90 border border-white/5 rounded-xl p-0.5 md:p-1 flex items-center justify-between shadow-2xl">
                        <button
                            onClick={() => updateProgress(manga.id, manga.currentChapter - 1)}
                            disabled={manga.currentChapter <= 0}
                            className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg transition-all active:scale-90 disabled:opacity-10"
                        >
                          <Minus size={10} className="md:size-[14px]" />
                        </button>

                        <div className="flex flex-col items-center flex-1">
                          <div className="flex items-center gap-0.5 md:gap-1">
                            <input
                                type="number"
                                min="0"
                                max={manga.totalChapters > 0 ? manga.totalChapters : 9999}
                                value={manga.currentChapter}
                                onChange={(e) => updateProgress(manga.id, parseInt(e.target.value) || 0)}
                                className="w-7 md:w-10 bg-transparent text-center text-[10px] md:text-[12px] font-black text-white focus:outline-none focus:text-indigo-400 transition-colors p-0"
                            />
                            <span className="text-[7px] md:text-[8px] font-bold text-slate-600">{labels.of}</span>
                            <span className={`text-[8px] md:text-[10px] font-black ${isOngoing ? 'text-emerald-500/70 italic' : 'text-slate-500'}`}>
                           {isOngoing ? labels.ongoing : manga.totalChapters}
                         </span>
                          </div>
                        </div>

                        <button
                            onClick={() => handleIncrement(manga)}
                            disabled={isAtMax}
                            className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-lg transition-all active:scale-90 shadow-lg ${isAtMax ? 'bg-indigo-500/10 text-indigo-500/30' : config.color + ' text-white hover:brightness-110'}`}
                        >
                          {isAtMax ? <CheckCircle size={10} className="md:size-[14px]" /> : <Plus size={10} className="md:size-[14px]" />}
                        </button>
                      </div>

                      {!isOngoing && (
                          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden shadow-inner border border-white/5">
                            <div className={`${config.color} h-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(0,0,0,0.3)]`} style={{ width: `${Math.min(100, progressPercent)}%` }} />
                          </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="flex gap-1 p-0.5 bg-black/40 rounded-lg border border-white/5">
                          {[
                            { s: MangaStatus.READING, icon: <BookOpen size={8} />, bg: 'bg-emerald-600' },
                            { s: MangaStatus.PLAN_TO_READ, icon: <Clock size={8} />, bg: 'bg-amber-600' },
                            { s: MangaStatus.COMPLETED, icon: <CheckCircle size={8} />, bg: 'bg-indigo-600' },
                            { s: MangaStatus.DROPPED, icon: <XCircle size={8} />, bg: 'bg-rose-600' },
                          ].map((btn) => (
                              <button key={btn.s} onClick={() => updateStatus(manga.id, btn.s)} title={getStatusConfig(btn.s).label} aria-label={getStatusConfig(btn.s).label} className={`p-1 md:p-1.5 rounded-md transition-all ${manga.status === btn.s ? 'bg-white/20 scale-110' : btn.bg + ' opacity-20 hover:opacity-100'}`}>
                                {btn.icon}
                              </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            );
          })}
        </div>
        {filteredList.length === 0 && (
            <p className="text-center py-16 text-slate-500 font-black uppercase tracking-widest text-sm">{labels.emptyFilter}</p>
        )}
      </div>
  );
};

export default Dashboard;
