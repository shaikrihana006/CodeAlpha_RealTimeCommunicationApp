import React, { useState } from 'react';
import { Video, ShieldCheck, LogOut, User as UserIcon, Sparkles, LogIn, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenAuth: () => void;
  onNavigate: (view: 'landing' | 'dashboard' | 'meeting') => void;
  currentView: string;
  onOpenProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onNavigate, currentView, onOpenProfile }) => {
  const { user, logout, demoLogin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          id="navbar-brand"
          onClick={() => onNavigate(user ? 'dashboard' : 'landing')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white font-['Space_Grotesk']">
                Connect<span className="text-indigo-400">Room</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                P2P Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Real-Time Collaboration Platform
            </p>
          </div>
        </div>

        {/* Center Navigation Links (if authenticated) */}
        {user && currentView !== 'meeting' && (
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
            <button
              id="nav-dashboard-btn"
              onClick={() => onNavigate('dashboard')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentView === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
              }`}
            >
              Dashboard
            </button>
            <button
              id="nav-landing-btn"
              onClick={() => onNavigate('landing')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentView === 'landing'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
              }`}
            >
              Explore Features
            </button>
          </nav>
        )}

        {/* Right Section: Auth / User Profile */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-medium">WebRTC Ready</span>
          </div>

          {user ? (
            <div className="relative">
              <button
                id="user-profile-menu-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-lg object-cover ring-2 ring-indigo-500/30"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
                    {user.name}
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[110px]">
                    {user.department || user.role}
                  </div>
                </div>
              </button>

              {dropdownOpen && (
                <div
                  id="user-dropdown-card"
                  className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2"
                >
                  <div className="px-4 py-2.5 border-b border-slate-700/60">
                    <p className="text-xs font-semibold text-white">{user.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                      {user.role}
                    </span>
                  </div>

                  <button
                    id="dropdown-edit-profile-btn"
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenProfile?.();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                    Edit Profile
                  </button>

                  <button
                    id="dropdown-logout-btn"
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                      onNavigate('landing');
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 flex items-center gap-2 border-t border-slate-700/60 mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="quick-demo-login-btn"
                onClick={() => demoLogin('alex@connectroom.edu')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
                title="Log in immediately as demo student Alex Johnson"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Demo
              </button>

              <button
                id="open-login-btn"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all hover:shadow-indigo-600/50"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
