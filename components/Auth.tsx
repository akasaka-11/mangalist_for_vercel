
import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, ArrowRight } from 'lucide-react';

interface AuthProps {
  onClose: () => void;
  onLogin: (user: any) => void;
  language: 'en' | 'ru';
}

const Auth: React.FC<AuthProps> = ({ onClose, onLogin, language }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const labels = language === 'en' ? {
    title: isLogin ? 'Sign In' : 'Join the Club',
    sub: isLogin ? 'Welcome back to your collection' : 'Start your manga journey today',
    user: 'Username',
    mail: 'Email Address',
    pass: 'Secure Password',
    btn: isLogin ? 'Authorize' : 'Create Account',
    switch: isLogin ? "Don't have an account?" : "Already a member?",
    switchBtn: isLogin ? 'Register' : 'Login'
  } : {
    title: isLogin ? 'Вход' : 'Регистрация',
    sub: isLogin ? 'С возвращением в библиотеку' : 'Начни свой путь мангаки сегодня',
    user: 'Имя пользователя',
    mail: 'Email адрес',
    pass: 'Надежный пароль',
    btn: isLogin ? 'Авторизоваться' : 'Создать аккаунт',
    switch: isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?",
    switchBtn: isLogin ? 'Регистрация' : 'Вход'
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mockUser = {
      id: 'usr-' + Math.random().toString(36).substr(2, 9),
      username: formData.username || 'Senpai',
      email: formData.email,
      token: 'jwt-mock-token-' + Date.now()
    };
    onLogin(mockUser);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-[0_0_100px_rgba(99,102,241,0.2)] animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="text-center mb-8 space-y-2">
          <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto mb-4 border border-indigo-500/20">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">{labels.title}</h2>
          <p className="text-slate-500 text-sm font-medium">{labels.sub}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{labels.mail}</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" required
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 outline-none focus:ring-2 focus:ring-indigo-500/50 text-white transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{labels.user}</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" required
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 outline-none focus:ring-2 focus:ring-indigo-500/50 text-white transition-all"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{labels.pass}</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="password" required
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 outline-none focus:ring-2 focus:ring-indigo-500/50 text-white transition-all"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 mt-4 active:scale-95 group">
            {labels.btn} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-slate-800">
           <p className="text-xs text-slate-500 font-bold">
             {labels.switch} 
             <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest text-[10px] font-black">
               {labels.switchBtn}
             </button>
           </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
