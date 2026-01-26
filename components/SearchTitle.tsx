import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, TrendingUp, Star, BookOpen, Clock, CheckCircle, XCircle, Sparkles, Filter } from 'lucide-react';
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
  const [selectedGenre, setSelectedGenre] = useState<string>('');
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
        contents: `Manga search: "${input}". Return ONLY the official English or Romaji title.`,
      });
      // Исправлено: добавлена проверка на undefined
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

    const finalSearchQuery = isNewSearch && search ? await getOptimizedQuery(search) : search;

    const gqlQuery = `
      query ($search: String, $page: Int, $perPage: Int, $isAdult: Boolean, $genre: String) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { hasNextPage }
          media(search: $search, type: MANGA, sort: [SEARCH_MATCH], isAdult: $isAdult, genre: $genre) {
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
      genre: selectedGenre || undefined
    };

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: gqlQuery, variables }),
      });
      const json = await response.json();
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
    setResults([]);
    const timeout = setTimeout(() => fetchManga(query, 1, true), 500);
    return () => clearTimeout(timeout);
  }, [query, includeAdult, selectedGenre]);

  useEffect(() => {
    if (page > 1) fetchManga(query, page, false);
  }, [page]);

  const labels = language === 'en' ? {
    placeholder: "Search...", trending: "Trending", results: "Results",
    optimizing: "AI Resolving...", loadingMore: "Loading..."
  } : {
    placeholder: "Поиск...", trending: "В тренде", results: "Результаты",
    optimizing: "ИИ ищет...", loadingMore: "Загрузка..."
  };

  return (
      <div className="space-y-8 max-w-7xl mx-auto pb-20">
        <div className="relative max-w-3xl mx-auto w-full group">
          <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-full"></div>
          <div className="relative flex items-center">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500">
              {loading ? <Loader2 size={24} className="animate-spin" /> : <Search size={24} />}
            </div>
            <input
                type="text"
                placeholder={labels.placeholder}
                className="w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] py-5 pl-16 pr-8 outline-none text-slate-100 shadow-2xl"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {results.map((manga, index) => (
              <div
                  key={`${manga.id}-${index}`}
                  ref={index === results.length - 1 ? lastElementRef : null}
                  className="group relative bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800/50 hover:border-indigo-500 transition-all aspect-[2/3]"
              >
                <img
                    src={manga.coverImage}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 cursor-pointer"
                    onClick={() => onSelect(manga)}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 p-4">
                  <h4 className="text-[10px] font-black text-white uppercase truncate mb-2">{manga.title}</h4>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onAdd({...manga, status: MangaStatus.READING})} className="flex-1 bg-emerald-600 p-2 rounded-lg"><BookOpen size={12} /></button>
                    <button onClick={() => onAdd({...manga, status: MangaStatus.PLAN_TO_READ})} className="flex-1 bg-amber-600 p-2 rounded-lg"><Clock size={12} /></button>
                    <button onClick={() => onAdd({...manga, status: MangaStatus.COMPLETED})} className="flex-1 bg-indigo-600 p-2 rounded-lg"><CheckCircle size={12} /></button>
                  </div>
                </div>
              </div>
          ))}
        </div>
      </div>
  );
};

export default SearchTitle;