import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  ShieldCheck,
  Clock,
  Users,
  Radio,
  PhoneOff,
  Sparkles,
  Maximize,
  AlertTriangle,
} from 'lucide-react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../services/socket';
import { WebRTCManager, getResilientUserMedia } from '../services/webrtc';
import { useAuth } from '../context/AuthContext';
import { Participant, ChatMessage, SharedFile } from '../types';
import { VideoTile } from './VideoTile';
import { MeetingControls } from './MeetingControls';
import { ChatPanel } from './ChatPanel';
import { FilesPanel } from './FilesPanel';
import { ParticipantsPanel } from './ParticipantsPanel';
import { Whiteboard } from './Whiteboard';

interface MeetingRoomProps {
  roomId: string;
  onLeave: () => void;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ roomId, onLeave }) => {
  const { user } = useAuth();

  // Socket & WebRTC references
  const socketRef = useRef<Socket | null>(null);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);

  // Media Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVirtualCam, setIsVirtualCam] = useState(false);

  // Participants & Self status
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [pinnedSocketId, setPinnedSocketId] = useState<string | null>(null);

  // Active side panel
  const [activePanel, setActivePanel] = useState<'chat' | 'files' | 'participants' | 'whiteboard' | null>(null);

  // Chat & Files
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Room Metadata & Timer
  const [meetingTitle, setMeetingTitle] = useState<string>('Study Session');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copiedId, setCopiedId] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format timer HH:MM:SS or MM:SS
  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch initial meeting details, messages, and files from backend
  useEffect(() => {
    async function loadRoomData() {
      try {
        const [meetingRes, messagesRes, filesRes] = await Promise.all([
          fetch(`/api/meetings/${encodeURIComponent(roomId)}`),
          fetch(`/api/meetings/${encodeURIComponent(roomId)}/messages`),
          fetch(`/api/meetings/${encodeURIComponent(roomId)}/files`),
        ]);

        if (meetingRes.ok) {
          const mData = await meetingRes.json();
          if (mData.meeting?.title) setMeetingTitle(mData.meeting.title);
        }
        if (messagesRes.ok) {
          const msgData = await messagesRes.json();
          setMessages(msgData.messages || []);
        }
        if (filesRes.ok) {
          const fileData = await filesRes.json();
          setFiles(fileData.files || []);
        }
      } catch (err) {
        console.warn('Error fetching room info:', err);
      }
    }
    loadRoomData();
  }, [roomId]);

  // Main Socket & WebRTC setup
  useEffect(() => {
    let active = true;
    const socket = getSocket();
    socketRef.current = socket;

    // Create WebRTC manager
    const manager = new WebRTCManager(
      socket,
      (remoteSocketId, stream) => {
        if (!active) return;
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(remoteSocketId, stream);
          return next;
        });
      },
      (remoteSocketId) => {
        if (!active) return;
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(remoteSocketId);
          return next;
        });
      }
    );
    webrtcManagerRef.current = manager;

    // Acquire resilient local media
    async function setupMediaAndJoin() {
      try {
        const { stream, isVirtual } = await getResilientUserMedia(true, true);
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream);
        setIsVirtualCam(isVirtual);
        manager.setLocalStream(stream);

        // Join room via socket
        socket.emit('join-room', {
          roomId,
          user: {
            id: user?.id || `guest-${Date.now().toString(36)}`,
            name: user?.name || 'Student Attendee',
            avatar: user?.avatar,
            role: user?.role || 'Student',
          },
        });
      } catch (err) {
        console.error('Error in media acquisition:', err);
      }
    }

    setupMediaAndJoin();

    // Socket Event: existing participants
    socket.on('room-users', (existingUsers: Participant[]) => {
      if (!active) return;
      setParticipants(existingUsers);
      // Initiate WebRTC call to all existing room participants
      existingUsers.forEach((p) => {
        manager.callUser(p.socketId);
      });
    });

    // Socket Event: new user joined
    socket.on('user-joined', (newUser: Participant) => {
      if (!active) return;
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === newUser.socketId)) return prev;
        return [...prev, newUser];
      });

      // System notification
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          room_id: roomId,
          user_id: 'system',
          user_name: 'ConnectRoom Bot',
          content: `${newUser.name} has joined the room.`,
          timestamp: new Date().toISOString(),
          isSystem: true,
        },
      ]);
    });

    // Socket Event: user left
    socket.on('user-left', ({ socketId, name }: { socketId: string; name: string }) => {
      if (!active) return;
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });

      if (pinnedSocketId === socketId) {
        setPinnedSocketId(null);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          room_id: roomId,
          user_id: 'system',
          user_name: 'ConnectRoom Bot',
          content: `${name || 'A student'} left the session.`,
          timestamp: new Date().toISOString(),
          isSystem: true,
        },
      ]);
    });

    // Socket Event: user status change (mic, cam, screen, hand)
    socket.on('user-status-changed', ({ socketId, updates }: { socketId: string; updates: Partial<Participant> }) => {
      if (!active) return;
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, ...updates } : p))
      );
    });

    // Socket Event: new chat message
    socket.on('new-message', (newMsg: ChatMessage) => {
      if (!active) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      if (activePanel !== 'chat') {
        setUnreadCount((c) => c + 1);
      }
    });

    // Socket Event: file uploaded
    socket.on('file-uploaded', (newFile: SharedFile) => {
      if (!active) return;
      setFiles((prev) => {
        if (prev.some((f) => f.id === newFile.id)) return prev;
        return [newFile, ...prev];
      });
    });

    return () => {
      active = false;
      socket.emit('leave-room');
      socket.off('room-users');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('user-status-changed');
      socket.off('new-message');
      socket.off('file-uploaded');

      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      manager.cleanup();
    };
  }, [roomId, user]);

  // Controls Handlers
  const handleToggleMic = () => {
    const nextState = !isMicMuted;
    setIsMicMuted(nextState);
    webrtcManagerRef.current?.toggleAudio(!nextState);
    socketRef.current?.emit('status-change', { micMuted: nextState });
  };

  const handleToggleVideo = () => {
    const nextState = !isVideoMuted;
    setIsVideoMuted(nextState);
    webrtcManagerRef.current?.toggleVideo(!nextState);
    socketRef.current?.emit('status-change', { videoMuted: nextState });
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      webrtcManagerRef.current?.stopScreenShare();
      setIsScreenSharing(false);
      socketRef.current?.emit('status-change', { screenSharing: false });
    } else {
      const stream = await webrtcManagerRef.current?.startScreenShare(() => {
        setIsScreenSharing(false);
        socketRef.current?.emit('status-change', { screenSharing: false });
      });

      if (stream) {
        setIsScreenSharing(true);
        socketRef.current?.emit('status-change', { screenSharing: true });
      }
    }
  };

  const handleToggleHand = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    socketRef.current?.emit('status-change', { handRaised: nextState });
  };

  const handleSendMessage = (content: string) => {
    socketRef.current?.emit('send-message', {
      roomId,
      content,
    });
  };

  const handlePanelToggle = (panel: 'chat' | 'files' | 'participants' | 'whiteboard') => {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
      if (panel === 'chat') {
        setUnreadCount(0);
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/?room=${encodeURIComponent(roomId)}`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Build full participants list including self
  const currentSocketId = socketRef.current?.id || 'local';
  const localParticipant: Participant = {
    socketId: currentSocketId,
    userId: user?.id || 'local-user',
    name: user?.name || 'You',
    avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: user?.role || 'Student Host',
    micMuted: isMicMuted,
    videoMuted: isVideoMuted,
    screenSharing: isScreenSharing,
    handRaised: isHandRaised,
    joinedAt: new Date().toISOString(),
    stream: localStream || undefined,
    isLocal: true,
  };

  const allParticipants = [
    localParticipant,
    ...participants.map((p) => ({
      ...p,
      stream: remoteStreams.get(p.socketId) || undefined,
    })),
  ];

  // Screen share or pinned participant priority
  const screenSharer = allParticipants.find((p) => p.screenSharing);
  const spotlightParticipant = pinnedSocketId
    ? allParticipants.find((p) => p.socketId === pinnedSocketId)
    : screenSharer;

  return (
    <div
      id="meeting-room-container"
      className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] select-none"
    >
      {/* Top Header Bar */}
      <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-xs font-['Space_Grotesk']">
                {meetingTitle}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live
              </span>
            </div>

            {/* Room ID & copy */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span className="font-mono bg-slate-800/80 px-1.5 py-0.5 rounded text-indigo-300 border border-slate-700/60">
                {roomId}
              </span>
              <button
                id="topbar-copy-room-btn"
                onClick={handleCopyLink}
                className="hover:text-white transition-colors flex items-center gap-1 text-[10px]"
                title="Copy Room URL"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedId ? 'Link Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center: Timer */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 font-mono">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>{formatTimer(elapsedSeconds)}</span>
        </div>

        {/* Right side info */}
        <div className="flex items-center gap-3">
          {isVirtualCam && (
            <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800 text-[10px] text-indigo-300">
              <Sparkles className="w-3 h-3" />
              <span>Virtual Cam Active</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-bold">{allParticipants.length}</span>
            <span className="hidden sm:inline text-slate-400">here</span>
          </div>

          <button
            id="topbar-leave-btn"
            onClick={() => setShowLeaveModal(true)}
            className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-600/40 transition-all text-xs font-semibold flex items-center gap-1.5"
            title="Leave Meeting"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Main Layout Area: Video Stage + Optional Right Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Stage Area */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto flex flex-col justify-center items-center bg-slate-950">
          {spotlightParticipant ? (
            /* Spotlight Mode (Screen share or pinned user) */
            <div className="w-full h-full flex flex-col gap-3">
              <div className="flex-1 w-full min-h-0 rounded-2xl overflow-hidden shadow-2xl">
                <VideoTile
                  participant={spotlightParticipant}
                  isLocal={spotlightParticipant.isLocal}
                  isPinned={pinnedSocketId === spotlightParticipant.socketId}
                  onTogglePin={() =>
                    setPinnedSocketId(
                      pinnedSocketId === spotlightParticipant.socketId ? null : spotlightParticipant.socketId
                    )
                  }
                  stream={
                    spotlightParticipant.isLocal
                      ? localStream
                      : remoteStreams.get(spotlightParticipant.socketId)
                  }
                />
              </div>

              {/* Strip of other participants */}
              <div className="h-32 sm:h-36 flex items-center gap-3 overflow-x-auto py-1 px-1 shrink-0">
                {allParticipants
                  .filter((p) => p.socketId !== spotlightParticipant.socketId)
                  .map((p) => (
                    <div key={p.socketId} className="h-full w-48 shrink-0 rounded-xl overflow-hidden shadow">
                      <VideoTile
                        participant={p}
                        isLocal={p.isLocal}
                        isPinned={false}
                        onTogglePin={() => setPinnedSocketId(p.socketId)}
                        stream={p.isLocal ? localStream : remoteStreams.get(p.socketId)}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            /* Adaptive Grid Mode */
            <div
              className={`w-full h-full grid gap-3 sm:gap-4 max-w-7xl mx-auto ${
                allParticipants.length === 1
                  ? 'grid-cols-1 max-w-4xl'
                  : allParticipants.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : allParticipants.length <= 4
                  ? 'grid-cols-1 sm:grid-cols-2 auto-rows-fr'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr'
              }`}
            >
              {allParticipants.map((p) => (
                <div key={p.socketId} className="w-full h-full min-h-[200px] sm:min-h-[260px]">
                  <VideoTile
                    participant={p}
                    isLocal={p.isLocal}
                    isPinned={pinnedSocketId === p.socketId}
                    onTogglePin={() => setPinnedSocketId(p.socketId)}
                    stream={p.isLocal ? localStream : remoteStreams.get(p.socketId)}
                  />
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right Side Drawer: Chat, Files, or Participants */}
        {activePanel === 'chat' && (
          <ChatPanel
            messages={messages}
            currentUserId={user?.id || 'local-user'}
            onSendMessage={handleSendMessage}
            onClose={() => setActivePanel(null)}
          />
        )}

        {activePanel === 'files' && (
          <FilesPanel
            roomId={roomId}
            files={files}
            userId={user?.id || 'local-user'}
            userName={user?.name || 'Student'}
            onFileUploaded={(newFile) => {
              setFiles((prev) => [newFile, ...prev]);
            }}
            onClose={() => setActivePanel(null)}
          />
        )}

        {activePanel === 'participants' && (
          <ParticipantsPanel
            roomId={roomId}
            participants={allParticipants}
            currentSocketId={currentSocketId}
            onClose={() => setActivePanel(null)}
          />
        )}
      </div>

      {/* Collaborative Whiteboard Canvas Modal */}
      {activePanel === 'whiteboard' && (
        <Whiteboard
          roomId={roomId}
          socket={socketRef.current}
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* Bottom Meeting Control Dock */}
      <MeetingControls
        isMicMuted={isMicMuted}
        isVideoMuted={isVideoMuted}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        activePanel={activePanel}
        unreadCount={unreadCount}
        filesCount={files.length}
        participantsCount={allParticipants.length}
        onToggleMic={handleToggleMic}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleWhiteboard={() => handlePanelToggle('whiteboard')}
        onTogglePanel={handlePanelToggle}
        onToggleHand={handleToggleHand}
        onLeaveMeeting={() => setShowLeaveModal(true)}
      />

      {/* Leave Meeting Confirmation Dialog */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            id="leave-confirm-dialog"
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-950 text-rose-400 border border-rose-800/80 flex items-center justify-center mx-auto mb-4">
              <PhoneOff className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1 font-['Space_Grotesk']">
              Leave this Meeting?
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              You will disconnect from the WebRTC session and stop broadcasting media. You can rejoin at any time.
            </p>
            <div className="flex items-center gap-3">
              <button
                id="cancel-leave-btn"
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Stay in Call
              </button>
              <button
                id="confirm-leave-btn"
                onClick={() => {
                  setShowLeaveModal(false);
                  onLeave();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
