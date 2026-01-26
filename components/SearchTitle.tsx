
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, TrendingUp, Star, BookOpen, Clock, CheckCircle, XCircle, Sparkles, Filter, Globe, Book } from 'lucide-react';
import { MangaTitle, MangaStatus } from '../types';
import { GoogleGenAI } from "@google/genai";

interface SearchTitleProps {
  onAdd: (manga: MangaTitle) => void;
  mangaList: MangaTitle[];
  includeAdult: boolean;
  onSelect: (manga: MangaTitle) => void;
  language: 'en' | 'ru';
  hideLabels?: boolean;
}

const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", 
  "Horror", "Mystery", "Psychological", "Romance", "Sci-Fi", 
  "Slice of Life", "Sports", "Supernatural", "Thriller"
];

const PUB_STATUS = [
  { code: 'RELEASING', label: 'Ongoing' },
  { code: 'FINISHED', label: 'Completed' },
  { code: 'NOT_YET_RELEASED', label: 'Upcoming' }
];

const SearchTitle: React.FC<SearchTitleProps> = ({ onAdd, mangaList, includeAdult, onSelect, language, hideLabels }) => {
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [results, setResults] = useState<MangaTitle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [optimizingQuery, setOptimizingQuery] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasNextPage]);

  // Enhanced AI Bridge for semantic title resolution
  const getOptimizedQuery = async (input: string) => {
    const isRussian = /[а-яА-ЯёЁ]/.test(input);
    if (!isRussian || input.length < 3) return input;

    setOptimizingQuery(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a manga search specialist. The user is searching for a manga/manhwa/manhua title in Russian: "${input}". 
        Find the most accurate official English or Romaji title that exists in major databases (like AniList or MyAnimeList). 
        For example: "как выжить в академии" -> "Extraordinary Academy Survival".
        Return ONLY the resolved title string, NO explanations.`,
      });
      return response.text.trim().replace(/"/g, '');
    } catch (err) {
      console.error("Query optimization failed:", err);
      return input;
    } finally {
      setOptimizingQuery(false);
    }
  };

  const translateTitles = async (mangaItems: MangaTitle[]) => {
    if (language !== 'ru' || mangaItems.length === 0) return mangaItems;
    setTranslating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const titlesToTranslate = mangaItems.map(m => m.titles.english || m.titles.romaji).join(' | ');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate the following manga titles into Russian. Keep standard scanlation names if they are popular. Return only translations separated by " | ": ${titlesToTranslate}`,
      });
      const translatedArray = response.text.split('|').map(s => s.trim());
      return mangaItems.map((item, index) => ({
        ...item,
        titles: { ...item.titles, russian: translatedArray[index] || item.titles.english }
      }));
    } catch (err) {
      return mangaItems;
    } finally {
      setTranslating(false);
    }
  };

  const fetchManga = async (search: string, pageNum: number, isNewSearch: boolean) => {
    if (isNewSearch) setLoading(true);
    else setLoadingMore(true);

    const finalSearchQuery = isNewSearch && search ? await getOptimizedQuery(search) : search;

    const gqlQuery = `
      query ($search: String, $page: Int, $perPage: Int, $sort: [MediaSort], $isAdult: Boolean, $genre: String, $status: MediaStatus) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { hasNextPage }
          media(search: $search, type: MANGA, sort: $sort, isAdult: $isAdult, genre: $genre, status: $status) {
            id
            title { romaji english native }
            description
            coverImage { extraLarge large }
            chapters
            averageScore
            isAdult
          }
        }
      }
    `;

    const variables: any = { 
      page: pageNum,
      perPage: 30,
      sort: finalSearchQuery ? ["SEARCH_MATCH"] : ["TRENDING_DESC", "POPULARITY_DESC"]
    };
    if (finalSearchQuery) variables.search = finalSearchQuery;
    if (!includeAdult) variables.isAdult = false;
    if (selectedGenre) variables.genre = selectedGenre;
    if (selectedStatus) variables.status = selectedStatus;

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query: gqlQuery, variables }),
      });
      const json = await response.json();
      const pageInfo = json.data.Page.pageInfo;
      setHasNextPage(pageInfo.hasNextPage);

      let mapped: MangaTitle[] = json.data.Page.media.map((m: any) => ({
        id: m.id.toString(),
        title: m.title.english || m.title.romaji || m.title.native,
        titles: { english: m.title.english, romaji: m.title.romaji, native: m.title.native },
        description: m.description?.replace(/<[^>]*>?/gm, '') || '...',
        coverImage: m.coverImage.extraLarge || m.coverImage.large,
        totalChapters: m.chapters || 0,
        currentChapter: 0,
        status: MangaStatus.PLAN_TO_READ,
        rating: m.averageScore ? (m.averageScore / 10).toFixed(1) : 'N/A',
        lastUpdated: new Date().toISOString().split('T')[0],
        isAdult: m.isAdult
      }));

      if (language === 'ru') mapped = await translateTitles(mapped);
      setResults(prev => isNewSearch ? mapped : [...prev, ...mapped]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setResults([]);
    const timeout = setTimeout(() => fetchManga(query, 1, true), 500);
    return () => clearTimeout(timeout);
  }, [query, includeAdult, language, selectedGenre, selectedStatus]);

  useEffect(() => {
    if (page > 1) fetchManga(query, page, false);
  }, [page]);

  const labels = language === 'en' ? {
    placeholder: "Search in any language...", trending: "Trending Now", results: "Search Results",
    translating: "Translating titles...", optimizing: "AI Resolving Russian title...", loadingMore: "Loading more...",
    filters: "Filters", genre: "Genres", status: "Status"
  } : {
    placeholder: "Ищите на любом языке...", trending: "Сейчас в тренде", results: "Результаты поиска",
    translating: "Переводим названия...", optimizing: "ИИ ищет оригинал...", loadingMore: "Загружаем еще...",
    filters: "Фильтры", genre: "Жанры", status: "Статус"
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col gap-6">
        <div className="relative max-w-3xl mx-auto w-full group">
          <div className="absolute inset-0 bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition-all rounded-full"></div>
          <div className="relative flex items-center gap-3">
            <div className="relative flex-1">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500">
                {(loading || optimizingQuery) ? <Loader2 size={24} className="animate-spin text-indigo-400" /> : <Search size={24} />}
              </div>
              <input 
                type="text"
                placeholder={labels.placeholder}
                className="w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] py-5 pl-16 pr-8 focus:ring-4 focus:ring-indigo-500/20 outline-none text-slate-100 transition-all shadow-2xl text-lg font-medium"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-5 rounded-[2.5rem] border transition-all shadow-2xl ${showFilters ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
            >
              <Filter size={24} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden transition-all duration-500 ${showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-4 bg-slate-900/50 rounded-[2rem] border border-slate-800 space-y-2">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-2">{labels.genre}</p>
            <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 outline-none">
              <option value="">All Genres</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="p-4 bg-slate-900/50 rounded-[2rem] border border-slate-800 space-y-2">
            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] ml-2">{labels.status}</p>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 outline-none">
              <option value="">All Statuses</option>
              {PUB_STATUS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 px-2">
        <TrendingUp size={16} className="text-indigo-400" />
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          {query ? labels.results : labels.trending}
        </h2>
        {optimizingQuery && <div className="text-[8px] font-black text-indigo-400 animate-pulse bg-indigo-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{labels.optimizing}</div>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8">
        {results.map((manga, index) => {
          const isAdded = mangaList.some(m => m.id === manga.id);
          const displayTitle = (language === 'ru' && manga.titles.russian) ? manga.titles.russian : (manga.titles.english || manga.titles.romaji || manga.title);

          return (
            <div 
              key={`${manga.id}-${index}`} 
              ref={index === results.length - 1 ? lastElementRef : null}
              className="group relative bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-800/50 hover:border-indigo-500/50 transition-all duration-500 shadow-2xl aspect-[2/3]"
            >
              <img 
                src={manga.coverImage} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 cursor-pointer" 
                alt={displayTitle} 
                onClick={() => onSelect({...manga, title: displayTitle})}
              />
              
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-xl border border-white/5 flex items-center gap-1 shadow-2xl">
                  <Star size={10} className="text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-black text-white">{manga.rating}</span>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-4 pb-1 flex flex-col justify-end items-start pointer-events-none">
                <div className="w-full space-y-2 pointer-events-auto">
                  {!hideLabels && (
                    <h4 
                      className="font-black text-[10px] md:text-[11px] leading-tight text-white line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] uppercase tracking-tight mb-1 cursor-pointer hover:text-indigo-300 transition-colors"
                      onClick={() => onSelect({...manga, title: displayTitle})}
                    >
                      {displayTitle}
                    </h4>
                  )}
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    {[
                      { s: MangaStatus.READING, icon: <BookOpen size={10} />, bg: 'bg-emerald-600' },
                      { s: MangaStatus.PLAN_TO_READ, icon: <Clock size={10} />, bg: 'bg-amber-600' },
                      { s: MangaStatus.COMPLETED, icon: <CheckCircle size={10} />, bg: 'bg-indigo-600' },
                    ].map((item) => (
                      <button 
                        key={item.s} 
                        onClick={() => onAdd({...manga, title: displayTitle, status: item.s})} 
                        className={`flex-1 hover:scale-105 active:scale-95 ${item.bg} text-white py-2 rounded-xl flex items-center justify-center transition-all shadow-xl border border-white/10`}
                      >
                        {item.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SearchTitle;
