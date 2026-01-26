
import React from 'react';
import { X, Star, BookOpen, Clock, Calendar, CheckCircle } from 'lucide-react';
import { MangaTitle } from '../types';

interface MangaModalProps {
  manga: MangaTitle;
  onClose: () => void;
  language: 'en' | 'ru';
}

const MangaModal: React.FC<MangaModalProps> = ({ manga, onClose, language }) => {
  const labels = language === 'en' ? {
    chapters: 'Chapters released',
    status: 'Publication Status',
    updated: 'Last Updated',
    summary: 'Story Summary',
    rating: 'Community Rating'
  } : {
    chapters: 'Глав выпущено',
    status: 'Статус публикации',
    updated: 'Обновлено',
    summary: 'Описание сюжета',
    rating: 'Рейтинг сообщества'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl bg-slate-900 rounded-[3rem] border border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col md:flex-row max-h-[90vh]">
        {/* Cover Section */}
        <div className="w-full md:w-1/3 aspect-[2/3] md:aspect-auto relative group overflow-hidden">
          <img src={manga.coverImage} className="w-full h-full object-cover" alt={manga.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
          
          <button 
            onClick={onClose}
            className="absolute top-6 left-6 p-3 bg-slate-950/50 backdrop-blur-xl border border-white/10 text-white rounded-2xl hover:bg-slate-950 transition-all md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Section */}
        <div className="flex-1 p-8 md:p-12 overflow-y-auto space-y-8 custom-scrollbar">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-4xl font-black text-white leading-tight uppercase tracking-tight">
                {manga.title}
              </h2>
              <div className="flex flex-wrap gap-3">
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-400/10 border border-amber-400/20 rounded-xl text-[11px] font-black text-amber-400 uppercase tracking-widest">
                   <Star size={14} className="fill-amber-400" /> {manga.rating} / 10
                 </div>
                 {manga.isAdult && (
                   <div className="px-3 py-1.5 bg-rose-600/20 border border-rose-500/30 rounded-xl text-[11px] font-black text-rose-400 uppercase tracking-widest">
                     NSFW 18+
                   </div>
                 )}
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="hidden md:flex p-3 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl border border-slate-700 transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-5 bg-slate-950/40 rounded-[2rem] border border-white/5 space-y-1">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{labels.chapters}</p>
               <p className="text-xl font-bold text-indigo-400">{manga.totalChapters || 'Ongoing'}</p>
             </div>
             <div className="p-5 bg-slate-950/40 rounded-[2rem] border border-white/5 space-y-1">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{labels.updated}</p>
               <p className="text-xl font-bold text-slate-200">{manga.lastUpdated}</p>
             </div>
          </div>

          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
              <BookOpen size={16} className="text-indigo-500" /> {labels.summary}
            </h4>
            <div className="text-sm md:text-base text-slate-400 leading-relaxed font-medium bg-slate-950/30 p-6 rounded-[2.5rem] border border-white/5">
              {manga.description || 'No description available.'}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/50 flex flex-wrap gap-6">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                 <CheckCircle size={20} />
               </div>
               <div>
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Verified Content</p>
                 <p className="text-[11px] font-bold text-slate-300">AniList Source</p>
               </div>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20">
                 <Calendar size={20} />
               </div>
               <div>
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Metadata</p>
                 <p className="text-[11px] font-bold text-slate-300">Release Tracked</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MangaModal;
