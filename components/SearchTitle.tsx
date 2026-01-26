
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Star, BookOpen, Clock, CheckCircle, Ghost, Filter, X } from 'lucide-react';
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

const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror", "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"];

const SearchTitle: React.FC<SearchTitleProps> = ({ onAdd, mangaList, includeAdult, onSelect, language, hideLabels }) => {
  const [query, setQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [results, setResults] = useState<MangaTitle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [optimizingQuery, setOptimizingQuery] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

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

  const getOptimizedQuery = async (input: string) => {
    const isRussian = /[а-яА-ЯёЁ]/.test(input);
    if (!isRussian || input.length < 3) return input;
    setOptimizingQuery(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Manga search: "${input}". Return ONLY the official English or Romaji title. No quotes.`,
      });
      return response.text?.trim().replace(/"/g, '') || input;
    } catch (err) {
      return input;
    } finally {
      setOptimizingQuery(false);
    }
  };

  const fetchManga = async (search: string, pageNum: number, isNewSearch: boolean) => {
    if (isNewSearch) setLoading(true);
    else setLoadingMore(true);

    let finalSearchQuery = search;
    if (isNewSearch && search.trim().length > 0) {
      finalSearchQuery = await getOptimizedQuery(search);
    }

    const gqlQuery = `
      query ($search: String, $page: Int, $perPage: Int, $isAdult: Boolean, $genres: [String]) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { hasNextPage }
          media(search: $search, type: MANGA, sort: [POPULARITY_DESC], isAdult: $isAdult, genre_in: $genres) {
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

    const variables = {
      page: pageNum,
      perPage: 30,
      search: finalSearchQuery || undefined,
      isAdult: includeAdult,
      genres: selectedGenres.length > 0 ? selectedGenres : undefined
    };

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: gqlQuery, variables }),
      });
      const json = await response.json();
      if (!json.data) throw new Error("API Error");

      const pageInfo = json.data.Page.pageInfo;
      setHasNextPage(pageInfo.hasNextPage);

      const mapped: MangaTitle[] = json.data.Page.media.map((m: any) => ({
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
    const timeout = setTimeout(() => fetchManga(query, 1, true), 500);
    return () => clearTimeout(timeout);
  }, [query, includeAdult, selectedGenres]);

  useEffect(() => {
    if (page > 1) fetchManga(query, page, false);
  }, [page]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
        prev.includes(genre)
            ? prev.filter(g => g !== genre)
            : [...prev, genre]
    );
  };

  const labels = language === 'en' ? {
    placeholder: "Search manga, manhwa...",
    optimizing: "AI Resolving...",
    genres: "Genres",
    noResults: "No results found",
    clear: "Clear All"
  } : {
    placeholder: "Поиск манги, манхвы...",
    optimizing: "ИИ ищет...",
    genres: "Жанры",
    noResults: "Ничего не найдено",
    clear: "Сбросить"
  };

  return (
      <div className="space-y-8 max-w-7xl mx-auto pb-20">
        <div className="space-y-6">
          <div className="relative max-w-3xl mx-auto w-full group">
            <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full"></div>
            <div className="relative flex items-center">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500">
                {loading || optimizingQuery ? <Loader2 size={24} className="animate-spin text-indigo-500" /> : <Search size={24} />}
              </div>
              <input
                  type="text"
                  placeholder={optimizingQuery ? labels.optimizing : labels.placeholder}
                  className="w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] py-6 pl-16 pr-8 outline-none text-slate-100 shadow-2xl focus:border-indigo-500/50 transition-all text-lg"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 px-4">
            <div className="flex items-center gap-2 text-slate-500 mr-2 shrink-0">
              <Filter size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">{labels.genres}:</span>
            </div>
            {GENRES.map(genre => (
                <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        selectedGenres.includes(genre)
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20 scale-105'
                            : 'bg-slate-900/50 text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700'
                    }`}
                >
                  {genre}
                </button>
            ))}
            {selectedGenres.length > 0 && (
                <button
                    onClick={() => setSelectedGenres([])}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600/10 text-rose-400 rounded-xl hover:bg-rose-600/20 transition-all border border-rose-500/20 shrink-0"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">{labels.clear}</span>
                  <X size={14} />
                </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 px-4">
          {results.map((manga, index) => {
            const inLibrary = mangaList.find(m => m.id === manga.id);
            return (
                <div
                    key={`${manga.id}-${index}`}
                    ref={index === results.length - 1 ? lastElementRef : null}
                    className="group relative bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800/50 hover:border-indigo-500 transition-all aspect-[2/3] shadow-xl"
                >
                  <img
                      src={manga.coverImage}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 cursor-pointer"
                      onClick={() => onSelect(manga)}
                      alt={manga.title}
                  />

                  {/* Conditional Title Rendering for Search */}
                  {!hideLabels && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-100 group-hover:opacity-0 transition-opacity">
                        <h4 className="text-[9px] font-bold text-white uppercase truncate">{manga.title}</h4>
                      </div>
                  )}

                  <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none">
                    {manga.isAdult && (
                        <div className="bg-rose-600 text-white p-1 rounded-lg shadow-lg">
                          <Ghost size={12} />
                        </div>
                    )}
                    <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black text-amber-400 flex items-center gap-1">
                      <Star size={10} className="fill-amber-400" /> {manga.rating}
                    </div>
                  </div>

                  {/* Hover Block - Always contains title if not in Zen mode or as fallback */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <h4 className="text-[10px] font-black text-white uppercase truncate mb-3">{manga.title}</h4>
                    <div className="flex gap-1.5">
                      <button
                          onClick={() => onAdd({...manga, status: MangaStatus.READING})}
                          className={`flex-1 p-2.5 rounded-xl transition-all flex items-center justify-center ${inLibrary?.status === MangaStatus.READING ? 'bg-emerald-500 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-emerald-600 hover:text-white'}`}
                      >
                        <BookOpen size={14} />
                      </button>
                      <button
                          onClick={() => onAdd({...manga, status: MangaStatus.PLAN_TO_READ})}
                          className={`flex-1 p-2.5 rounded-xl transition-all flex items-center justify-center ${inLibrary?.status === MangaStatus.PLAN_TO_READ ? 'bg-amber-500 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-amber-600 hover:text-white'}`}
                      >
                        <Clock size={14} />
                      </button>
                      <button
                          onClick={() => onAdd({...manga, status: MangaStatus.COMPLETED})}
                          className={`flex-1 p-2.5 rounded-xl transition-all flex items-center justify-center ${inLibrary?.status === MangaStatus.COMPLETED ? 'bg-indigo-500 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-indigo-600 hover:text-white'}`}
                      >
                        <CheckCircle size={14} />
                      </button>
                    </div>
                  </div>
                </div>
            );
          })}
        </div>

        {results.length === 0 && !loading && (
            <div className="text-center py-20">
              <p className="text-slate-500 font-black uppercase tracking-widest text-sm">{labels.noResults}</p>
            </div>
        )}

        {loadingMore && (
            <div className="flex justify-center py-10">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
        )}
      </div>
  );
};

export default SearchTitle;
