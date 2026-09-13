import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { MeetingRoom } from './components/MeetingRoom';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'meeting'>('landing');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Check URL query parameters for ?room=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setActiveRoomId(roomParam.trim());
      setCurrentView('meeting');
    }
  }, []);

  // When user signs in and is on landing page, move to dashboard
  useEffect(() => {
    if (user && currentView === 'landing') {
      setCurrentView('dashboard');
    }
  }, [user, currentView]);

  const handleJoinMeeting = (roomId: string, passcode?: string) => {
    setActiveRoomId(roomId);
    setCurrentView('meeting');
    // Update browser URL without reload for easy sharing
    const newUrl = `${window.location.pathname}?room=${encodeURIComponent(roomId)}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleLeaveMeeting = () => {
    setActiveRoomId(null);
    setCurrentView(user ? 'dashboard' : 'landing');
    // Clear room from URL
    window.history.pushState({}, '', window.location.pathname);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-xl shadow-indigo-600/30 animate-pulse mb-4">
          CR
        </div>
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-300">
          Loading ConnectRoom Environment...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Hide standard navbar in active meeting room for maximum immersion */}
      {currentView !== 'meeting' && (
        <Navbar
          onOpenAuth={() => setAuthModalOpen(true)}
          onNavigate={(view) => setCurrentView(view)}
          currentView={currentView}
          onOpenProfile={() => setProfileModalOpen(true)}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {currentView === 'meeting' && activeRoomId ? (
          <MeetingRoom roomId={activeRoomId} onLeave={handleLeaveMeeting} />
        ) : currentView === 'dashboard' && user ? (
          <Dashboard
            onJoinMeeting={handleJoinMeeting}
            onOpenProfile={() => setProfileModalOpen(true)}
          />
        ) : (
          <LandingPage
            onJoinMeeting={handleJoinMeeting}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setCurrentView('dashboard')}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
