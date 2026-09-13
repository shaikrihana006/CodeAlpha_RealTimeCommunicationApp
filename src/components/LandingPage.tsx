import React, { useState } from 'react';
import {
  Video,
  MonitorPlay,
  FileUp,
  MessageSquare,
  ShieldCheck,
  Zap,
  ArrowRight,
  Edit3,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LandingPageProps {
  onJoinMeeting: (roomId: string) => void;
  onOpenAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onJoinMeeting, onOpenAuth }) => {
  const { user, demoLogin } = useAuth();
  const [quickRoomCode, setQuickRoomCode] = useState('');

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickRoomCode.trim()) {
      onJoinMeeting(quickRoomCode.trim());
    } else {
      // Create random room
      const randomCode = `study-${Math.random().toString(36).substring(2, 6)}`;
      onJoinMeeting(randomCode);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-800/80">
        {/* Background ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-cyan-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Tech Stack Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/70 text-slate-300 text-xs font-semibold mb-6 shadow-sm">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>WebRTC &bull; Socket.io &bull; Node.js &bull; SQLite Persistence</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight font-['Space_Grotesk']">
              Seamless Video Chat &amp; Instant Collaboration for Students
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed">
              ConnectRoom delivers peer-to-peer encrypted video calling, low-latency screen sharing,
              interactive whiteboards, and instant file exchange engineered for student study groups, lab reviews, and team projects.
            </p>

            {/* Quick Action Input */}
            <div className="mt-8 max-w-md mx-auto">
              <form onSubmit={handleQuickJoin} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    id="hero-meeting-code-input"
                    type="text"
                    value={quickRoomCode}
                    onChange={(e) => setQuickRoomCode(e.target.value)}
                    placeholder="Enter Room Code (e.g. cs101-lab)"
                    className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors shadow-inner"
                  />
                </div>
                <button
                  id="hero-start-meeting-btn"
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Video className="w-4 h-4" />
                  <span>{quickRoomCode.trim() ? 'Join Room' : 'Start Instant Room'}</span>
                </button>
              </form>

              <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> No downloads required
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> WebRTC P2P Mesh
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Real-time sync
                </span>
              </div>
            </div>

            {/* Quick Demo Test Persona Switcher */}
            {!user && (
              <div className="mt-10 pt-8 border-t border-slate-800/80 max-w-xl mx-auto">
                <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3">
                  Instant Test Reviewer Logins (No Registration Required):
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    id="hero-demo-alex-btn"
                    onClick={() => demoLogin('alex@connectroom.edu')}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all hover:border-indigo-400 flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Alex J. (Software Eng Lead)
                  </button>
                  <button
                    id="hero-demo-sarah-btn"
                    onClick={() => demoLogin('sarah@connectroom.edu')}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all hover:border-indigo-400 flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    Sarah C. (UI/UX Researcher)
                  </button>
                  <button
                    id="hero-demo-marcus-btn"
                    onClick={() => demoLogin('marcus@connectroom.edu')}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all hover:border-indigo-400 flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    Marcus V. (Graduate Systems)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Matrix */}
      <section className="py-16 bg-slate-900/40 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
              Complete Collaboration Engine
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Built with modern full-stack standards: WebRTC media streams, Socket.io signaling, and durable SQLite record storage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div id="feature-card-webrtc" className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Multi-Peer WebRTC Video</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Peer-to-peer encrypted mesh video calling with adaptive layouts, microphone muting, camera toggle, and fallback stream resilience.
              </p>
            </div>

            {/* Feature 2 */}
            <div id="feature-card-screenshare" className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
                <MonitorPlay className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Seamless Screen Sharing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Broadcast presentation slides, code editors, or browser tabs with one click using browser-native display media capture.
              </p>
            </div>

            {/* Feature 3 */}
            <div id="feature-card-whiteboard" className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                <Edit3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Live Collaborative Whiteboard</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Brainstorm architecture diagrams, math equations, and sketches in real time with synchronized strokes, eraser, and PNG export.
              </p>
            </div>

            {/* Feature 4 */}
            <div id="feature-card-chat" className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Instant Room Chat &amp; Hand Raise</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Low-latency messaging powered by Socket.io, persistent room chat logs, join/leave notifications, and non-intrusive hand raising.
              </p>
            </div>

            {/* Feature 5 */}
            <div id="feature-card-files" className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
                <FileUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">In-Meeting File Exchange</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Share assignment PDFs, datasets, lecture notes, and ZIP archives directly inside meeting rooms with verified safe downloads.
              </p>
            </div>

            {/* Feature 6 */}
            <div id="feature-card-security" className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">SQLite &amp; Secure Sessions</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bcrypt password hashing, JWT authentication, room passcode protection, file sanitization, and structured SQLite backend storage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* College Project / Portfolio Callout */}
      <section className="py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/70 border border-indigo-800/40 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Zap className="w-4 h-4" />
                Designed for College Projects &amp; Internship Portfolios
              </div>
              <h3 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                Ready to collaborate in real-time?
              </h3>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Open two browser tabs or share your room code with a colleague to test WebRTC video, chat, file sharing, and the synchronized whiteboard live!
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                id="cta-open-auth-btn"
                onClick={onOpenAuth}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-900 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-200">ConnectRoom</span>
            <span>&bull;</span>
            <span>Real-Time Communication &amp; Collaboration Platform</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>WebRTC P2P Mesh</span>
            <span>&bull;</span>
            <span>Socket.io v4</span>
            <span>&bull;</span>
            <span>SQLite Database</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
