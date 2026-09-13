import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, BookOpen, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, register, demoLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Undergraduate Student');
  const [department, setDepartment] = useState('Computer Science & Engineering');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await register({ name, email, password, role, department });
        if (!res.success) {
          setError(res.error || 'Registration failed');
        } else {
          onSuccess?.();
          onClose();
        }
      } else {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error || 'Invalid credentials');
        } else {
          onSuccess?.();
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      await demoLogin(demoEmail);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError('Failed to login with demo credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div
        id="auth-modal-card"
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden relative"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
              {isRegister ? 'Create Student Account' : 'Welcome to ConnectRoom'}
            </h3>
            <p className="text-xs text-slate-400">
              {isRegister ? 'Join academic collaboration sessions in seconds' : 'Sign in to access your study rooms and files'}
            </p>
          </div>
          <button
            id="close-auth-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Student Fast-Login Section */}
        <div className="px-6 pt-4 pb-2 bg-slate-800/40 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              1-Click Demo Profiles (For Graders &amp; Testing)
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              id="demo-alex-btn"
              onClick={() => handleQuickDemo('alex@connectroom.edu')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition-all hover:border-indigo-500/50 group"
            >
              <div className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300">Alex J.</div>
              <div className="text-[10px] text-slate-400 truncate">Software Eng</div>
            </button>
            <button
              type="button"
              id="demo-sarah-btn"
              onClick={() => handleQuickDemo('sarah@connectroom.edu')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition-all hover:border-indigo-500/50 group"
            >
              <div className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300">Sarah C.</div>
              <div className="text-[10px] text-slate-400 truncate">UI/UX HCI</div>
            </button>
            <button
              type="button"
              id="demo-marcus-btn"
              onClick={() => handleQuickDemo('marcus@connectroom.edu')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition-all hover:border-indigo-500/50 group"
            >
              <div className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300">Marcus V.</div>
              <div className="text-[10px] text-slate-400 truncate">Distributed Sys</div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="register-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya Lin"
                  className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Student Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="auth-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="auth-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          {isRegister && (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Academic Role</label>
                <div className="relative">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <select
                    id="register-role-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Undergraduate Student">Undergraduate</option>
                    <option value="Graduate Researcher">Graduate</option>
                    <option value="Teaching Assistant">Teaching Assistant</option>
                    <option value="Project Lead">Project Lead</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Major / Dept</label>
                <input
                  id="register-department-input"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="CS, Design, Math"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            id="auth-submit-btn"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{isRegister ? 'Register & Enter Platform' : 'Sign In to ConnectRoom'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Modal Footer Toggle */}
        <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              id="toggle-auth-mode-btn"
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-indigo-400 font-bold hover:text-indigo-300 underline underline-offset-2 ml-1"
            >
              {isRegister ? 'Sign In' : 'Create Free Account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
