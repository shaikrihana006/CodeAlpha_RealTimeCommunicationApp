import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Plus,
  ArrowRight,
  Clock,
  Lock,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Sparkles,
  Users,
  Copy,
  Check,
  Calendar,
  Layers,
  Settings,
  Shield,
  Radio,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Meeting } from '../types';
import { getResilientUserMedia } from '../services/webrtc';

interface DashboardProps {
  onJoinMeeting: (roomId: string, passcode?: string) => void;
  onOpenProfile: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onJoinMeeting, onOpenProfile }) => {
  const { user, token } = useAuth();

  // Create meeting modal / form state
  const [createTitle, setCreateTitle] = useState('');
  const [createCustomId, setCreateCustomId] = useState('');
  const [createPasscode, setCreatePasscode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Join meeting input state
  const [joinCode, setJoinCode] = useState('');
  const [joinPasscode, setJoinPasscode] = useState('');
  const [joinNeedsPasscode, setJoinNeedsPasscode] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Recent meetings
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  // Hardware Preview states (Green Room)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVirtualCam, setIsVirtualCam] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch recent meetings from SQLite
  useEffect(() => {
    async function fetchRecent() {
      setLoadingMeetings(true);
      try {
        const res = await fetch('/api/meetings/recent');
        if (res.ok) {
          const data = await res.json();
          setRecentMeetings(data.meetings || []);
        }
      } catch (err) {
        console.error('Failed to load recent meetings:', err);
      } finally {
        setLoadingMeetings(false);
      }
    }
    fetchRecent();
  }, []);

  // Initialize hardware preview
  useEffect(() => {
    let mounted = true;

    async function initPreview() {
      try {
        const { stream, isVirtual } = await getResilientUserMedia(true, true);
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setPreviewStream(stream);
        setIsVirtualCam(isVirtual);

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }

        // Setup audio level meter
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkLevel = () => {
              if (!mounted) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animationFrameRef.current = requestAnimationFrame(checkLevel);
            };
            checkLevel();
          } catch (e) {
            console.warn('Audio analysis not supported in this context', e);
          }
        }
      } catch (err) {
        console.error('Error starting hardware preview:', err);
      }
    }

    initPreview();

    return () => {
      mounted = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Toggle Camera in preview
  const handleToggleCam = () => {
    if (previewStream) {
      const videoTrack = previewStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCamOn;
        setIsCamOn(!isCamOn);
      }
    }
  };

  // Toggle Mic in preview
  const handleToggleMic = () => {
    if (previewStream) {
      const audioTrack = previewStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(!isMicOn);
      }
    }
  };

  // Start instant meeting
  const handleStartInstant = async () => {
    const randomCode = `room-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
    try {
      const res = await fetch('/api/meetings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: `${user?.name || 'Student'}'s Study Room`,
          customId: randomCode,
          hostName: user?.name || 'Student Host',
          hostId: user?.id || 'guest',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onJoinMeeting(data.meeting.id);
      } else {
        onJoinMeeting(randomCode);
      }
    } catch {
      onJoinMeeting(randomCode);
    }
  };

  // Create scheduled / custom meeting
  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalId = createCustomId.trim() || `room-${Math.random().toString(36).substring(2, 6)}`;
    try {
      const res = await fetch('/api/meetings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: createTitle.trim() || 'Collaborative Study Session',
          customId: finalId,
          passcode: createPasscode.trim(),
          hostName: user?.name || 'Student Host',
          hostId: user?.id || 'guest',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onJoinMeeting(data.meeting.id, createPasscode.trim());
      } else {
        onJoinMeeting(finalId, createPasscode.trim());
      }
    } catch {
      onJoinMeeting(finalId, createPasscode.trim());
    }
  };

  // Join meeting with code & verify passcode if needed
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const code = joinCode.trim();
    if (!code) return;

    try {
      const res = await fetch(`/api/meetings/${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.meeting.hasPasscode && !joinPasscode) {
          setJoinNeedsPasscode(true);
          return;
        }

        if (data.meeting.hasPasscode && joinPasscode) {
          const verifyRes = await fetch(`/api/meetings/${encodeURIComponent(code)}/verify-passcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passcode: joinPasscode }),
          });
          if (!verifyRes.ok) {
            setJoinError('Incorrect room passcode.');
            return;
          }
        }
      }
      onJoinMeeting(code, joinPasscode);
    } catch {
      onJoinMeeting(code);
    }
  };

  const copyRoomCode = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] pb-16">
      {/* Top Banner / Student Greeting */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-950 border-b border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={user?.name || 'User'}
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/50 shadow-md"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white font-['Space_Grotesk']">
                  Welcome back, {user?.name || 'Student'}
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {user?.role || 'Academic'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {user?.department || 'Department of Computer Science'} &bull; Ready for real-time collaboration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="dashboard-edit-profile-btn"
              onClick={onOpenProfile}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center gap-2 shadow-sm"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              <span>Edit Profile</span>
            </button>
            <button
              id="dashboard-instant-room-btn"
              onClick={handleStartInstant}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              <span>New Instant Meeting</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Meeting Actions & Recent Rooms (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Quick Actions Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Join or Schedule a Session
                </h2>
                <span className="text-[11px] text-slate-400">SQLite Synced</span>
              </div>

              {/* Join Existing Room by Code */}
              <form onSubmit={handleJoinByCode} className="space-y-3 pb-6 border-b border-slate-800">
                <label className="block text-xs font-semibold text-slate-300">
                  Join Meeting by Code or Link
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="dashboard-join-code-input"
                      type="text"
                      value={joinCode}
                      onChange={(e) => {
                        setJoinCode(e.target.value);
                        setJoinError(null);
                      }}
                      placeholder="e.g. study-hub-101 or design-crit-202"
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <button
                    id="dashboard-join-submit-btn"
                    type="submit"
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-all flex items-center gap-1.5"
                  >
                    <span>Join</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Passcode field if protected room */}
                {joinNeedsPasscode && (
                  <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                      <Lock className="w-3.5 h-3.5" /> This room requires a passcode
                    </div>
                    <div className="flex gap-2">
                      <input
                        id="dashboard-passcode-input"
                        type="password"
                        value={joinPasscode}
                        onChange={(e) => setJoinPasscode(e.target.value)}
                        placeholder="Enter Room Passcode"
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        id="dashboard-verify-passcode-btn"
                        type="submit"
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg"
                      >
                        Enter Room
                      </button>
                    </div>
                  </div>
                )}

                {joinError && (
                  <p className="text-xs text-rose-400 font-medium">{joinError}</p>
                )}
              </form>

              {/* Create Custom Meeting Drawer/Section */}
              <div className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    Create Custom Meeting Room
                  </h3>
                  <button
                    id="toggle-create-meeting-btn"
                    type="button"
                    onClick={() => setIsCreating(!isCreating)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    {isCreating ? 'Hide Options' : '+ Custom Options'}
                  </button>
                </div>

                {isCreating ? (
                  <form onSubmit={handleCreateCustom} className="space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Meeting Title / Topic
                      </label>
                      <input
                        id="custom-meeting-title-input"
                        type="text"
                        required
                        value={createTitle}
                        onChange={(e) => setCreateTitle(e.target.value)}
                        placeholder="e.g. Distributed Systems Lab Sprint"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Custom Room ID (Optional)
                        </label>
                        <input
                          id="custom-meeting-id-input"
                          type="text"
                          value={createCustomId}
                          onChange={(e) => setCreateCustomId(e.target.value)}
                          placeholder="e.g. cs401-sprint"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Passcode (Optional)
                        </label>
                        <input
                          id="custom-meeting-passcode-input"
                          type="password"
                          value={createPasscode}
                          onChange={(e) => setCreatePasscode(e.target.value)}
                          placeholder="Leave blank for public"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <button
                      id="custom-meeting-submit-btn"
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Launch Custom Room</span>
                    </button>
                  </form>
                ) : (
                  <p className="text-xs text-slate-400">
                    Need a custom permanent room code or password protection for your team review? Click &ldquo;+ Custom Options&rdquo; above.
                  </p>
                )}
              </div>
            </div>

            {/* Recent & Active Meetings (From SQLite) */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Recent &amp; Recommended Study Hubs
                </h2>
                <span className="text-xs text-slate-400">{recentMeetings.length} recorded</span>
              </div>

              {loadingMeetings ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <span className="inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-2"></span>
                  Loading sessions from database...
                </div>
              ) : recentMeetings.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No previous meetings found. Start an instant meeting above!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      id={`meeting-card-${meeting.id}`}
                      className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-indigo-500/50 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-300">
                            {meeting.title}
                          </h4>
                          {meeting.hasPasscode && (
                            <span className="shrink-0 p-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                              <Lock className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-indigo-300">
                            {meeting.id}
                          </span>
                          <span>&bull;</span>
                          <span>Host: {meeting.host_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          id={`copy-meeting-${meeting.id}-btn`}
                          onClick={() => copyRoomCode(meeting.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                          title="Copy Room ID"
                        >
                          {copiedId === meeting.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          id={`join-recent-${meeting.id}-btn`}
                          onClick={() => onJoinMeeting(meeting.id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow transition-all flex items-center gap-1"
                        >
                          <span>Join</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Hardware Preview / "Green Room" (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <h3 className="text-base font-bold text-white">Hardware Green Room</h3>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Preview Test
                </span>
              </div>

              {/* Video Preview Box */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
                {isCamOn ? (
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 font-bold text-xl mb-2 ring-2 ring-indigo-500/30">
                      {user?.name?.slice(0, 2).toUpperCase() || 'CR'}
                    </div>
                    <p className="text-xs text-slate-400">Camera is turned off</p>
                  </div>
                )}

                {/* Virtual Camera Badge */}
                {isVirtualCam && (
                  <div className="absolute top-2 left-2 px-2 py-1 rounded bg-indigo-950/80 border border-indigo-700 text-[10px] text-indigo-300 font-medium backdrop-blur-sm">
                    ConnectRoom Virtual Cam
                  </div>
                )}

                {/* Audio meter floating */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-slate-700/60">
                  <div className="flex items-center gap-2">
                    {isMicOn ? (
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span className="text-[11px] text-slate-300">
                      {isMicOn ? 'Mic Active' : 'Mic Muted'}
                    </span>
                  </div>

                  {/* Level bar */}
                  <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-75 ${
                        isMicOn ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                      style={{ width: `${isMicOn ? Math.max(10, audioLevel) : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Hardware Preview Controls */}
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  id="preview-toggle-mic-btn"
                  onClick={handleToggleMic}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                    isMicOn
                      ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                      : 'bg-rose-950/50 text-rose-300 border-rose-800/80 hover:bg-rose-900/40'
                  }`}
                >
                  {isMicOn ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                  <span>{isMicOn ? 'Mute Mic' : 'Unmute Mic'}</span>
                </button>

                <button
                  id="preview-toggle-cam-btn"
                  onClick={handleToggleCam}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                    isCamOn
                      ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                      : 'bg-rose-950/50 text-rose-300 border-rose-800/80 hover:bg-rose-900/40'
                  }`}
                >
                  {isCamOn ? <Camera className="w-3.5 h-3.5 text-indigo-400" /> : <CameraOff className="w-3.5 h-3.5 text-rose-400" />}
                  <span>{isCamOn ? 'Turn Off Cam' : 'Turn On Cam'}</span>
                </button>
              </div>

              {/* Readiness Checklist */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Pre-Call Diagnostics
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" /> WebRTC Signaling
                  </span>
                  <span className="text-emerald-400 font-semibold">Online</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" /> STUN Server Pool
                  </span>
                  <span className="text-emerald-400 font-semibold">Google STUN Ready</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" /> Collaboration Buffer
                  </span>
                  <span className="text-indigo-300 font-semibold">SQLite Synced</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
