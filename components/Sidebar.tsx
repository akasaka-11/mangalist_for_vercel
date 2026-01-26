
import React from 'react';
import { Layout, Search, Code, BookOpen, X, LayoutDashboard } from 'lucide-react';

interface SidebarProps {
  activeTab: 'dashboard' | 'search' | 'mentor';
  setActiveTab: (tab: 'dashboard' | 'search' | 'mentor') => void;
  language: string;
  t: any;
  isOpen: boolean;
  onToggle: () => void;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, t, isOpen, onToggle, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: t.library, icon: <BookOpen size={20} /> },
    { id: 'search', label: t.discover, icon: <Search size={20} /> },
    { id: 'mentor', label: t.mentor, icon: <Code size={20} /> },
  ];

  return (
    <aside className={`fixed lg:static h-full bg-slate-950 border-r border-slate-900/50 flex flex-col transition-all duration-500 ease-in-out shadow-2xl z-50 ${
      isOpen ? 'w-72 p-6 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0 p-0 overflow-hidden opacity-0 invisible'
    }`}>
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30">
            <Layout size={24} />
          </div>
          <div className="whitespace-nowrap overflow-hidden transition-all duration-300">
            <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent uppercase">MyMangaList</span>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-2 text-slate-500 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group whitespace-nowrap ${
              activeTab === item.id 
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-600/5' 
                : 'text-slate-500 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
            }`}
          >
            <div className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
              {item.icon}
            </div>
            <span className="font-bold text-sm tracking-wide uppercase">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-6 pt-6 border-t border-slate-900">
        <div className="p-5 bg-slate-900/30 rounded-3xl border border-white/5">
          <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-3">System Health</p>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-tighter">
                <span>V1.5 Stable</span>
                <span className="text-indigo-400">92%</span>
              </div>
              <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full w-[92%] rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 px-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live Services Active</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
